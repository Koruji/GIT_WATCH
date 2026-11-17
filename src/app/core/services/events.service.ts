import { Injectable, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  Analysis,
  AnalysisStatus,
  CATEGORIES,
  Category,
  EMPTY_FILTERS,
  EventFilters,
  EventType,
  GitEvent,
  Repository,
  Urgency,
  WebhookStatus,
} from '../models/git-event.model';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';
import { SupabaseService } from './supabase.service';

const URGENCY_RANK: Record<Urgency, number> = { critical: 3, high: 2, medium: 1, low: 0 };

const EVENT_SELECT = '*, analyses(*), repositories(full_name)';

interface AnalysisRow {
  readonly category: Category;
  readonly urgency: Urgency;
  readonly labels: string[];
  readonly summary: string;
  readonly model: string;
  readonly created_at: string;
}

interface EventRow {
  readonly id: string;
  readonly repository_id: string;
  readonly event_type: EventType;
  readonly ref: string;
  readonly author_login: string;
  readonly title: string;
  readonly url: string;
  readonly commits_count: number | null;
  readonly files_changed: number | null;
  readonly additions: number | null;
  readonly deletions: number | null;
  readonly pr_number: number | null;
  readonly status: AnalysisStatus;
  readonly received_at: string;
  // Relation 1-1 (event_id unique) : objet ou null ; on tolère aussi un tableau.
  readonly analyses: AnalysisRow | AnalysisRow[] | null;
  readonly repositories: { readonly full_name: string } | null;
}

interface RepositoryRow {
  readonly id: string;
  readonly full_name: string;
  readonly default_branch: string;
  readonly active: boolean;
  readonly webhook_status: WebhookStatus;
}

/** GitEvent sans l'état « lu », qui dépend de l'utilisateur (table `event_reads`). */
type EventData = Omit<GitEvent, 'read'>;

const toAnalysis = (raw: EventRow['analyses']): Analysis | null => {
  const row = Array.isArray(raw) ? (raw[0] ?? null) : raw;
  return row
    ? {
        category: row.category,
        urgency: row.urgency,
        labels: row.labels,
        summary: row.summary,
        model: row.model,
        createdAt: row.created_at,
      }
    : null;
};

const toEvent = (row: EventRow): EventData => ({
  id: row.id,
  repoId: row.repository_id,
  repoFullName: row.repositories?.full_name ?? '',
  eventType: row.event_type,
  ref: row.ref,
  author: { login: row.author_login },
  title: row.title,
  url: row.url,
  receivedAt: row.received_at,
  status: row.status,
  analysis: toAnalysis(row.analyses),
  commitsCount: row.commits_count ?? undefined,
  filesChanged: row.files_changed ?? undefined,
  additions: row.additions ?? undefined,
  deletions: row.deletions ?? undefined,
  prNumber: row.pr_number ?? undefined,
});

const toRepository = (row: RepositoryRow): Repository => ({
  id: row.id,
  fullName: row.full_name,
  defaultBranch: row.default_branch,
  active: row.active,
  webhookStatus: row.webhook_status,
});

/**
 * Source unique de vérité côté UI : lit Supabase (la RLS filtre par tenant),
 * garde la liste à jour via Realtime. Aucun filtre par tenant dans les requêtes.
 */
