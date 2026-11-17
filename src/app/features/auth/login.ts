import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** N'autorise que les redirections internes (évite les open redirects). */
const safeReturnUrl = (url: string | null): string => (url && /^\/(?!\/)/.test(url) ? url : '/app');

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="wrap">
      <form class="card box" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <a class="brand" routerLink="/"><span aria-hidden="true">◉</span> GitWatch</a>
        <h1>Connexion</h1>
        <p class="sub">Accédez à l'activité de vos dépôts.</p>

        @if (error(); as message) {
          <p class="alert" role="alert">{{ message }}</p>
        }

        <div class="form-field">
          <label for="email">Email</label>
          <input
            id="email"
            class="input"
            type="email"
            autocomplete="username"
            formControlName="email"
            [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched"
          />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="error">Saisissez une adresse email valide.</span>
          }
        </div>

        <div class="form-field">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            class="input"
            type="password"
            autocomplete="current-password"
            formControlName="password"
            [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched"
          />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <span class="error">8 caractères minimum.</span>
          }
        </div>

        <button type="submit" class="btn primary full" [disabled]="submitting()">
          {{ submitting() ? 'Connexion…' : 'Se connecter' }}
        </button>

        <div class="sep" aria-hidden="true"><span>ou</span></div>
        <button type="button" class="btn full" [disabled]="submitting()" (click)="github()">
          Continuer avec GitHub
        </button>
        <p class="switch">Pas encore de compte ? <a routerLink="/signup">Créer un compte</a></p>
      </form>
    </main>
  `,
  styles: `
    .wrap {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .box {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 400px;
      padding: 2rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
    }
    h1 {
      font-size: 1.5rem;
    }
    .sub {
      margin: -0.5rem 0 0;
      color: var(--text-muted);
    }
    .alert {
      margin: 0;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      background: #fde8e8;
      color: #b42318;
    }
    .sep {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    .sep::before,
    .sep::after {
      content: '';
      flex: 1;
      border-top: 1px solid var(--border);
    }
    .full {
      justify-content: center;
    }
    .switch {
      margin: 0;
      text-align: center;
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      this.submitting.set(false);
    }
  }

  protected async github(): Promise<void> {
    this.error.set(null);
    try {
      await this.auth.signInWithGitHub();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Connexion GitHub impossible.');
    }
  }
}
