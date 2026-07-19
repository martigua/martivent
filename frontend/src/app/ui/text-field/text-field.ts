import { Component, ElementRef, viewChild, input, model, output } from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

let nextErrorId = 0;

@Component({
  selector: 'mg-text-field',
  template: `
    <label>
      <span>{{ label() }}</span>
      <input
        #control
        [type]="type()"
        [value]="value()"
        [disabled]="disabled()"
        [required]="required()"
        [attr.name]="name() || null"
        [attr.autocomplete]="autocomplete() || null"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="showErrors() ? errorId : null"
        (input)="updateValue($event)"
        (blur)="touch.emit()"
      />
    </label>
    @if (showErrors()) {
      <p class="error" [id]="errorId">{{ errors()[0].message }}</p>
    }
  `,
  styleUrl: './text-field.scss',
})
export class TextField implements FormValueControl<string> {
  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input('');
  readonly value = model('');
  readonly disabled = input(false);
  readonly required = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly name = input('');
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touch = output();
  readonly errorId = `mg-text-field-error-${nextErrorId++}`;

  protected showErrors(): boolean {
    return this.touched() && this.errors().length > 0;
  }

  protected updateValue(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }
}
