import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AppSettings, DEFAULT_SETTINGS } from '../models/user.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'gitwatch.settings';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Préférences de l'interface : cache localStorage (pas de flash au démarrage)
 * synchronisé avec la table `user_settings` une fois connecté.
 * Appliquées au document via `data-theme` et `data-density` (voir styles.scss).
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly _settings = signal<AppSettings>(this.load());
  private readonly systemDark = signal(window.matchMedia(DARK_QUERY).matches);

  readonly settings = this._settings.asReadonly();
  readonly resolvedTheme = computed<'light' | 'dark'>(() => {
    const { theme } = this._settings();
    return theme === 'system' ? (this.systemDark() ? 'dark' : 'light') : theme;
  });

  constructor() {
    window
      .matchMedia(DARK_QUERY)
      .addEventListener('change', (event) => this.systemDark.set(event.matches));

    this.apply(); // application immédiate (évite un flash de thème au démarrage)
    effect(() => {
      this._settings();
      this.resolvedTheme();
      this.apply();
    });

    // À la connexion, les réglages stockés en base remplacent le cache local.
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (userId) untracked(() => void this.pull(userId));
    });
  }

  update(patch: Partial<AppSettings>): void {
    this._settings.update((s) => ({ ...s, ...patch }));
    this.persist();
    void this.push();
  }

  reset(): void {
    this._settings.set(DEFAULT_SETTINGS);
    this.persist();
    void this.push();
  }

  private async pull(userId: string): Promise<void> {
    const { data } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return;
    this._settings.set({
      theme: data.theme,
      density: data.density,
      language: data.language,
      emailNotifications: data.email_notifications,
      notifyMinUrgency: data.notify_min_urgency,
      autoRefreshSeconds: data.auto_refresh_seconds,
      unreadOnlyByDefault: data.unread_only_by_default,
    });
    this.persist();
  }

  /** Écrit les réglages en base (silencieux hors connexion : le cache local suffit). */
  private async push(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    const s = this._settings();
    await this.supabase.from('user_settings').upsert({
      user_id: userId,
      theme: s.theme,
      density: s.density,
      language: s.language,
      email_notifications: s.emailNotifications,
      notify_min_urgency: s.notifyMinUrgency,
      auto_refresh_seconds: s.autoRefreshSeconds,
      unread_only_by_default: s.unreadOnlyByDefault,
    });
  }

  private apply(): void {
    this.root.dataset['theme'] = this.resolvedTheme();
    this.root.dataset['density'] = this._settings().density;
    this.root.lang = this._settings().language;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings()));
    } catch {
      /* stockage indisponible : les réglages restent valables pour la session */
    }
  }

  private load(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}
