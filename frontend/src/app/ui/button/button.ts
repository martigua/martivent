import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-button',
  template: `
    <button type="button" [class]="variant()">
      <ng-content />
    </button>
  `,
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<'primary' | 'secondary'>('primary');
}
