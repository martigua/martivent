import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-button',
  template: `
    <button
      [type]="type()"
      [class]="variant()"
      [disabled]="disabled()"
      [attr.aria-expanded]="ariaExpanded()"
      [attr.aria-controls]="ariaControls() || null"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<'primary' | 'secondary' | 'link'>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly ariaExpanded = input<boolean | null>(null);
  readonly ariaControls = input('');
}
