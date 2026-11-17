import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { URGENCIES, URGENCY_LABELS, Urgency } from '../../core/models/git-event.model';
import {
  Density,
  Language,
  RefreshInterval,
  ThemeMode,
} from '../../core/models/user.model';
import { SettingsService } from '../../core/services/settings.service';

const valueOf = (event: Event): string => (event.target as HTMLSelectElement).value;
const checkedOf = (event: Event): boolean => (event.target as HTMLInputElement).checked;

/** Paramètres de l'interface. Chaque changement est appliqué et enregistré immédiatement. */
@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div>
        <h1>Paramètres</h1>
        <p class="sub">Les modifications sont enregistrées automatiquement.</p>
      </div>
      <button type="button" class="btn" (click)="settings.reset()">Réinitialiser</button>
    </header>

    <section class="card section" aria-labelledby="h-appearance">
      <h2 id="h-appearance">Apparence</h2>

      <fieldset>
        <legend>Thème</legend>
        <div class="choices">
          @for (t of themes; track t.value) {
            <label class="choice" [class.on]="s().theme === t.value">
              <input
                type="radio"
                name="theme"
                [value]="t.value"
                [checked]="s().theme === t.value"
                (change)="settings.update({ theme: t.value })"
              />
              <span class="icon" aria-hidden="true">{{ t.icon }}</span>
              {{ t.label }}
            </label>
          }
        </div>
      </fieldset>

      <fieldset>
        <legend>Densité de la liste</legend>
        <div class="choices">
          @for (d of densities; track d.value) {
            <label class="choice" [class.on]="s().density === d.value">
              <input
                type="radio"
                name="density"
                [value]="d.value"
                [checked]="s().density === d.value"
                (change)="settings.update({ density: d.value })"
              />
              {{ d.label }}
            </label>
          }
        </div>
      </fieldset>
    </section>

    <section class="card section" aria-labelledby="h-lang">
      <h2 id="h-lang">Langue</h2>
      <div class="form-field">
        <label for="language">Langue de l'interface</label>
        <select
          id="language"
          class="input"
          (change)="settings.update({ language: asLanguage(valueOf($event)) })"
        >
          <option value="fr" [selected]="s().language === 'fr'">Français</option>
          <option value="en" [selected]="s().language === 'en'">English</option>
        </select>
        <span class="hint">Préférence enregistrée ; les traductions ne sont pas encore intégrées.</span>
      </div>
    </section>

    <section class="card section" aria-labelledby="h-notif">
      <h2 id="h-notif">Notifications</h2>

      <label class="switch-row">
        <input
          type="checkbox"
          [checked]="s().emailNotifications"
          (change)="settings.update({ emailNotifications: checkedOf($event) })"
        />
        <span>
          Recevoir un email pour les événements importants
          <small>Envoyé par le workflow N8N lorsqu'une analyse atteint le seuil ci-dessous.</small>
        </span>
      </label>

      <div class="form-field">
        <label for="minUrgency">Seuil d'urgence minimal</label>
        <select
          id="minUrgency"
          class="input"
          [disabled]="!s().emailNotifications"
          (change)="settings.update({ notifyMinUrgency: asUrgency(valueOf($event)) })"
        >
          @for (u of urgencies; track u) {
            <option [value]="u" [selected]="s().notifyMinUrgency === u">{{ urgencyLabels[u] }}</option>
          }
        </select>
      </div>
    </section>

    <section class="card section" aria-labelledby="h-dash">
      <h2 id="h-dash">Dashboard</h2>

      <label class="switch-row">
        <input
          type="checkbox"
          [checked]="s().unreadOnlyByDefault"
          (change)="settings.update({ unreadOnlyByDefault: checkedOf($event) })"
        />
        <span>
          Afficher uniquement les événements non lus par défaut
          <small>S'applique à l'ouverture du dashboard et à « Réinitialiser » les filtres.</small>
        </span>
      </label>

      <div class="form-field">
        <label for="refresh">Actualisation automatique</label>
        <select
          id="refresh"
          class="input"
          (change)="settings.update({ autoRefreshSeconds: asRefresh(valueOf($event)) })"
        >
          @for (r of refreshes; track r.value) {
            <option [value]="r.value" [selected]="s().autoRefreshSeconds === r.value">
              {{ r.label }}
            </option>
          }
        </select>
        <span class="hint">Préférence enregistrée ; inutile tant que le temps réel n'est pas branché.</span>
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
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
    }
    h1 {
      font-size: 1.5rem;
    }
    h2 {
      font-size: 1rem;
    }
    .sub {
      margin: 0.125rem 0 0;
      color: var(--text-muted);
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem;
    }
    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      margin-bottom: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .choices {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .choice {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      cursor: pointer;
    }
    .choice.on {
      border-color: var(--primary);
      background: var(--primary-soft);
      color: var(--primary);
      font-weight: 600;
    }
    .choice input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .choice:has(input:focus-visible) {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
    .switch-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
    }
    .switch-row input {
      width: 1.125rem;
      height: 1.125rem;
      margin-top: 0.125rem;
      accent-color: var(--primary);
    }
    small {
      display: block;
      color: var(--text-muted);
      font-size: 0.75rem;
    }
  `,
})
export class Settings {
  protected readonly settings = inject(SettingsService);
  protected readonly s = this.settings.settings;

  protected readonly urgencies = URGENCIES;
  protected readonly urgencyLabels = URGENCY_LABELS;

  protected readonly themes: readonly { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'light', label: 'Clair', icon: '☀' },
    { value: 'dark', label: 'Sombre', icon: '☾' },
    { value: 'system', label: 'Système', icon: '⚙' },
  ];
  protected readonly densities: readonly { value: Density; label: string }[] = [
    { value: 'comfortable', label: 'Confortable' },
    { value: 'compact', label: 'Compacte' },
  ];
  protected readonly refreshes: readonly { value: RefreshInterval; label: string }[] = [
    { value: 0, label: 'Désactivée' },
    { value: 30, label: 'Toutes les 30 secondes' },
    { value: 60, label: 'Toutes les minutes' },
    { value: 300, label: 'Toutes les 5 minutes' },
  ];

  protected readonly valueOf = valueOf;
  protected readonly checkedOf = checkedOf;
  protected readonly asLanguage = (v: string): Language => (v === 'en' ? 'en' : 'fr');
  protected readonly asUrgency = (v: string): Urgency => v as Urgency;
  protected readonly asRefresh = (v: string): RefreshInterval => Number(v) as RefreshInterval;
}
