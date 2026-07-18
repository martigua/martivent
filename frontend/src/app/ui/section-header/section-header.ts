import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-section-header',
  template: `
    <header>
      @if (eyebrow()) {
        <p class="eyebrow">{{ eyebrow() }}</p>
      }
      <h1>{{ titleText() }}</h1>
      @if (lead()) {
        <p class="lead">{{ lead() }}</p>
      }
    </header>
  `,
  styleUrl: './section-header.scss',
})
export class SectionHeader {
  readonly eyebrow = input('');
  readonly titleText = input.required<string>();
  readonly lead = input('');
}
