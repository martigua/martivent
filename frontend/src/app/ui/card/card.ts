import { Component } from '@angular/core';

@Component({
  selector: 'mg-card',
  template: `
    <article>
      <ng-content />
    </article>
  `,
  styleUrl: './card.scss',
})
export class Card {}
