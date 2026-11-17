import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PLANS, isPlanId } from '../../core/data/plans';
import { AuthService } from '../../core/services/auth.service';

/**
 * Inscription : crée le compte ET son espace de travail (un compte = un tenant).
 * Le plan choisi sur la page Tarifs arrive via `?plan=` (affiché ici, pas encore facturé).
 */
@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="wrap">
      @if (confirmationEmail(); as sentTo) {
        <section class="card box" aria-live="polite">
          <a class="brand" routerLink="/"><span aria-hidden="true">◉</span> GitWatch</a>
          <h1>Vérifiez votre boîte mail</h1>
          <p class="sub">
            Un lien de confirmation a été envoyé à <strong>{{ sentTo }}</strong>. Cliquez dessus pour
            activer votre espace, puis connectez-vous.
          </p>
          <a class="btn primary full" routerLink="/login">Aller à la connexion</a>
        </section>
      } @else {
      <form class="card box" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <a class="brand" routerLink="/"><span aria-hidden="true">◉</span> GitWatch</a>
        <h1>Créer votre espace</h1>
        <p class="sub">Un compte, un espace de travail : vos données restent isolées.</p>

        @if (plan(); as p) {
          <p class="plan">Plan sélectionné : <strong>{{ p.name }}</strong> ({{ p.price }} € / mois)</p>
        }

        @if (error(); as message) {
          <p class="alert" role="alert">{{ message }}</p>
        }

        <div class="form-field">
          <label for="displayName">Votre nom</label>
          <input
            id="displayName"
            class="input"
            formControlName="displayName"
            autocomplete="name"
            [attr.aria-invalid]="invalid('displayName')"
          />
          @if (invalid('displayName')) {
            <span class="error">Saisissez votre nom.</span>
          }
        </div>

        <div class="form-field">
          <label for="workspaceName">Nom de votre espace</label>
          <input
            id="workspaceName"
            class="input"
            formControlName="workspaceName"
            autocomplete="organization"
            placeholder="Votre entreprise, équipe ou projet"
            [attr.aria-invalid]="invalid('workspaceName')"
          />
          @if (invalid('workspaceName')) {
            <span class="error">Donnez un nom à votre espace.</span>
          }
        </div>

        <div class="form-field">
          <label for="email">Email</label>
          <input
            id="email"
            class="input"
            type="email"
            autocomplete="email"
            formControlName="email"
            [attr.aria-invalid]="invalid('email')"
          />
          @if (invalid('email')) {
            <span class="error">Saisissez une adresse email valide.</span>
          }
        </div>

        <div class="form-field">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            class="input"
            type="password"
            autocomplete="new-password"
            formControlName="password"
            [attr.aria-invalid]="invalid('password')"
          />
          @if (invalid('password')) {
            <span class="error">8 caractères minimum.</span>
          }
        </div>

        <button type="submit" class="btn primary full" [disabled]="submitting()">
          {{ submitting() ? 'Création…' : 'Créer mon espace' }}
        </button>

        <div class="sep" aria-hidden="true"><span>ou</span></div>
        <button type="button" class="btn full" [disabled]="submitting()" (click)="github()">
          Continuer avec GitHub
        </button>
        <p class="switch">Déjà un compte ? <a routerLink="/login">Se connecter</a></p>
      </form>
      }
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
      max-width: 440px;
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
    .plan {
      margin: 0;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      background: var(--primary-soft);
      color: var(--primary);
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
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmationEmail = signal<string | null>(null);

  protected readonly plan = computed(() => {
    const id = this.route.snapshot.queryParamMap.get('plan');
    return isPlanId(id) ? (PLANS.find((p) => p.id === id) ?? null) : null;
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    workspaceName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const value = this.form.getRawValue();
      const result = await this.auth.signUp({
        ...value,
        displayName: value.displayName.trim(),
        workspaceName: value.workspaceName.trim(),
      });
      if (result.needsEmailConfirmation) this.confirmationEmail.set(value.email);
      else await this.router.navigateByUrl('/app');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Inscription impossible.');
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
