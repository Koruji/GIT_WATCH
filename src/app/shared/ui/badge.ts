import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone =
  | 'neutral'
  | 'bug'
  | 'feature'
  | 'refactor'
  | 'docs'
  | 'chore'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'ok'
  | 'warn';

/** Pastille réutilisable (catégorie, urgence, statut, label). */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"badge tone-" + tone()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.5;
      white-space: nowrap;
      background: var(--tone-bg, var(--surface-2));
      color: var(--tone-fg, var(--text-muted));
    }
    :host(.tone-bug) { --tone-bg: #fde8e8; --tone-fg: #b42318; }
    :host(.tone-feature) { --tone-bg: #e0f2fe; --tone-fg: #0369a1; }
    :host(.tone-refactor) { --tone-bg: #ede9fe; --tone-fg: #6d28d9; }
    :host(.tone-docs) { --tone-bg: #ecfdf3; --tone-fg: #027a48; }
    :host(.tone-chore) { --tone-bg: #f2f4f7; --tone-fg: #475467; }
    :host(.tone-low) { --tone-bg: #f2f4f7; --tone-fg: #475467; }
    :host(.tone-medium) { --tone-bg: #fef7c3; --tone-fg: #854a0e; }
    :host(.tone-high) { --tone-bg: #ffead5; --tone-fg: #b93815; }
    :host(.tone-critical) { --tone-bg: #b42318; --tone-fg: #fff; }
    :host(.tone-ok) { --tone-bg: #ecfdf3; --tone-fg: #027a48; }
    :host(.tone-warn) { --tone-bg: #fef7c3; --tone-fg: #854a0e; }
    :host-context([data-theme='dark']) {
      &.tone-bug { --tone-bg: #3b1a1a; --tone-fg: #fda29b; }
      &.tone-feature { --tone-bg: #0c2a3d; --tone-fg: #7dd3fc; }
      &.tone-refactor { --tone-bg: #2a2150; --tone-fg: #c4b5fd; }
      &.tone-docs, &.tone-ok { --tone-bg: #0f2e22; --tone-fg: #6ce9a6; }
      &.tone-chore, &.tone-low { --tone-bg: #27314a; --tone-fg: #cbd5e1; }
      &.tone-medium, &.tone-warn { --tone-bg: #3a300c; --tone-fg: #fde047; }
      &.tone-high { --tone-bg: #3d2210; --tone-fg: #fdba74; }
    }
  `,
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
}
