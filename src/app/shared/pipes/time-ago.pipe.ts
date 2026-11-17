import { Pipe, PipeTransform } from '@angular/core';

const RTF = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

/** Affiche une date ISO sous forme relative : « il y a 5 minutes ». Pure : recalculée au changement d'entrée. */
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    if (!iso) return '—';
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    if (abs < 60) return RTF.format(Math.round(seconds), 'second');
    if (abs < 3600) return RTF.format(Math.round(seconds / 60), 'minute');
    if (abs < 86_400) return RTF.format(Math.round(seconds / 3600), 'hour');
    return RTF.format(Math.round(seconds / 86_400), 'day');
  }
}
