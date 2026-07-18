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
          <dd>{{ stat.value }}</dd>
          <dt>{{ stat.label }}</dt>
        </div>
      }
    </dl>
  `,
  styleUrl: './stat-band.scss',
})
export class StatBand {
  readonly stats = input.required<readonly Stat[]>();
}