@Injectable({ providedIn: 'root' })
export class EventsService implements OnDestroy {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);

  private readonly _data = signal<readonly EventData[]>([]);
  private readonly _reads = signal<ReadonlySet<string>>(new Set());
  private readonly _repositories = signal<readonly Repository[]>([]);
  private readonly _filters = signal<EventFilters>(this.defaultFilters());
  private readonly _selectedId = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private channel: RealtimeChannel | null = null;

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly repositories = this._repositories.asReadonly();
  readonly filters = this._filters.asReadonly();

  readonly events = computed<readonly GitEvent[]>(() => {
    const reads = this._reads();
    return this._data().map((e) => ({ ...e, read: reads.has(e.id) }));
  });

  readonly filteredEvents = computed(() => {
    const f = this._filters();
    const q = f.search.trim().toLowerCase();
    return this.events()
      .filter((e) => (f.repoId ? e.repoId === f.repoId : true))
      .filter((e) => (f.eventType ? e.eventType === f.eventType : true))
      .filter((e) => (f.category ? e.analysis?.category === f.category : true))
      .filter((e) => (f.urgency ? e.analysis?.urgency === f.urgency : true))
      .filter((e) => (f.unreadOnly ? !e.read : true))
      .filter((e) =>
        q
          ? [e.title, e.ref, e.author.login, e.repoFullName, ...(e.analysis?.labels ?? [])]
              .join(' ')
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  });

  readonly selectedEvent = computed(
    () => this.events().find((e) => e.id === this._selectedId()) ?? null,
  );

  readonly stats = computed(() => {
    const events = this.events();
    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const e of events) {
      if (e.analysis) byCategory[e.analysis.category]++;
    }
    return {
      total: events.length,
      unread: events.filter((e) => !e.read).length,
      urgent: events.filter(
        (e) => e.analysis && URGENCY_RANK[e.analysis.urgency] >= URGENCY_RANK.high,
      ).length,
      pending: events.filter((e) => e.status === 'pending').length,
      failed: events.filter((e) => e.status === 'failed').length,
      byCategory,
    };
  });

  readonly eventCountByRepo = computed(() => {
    const counts = new Map<string, number>();
    for (const e of this._data()) counts.set(e.repoId, (counts.get(e.repoId) ?? 0) + 1);
    return counts;
  });

  readonly lastEventByRepo = computed(() => {
    const last = new Map<string, string>();
    for (const e of this._data()) {
      const current = last.get(e.repoId);
      if (!current || e.receivedAt > current) last.set(e.repoId, e.receivedAt);
    }
    return last;
  });

  constructor() {
    // Charge les données à la connexion, les vide et se désabonne à la déconnexion.
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      untracked(() => {
        if (userId) void this.start(userId);
        else this.stop();
      });
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  patchFilters(patch: Partial<EventFilters>): void {
    this._filters.update((f) => ({ ...f, ...patch }));
  }

  resetFilters(): void {
    this._filters.set(this.defaultFilters());
  }

  select(id: string | null): void {
    this._selectedId.set(id);
    if (id) void this.markRead(id, true);
  }

  /** Recharge tout (bouton « réessayer »). */
  async reload(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (userId) await this.load(userId);
  }

  async markRead(id: string, read: boolean): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId || this._reads().has(id) === read) return;
    this.setReads((s) => (read ? s.add(id) : s.delete(id)));
    const { error } = read
      ? await this.supabase.from('event_reads').insert({ user_id: userId, event_id: id })
      : await this.supabase.from('event_reads').delete().eq('user_id', userId).eq('event_id', id);
    if (error) {
      this.setReads((s) => (read ? s.delete(id) : s.add(id))); // annulation de la mise à jour optimiste
      this._error.set('Impossible de mettre à jour l\'état lu / non lu.');
    }
  }

  async markAllRead(): Promise<void> {
    const userId = this.auth.user()?.id;
    const unread = this._data().filter((e) => !this._reads().has(e.id));
    if (!userId || unread.length === 0) return;
    this.setReads((s) => unread.forEach((e) => s.add(e.id)));
    const { error } = await this.supabase
      .from('event_reads')
      .insert(unread.map((e) => ({ user_id: userId, event_id: e.id })));
    if (error) {
      this.setReads((s) => unread.forEach((e) => s.delete(e.id)));
      this._error.set('Impossible de tout marquer comme lu.');
    }
  }

  async toggleRepository(id: string): Promise<void> {
    const repo = this._repositories().find((r) => r.id === id);
    if (!repo) return;
    const active = !repo.active;
    this.patchRepository(id, active);
    const { error } = await this.supabase.from('repositories').update({ active }).eq('id', id);
    if (error) {
      this.patchRepository(id, repo.active);
      this._error.set('Impossible de modifier ce dépôt (droits insuffisants ?).');
    }
  }

  private async start(userId: string): Promise<void> {
    await this.load(userId);
    this.subscribe();
  }

  private stop(): void {
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this._data.set([]);
    this._reads.set(new Set());
    this._repositories.set([]);
    this._selectedId.set(null);
    this._error.set(null);
  }

  private async load(userId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    const [events, repos, reads] = await Promise.all([
      this.supabase
        .from('events')
        .select(EVENT_SELECT)
        .order('received_at', { ascending: false })
        .limit(200)
        .returns<EventRow[]>(),
      this.supabase.from('repositories').select('*').order('full_name').returns<RepositoryRow[]>(),
      this.supabase.from('event_reads').select('event_id').eq('user_id', userId),
    ]);
    if (events.error || repos.error || reads.error) {
      this._error.set('Impossible de charger les données. Vérifiez votre connexion.');
    } else {
      this._data.set(events.data.map(toEvent));
      this._repositories.set(repos.data.map(toRepository));
      this._reads.set(new Set(reads.data.map((r) => r.event_id as string)));
    }
    this._loading.set(false);
  }

  /** Realtime : la RLS s'applique, on ne reçoit que les lignes de ses tenants. */
  private subscribe(): void {
    if (this.channel) return;
    this.channel = this.supabase
      .channel('gitwatch-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id;
          if (id) this._data.update((list) => list.filter((e) => e.id !== id));
        } else {
          void this.refreshEvent((payload.new as { id: string }).id);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analyses' }, (payload) => {
        const eventId = (payload.new as { event_id?: string }).event_id;
        if (eventId) void this.refreshEvent(eventId);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'repositories' }, (payload) => {
        const row = payload.new as RepositoryRow;
        this._repositories.update((list) =>
          list.map((r) => (r.id === row.id ? toRepository(row) : r)),
        );
      })
      .subscribe();
  }

  /** Recharge un événement avec son analyse (le payload Realtime n'inclut pas les jointures). */
  private async refreshEvent(id: string): Promise<void> {
    const { data } = await this.supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('id', id)
      .maybeSingle<EventRow>();
    if (!data) return;
    const next = toEvent(data);
    this._data.update((list) =>
      list.some((e) => e.id === id) ? list.map((e) => (e.id === id ? next : e)) : [next, ...list],
    );
  }

  private patchRepository(id: string, active: boolean): void {
    this._repositories.update((list) => list.map((r) => (r.id === id ? { ...r, active } : r)));
  }

  private setReads(mutate: (s: Set<string>) => unknown): void {
    this._reads.update((current) => {
      const next = new Set(current);
      mutate(next);
      return next;
    });
  }

  private defaultFilters(): EventFilters {
    return { ...EMPTY_FILTERS, unreadOnly: this.settings.settings().unreadOnlyByDefault };
  }
}
