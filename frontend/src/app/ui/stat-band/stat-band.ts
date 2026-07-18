import { Component, input } from '@angular/core';

export interface Stat {
  label: string;
  value: string;
}

@Component({
  selector: 'mg-stat-band',
  template: `
    <dl>
      @for (stat of stats(); track stat.label) {
        <div>
          <dt class="text-label">{{ stat.label }}</dt>
          <dd class="display-md">{{ stat.value }}</dd>
        </div>
      }
    </dl>
  `,
  styleUrl: './stat-band.scss',
})
export class StatBand {
  readonly stats = input.required<readonly Stat[]>();
}
