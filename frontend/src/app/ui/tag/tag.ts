import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-tag',
  template: `<span [class]="tone()"><ng-content /></span>`,
  styleUrl: './tag.scss',
})
export class Tag {
  readonly tone = input<'neutral' | 'success' | 'info'>('neutral');
}
