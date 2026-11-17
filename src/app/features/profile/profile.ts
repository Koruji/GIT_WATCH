import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ROLE_LABELS } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';

const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
};

interface Feedback {
  readonly kind: 'success' | 'error';
  readonly text: string;
}

/** Gestion du compte : informations personnelles, mot de passe, session. */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <h1>Mon profil</h1>
      <p class="sub">Gérez votre compte et votre mot de passe.</p>
    </header>

    @if (auth.user(); as user) {
      <section class="card identity">
        <span class="avatar" aria-hidden="true">{{ auth.initials() }}</span>
        <div>
          <strong>{{ user.displayName }}</strong>
          <div class="muted">{{ user.email }}</div>
        </div>
        <dl>
          <div><dt>Rôle</dt><dd>{{ roles[user.role] }}</dd></div>
          <div><dt>Espace de travail</dt><dd>{{ user.tenantName }}</dd></div>
          <div><dt>Membre depuis</dt><dd>{{ user.createdAt | date: 'dd/MM/yyyy' }}</dd></div>
        </dl>
      </section>
    }

    <form class="card section" [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
      <h2>Informations personnelles</h2>

      <div class="form-field">
        <label for="displayName">Nom affiché</label>
        <input id="displayName" class="input" formControlName="displayName" autocomplete="name" />
        @if (profileForm.controls.displayName.touched && profileForm.controls.displayName.invalid) {
          <span class="error">Le nom est requis.</span>
        }
      </div>

      @if (auth.user()?.role !== 'member') {
        <div class="form-field">
          <label for="workspaceName">Nom de l'espace de travail</label>
          <input id="workspaceName" class="input" formControlName="workspaceName" maxlength="80" />
          @if (profileForm.controls.workspaceName.touched && profileForm.controls.workspaceName.invalid) {
            <span class="error">Le nom de l'espace est requis.</span>
          }
        </div>
      }

      <div class="form-field">
        <label for="email">Email</label>
        <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
        @if (profileForm.controls.email.touched && profileForm.controls.email.invalid) {
          <span class="error">Adresse email invalide.</span>
        }
      </div>

      @if (profileFeedback(); as fb) {
        <p class="feedback" [class.err]="fb.kind === 'error'" role="status">{{ fb.text }}</p>
      }

      <div class="actions">
        <button type="submit" class="btn primary" [disabled]="savingProfile() || profileForm.pristine">
          {{ savingProfile() ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </form>

    @if (auth.user()?.hasPassword) {
    <form class="card section" [formGroup]="passwordForm" (ngSubmit)="savePassword()" novalidate>
      <h2>Mot de passe</h2>

      <div class="form-field">
        <label for="currentPassword">Mot de passe actuel</label>
        <input
          id="currentPassword"
          class="input"
          type="password"
          formControlName="currentPassword"
          autocomplete="current-password"
        />
      </div>

      <div class="form-field">
        <label for="newPassword">Nouveau mot de passe</label>
        <input
          id="newPassword"
          class="input"
          type="password"
          formControlName="newPassword"
          autocomplete="new-password"
        />
        @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid) {
          <span class="error">8 caractères minimum.</span>
        }
      </div>

      <div class="form-field">
        <label for="confirmPassword">Confirmer le nouveau mot de passe</label>
        <input
          id="confirmPassword"
          class="input"
          type="password"
          formControlName="confirmPassword"
          autocomplete="new-password"
        />
        @if (passwordForm.controls.confirmPassword.touched && passwordForm.hasError('mismatch')) {
          <span class="error">Les mots de passe ne correspondent pas.</span>
        }
      </div>

      @if (passwordFeedback(); as fb) {
        <p class="feedback" [class.err]="fb.kind === 'error'" role="status">{{ fb.text }}</p>
      }

      <div class="actions">
        <button type="submit" class="btn primary" [disabled]="savingPassword()">
          {{ savingPassword() ? 'Mise à jour…' : 'Changer le mot de passe' }}
        </button>
      </div>
    </form>
    }

    <section class="card section">
      <h2>Session</h2>
      <p class="muted">Vous serez redirigé vers la page d'accueil.</p>
      <div class="actions">
        <button type="button" class="btn danger" (click)="logout()">Se déconnecter</button>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 720px;
    }
    h1 {
      font-size: 1.5rem;
    }
    h2 {
      font-size: 1rem;
    }
    .sub,
    .muted {
      margin: 0.125rem 0 0;
      color: var(--text-muted);
    }
    .identity {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1rem;
      align-items: center;
      padding: 1.25rem;
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      font-size: 1.25rem;
      font-weight: 700;
    }
    dl {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
      margin: 0;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }
    dt {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    dd {
      margin: 0;
      font-weight: 500;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    .feedback {
      margin: 0;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      background: #ecfdf3;
      color: #027a48;
    }
    .feedback.err {
      background: #fde8e8;
      color: #b42318;
    }
    .btn.danger {
      color: #b42318;
      border-color: #f4b4ae;
    }
    @media (max-width: 600px) {
      dl {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Profile {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly roles = ROLE_LABELS;
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profileFeedback = signal<Feedback | null>(null);
  protected readonly passwordFeedback = signal<Feedback | null>(null);

  protected readonly profileForm = this.fb.group({
    displayName: [this.auth.user()?.displayName ?? '', [Validators.required]],
    email: [this.auth.user()?.email ?? '', [Validators.required, Validators.email]],
    workspaceName: [this.auth.user()?.tenantName ?? '', [Validators.required, Validators.maxLength(80)]],
  });

  protected readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    try {
      const { displayName, email, workspaceName } = this.profileForm.getRawValue();
      await this.auth.updateProfile({ displayName, email });
      const user = this.auth.user();
      if (user && user.role !== 'member' && workspaceName.trim() !== user.tenantName) {
        await this.auth.updateWorkspaceName(workspaceName.trim());
      }
      this.profileForm.markAsPristine();
      this.profileFeedback.set({ kind: 'success', text: 'Profil mis à jour.' });
    } catch (e) {
      this.profileFeedback.set({ kind: 'error', text: this.messageOf(e) });
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    try {
      const { currentPassword, newPassword } = this.passwordForm.getRawValue();
      await this.auth.changePassword(currentPassword, newPassword);
      this.passwordForm.reset();
      this.passwordFeedback.set({ kind: 'success', text: 'Mot de passe modifié.' });
    } catch (e) {
      this.passwordFeedback.set({ kind: 'error', text: this.messageOf(e) });
    } finally {
      this.savingPassword.set(false);
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }

  private messageOf(e: unknown): string {
    return e instanceof Error ? e.message : 'Une erreur est survenue.';
  }
}
