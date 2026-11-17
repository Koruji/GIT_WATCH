import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { User, UserRole } from '../models/user.model';
import { SupabaseService } from './supabase.service';

/** Résultat de l'inscription : `needsEmailConfirmation` si Supabase exige la confirmation d'e-mail. */
export interface SignUpResult {
  readonly needsEmailConfirmation: boolean;
}

interface MembershipRow {
  readonly role: UserRole;
  readonly tenants: { readonly id: string; readonly name: string } | null;
}

/** Authentification via Supabase Auth ; profil, tenant et rôle lus par la RLS. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly initials = computed(() => {
    const name = this._user()?.displayName ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('') || '?'
    );
  });

  /** Promesse résolue une fois la session restaurée (utilisée par les guards). */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    await this.applySession(data.session);
    // Ne pas appeler d'API Supabase de façon synchrone dans ce callback (risque d'interblocage) :
    // on diffère le traitement.
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      setTimeout(() => void this.applySession(session), 0);
    });
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email ou mot de passe incorrect.');
    await this.syncUser();
  }

  /**
   * Un compte = un tenant : le trigger `handle_new_user` lit `display_name` et `workspace_name`.
   * Sans session retournée, la confirmation d'e-mail est requise.
   */
  async signUp(input: {
    email: string;
    password: string;
    displayName: string;
    workspaceName: string;
  }): Promise<SignUpResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.displayName, workspace_name: input.workspaceName },
        emailRedirectTo: window.location.origin + '/login',
      },
    });
    if (error) throw new Error(this.signUpMessage(error.message));
    if (!data.session) return { needsEmailConfirmation: true };
    await this.syncUser();
    return { needsEmailConfirmation: false };
  }

  /** Connexion / inscription avec un compte GitHub. Redirige hors de l'application. */
  async signInWithGitHub(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/app' },
    });
    if (error) throw new Error('Connexion GitHub impossible : ' + error.message);
  }

  /** Renomme l'espace de travail (admins et propriétaires, colonne `name` uniquement). */
  async updateWorkspaceName(name: string): Promise<void> {
    const tenantId = this._user()?.tenantId;
    if (!tenantId) throw new Error('Espace de travail introuvable.');
    const { data, error } = await this.supabase
      .from('tenants')
      .update({ name })
      .eq('id', tenantId)
      .select('id');
    if (error || data.length === 0) throw new Error("Vous n'avez pas le droit de renommer cet espace.");
    await this.syncUser();
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this._user.set(null);
  }

  /** Seul `display_name` est modifiable (droit `update` limité à cette colonne). */
  async updateProfile(patch: Pick<User, 'displayName' | 'email'>): Promise<void> {
    const current = this._user();
    if (!current) return;
    if (patch.displayName !== current.displayName) {
      const { error } = await this.supabase
        .from('profiles')
        .update({ display_name: patch.displayName })
        .eq('id', current.id);
      if (error) throw new Error('Impossible de mettre à jour le profil.');
    }
    if (patch.email !== current.email) {
      const { error } = await this.supabase.auth.updateUser({ email: patch.email });
      if (error) throw new Error(error.message);
    }
    await this.syncUser();
  }

  /** Vérifie l'ancien mot de passe en se reconnectant, puis applique le nouveau. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const email = this._user()?.email;
    if (!email) throw new Error('Session expirée.');
    if (newPassword === currentPassword) {
      throw new Error("Le nouveau mot de passe doit être différent de l'actuel.");
    }
    const check = await this.supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (check.error) throw new Error('Mot de passe actuel incorrect.');
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  private async syncUser(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    await this.applySession(data.session);
  }

  private async applySession(session: Session | null): Promise<void> {
    if (!session) {
      this._user.set(null);
      return;
    }
    const [profile, membership] = await Promise.all([
      this.supabase.from('profiles').select('display_name').eq('id', session.user.id).maybeSingle(),
      this.supabase
        .from('tenant_members')
        .select('role, tenants(id, name)')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle<MembershipRow>(),
    ]);
    this._user.set({
      id: session.user.id,
      email: session.user.email ?? '',
      displayName: profile.data?.display_name ?? session.user.email ?? 'Utilisateur',
      role: membership.data?.role ?? 'member',
      tenantId: membership.data?.tenants?.id ?? '',
      tenantName: membership.data?.tenants?.name ?? '',
      hasPassword: (session.user.app_metadata['providers'] as string[] | undefined)?.includes('email') ?? false,
      createdAt: session.user.created_at,
    });
  }

  private signUpMessage(message: string): string {
    return /already registered/i.test(message)
      ? 'Un compte existe déjà avec cet email.'
      : "Inscription impossible : " + message;
  }
}
