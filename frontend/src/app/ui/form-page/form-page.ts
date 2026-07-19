import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-form-page',
  template: `
    <section>
      <header>
        @if (eyebrow()) {
          <p class="eyebrow">{{ eyebrow() }}</p>
        }
        <h1>{{ titleText() }}</h1>
      </header>
      <div class="content">
        <ng-content />
      </div>
    </section>
  `,
  styleUrl: './form-page.scss',
})
export class FormPage {
  readonly eyebrow = input('');
  readonly titleText = input.required<string>();
}
