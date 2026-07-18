import { Component, ViewEncapsulation } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tag } from './tag';

@Component({
  template: '',
  styleUrl: '../../../styles/_tokens.semantic.scss',
  encapsulation: ViewEncapsulation.None,
})
class SemanticTokens {}

describe('Tag', () => {
  let fixture: ComponentFixture<Tag>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tag, SemanticTokens],
    }).compileComponents();

    TestBed.createComponent(SemanticTokens);
    fixture = TestBed.createComponent(Tag);
    await fixture.whenStable();
  });

  it('applies its requested tone', async () => {
    fixture.componentRef.setInput('tone', 'success');
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const tag = host.querySelector('span');

    expect(tag?.classList).toContain('success');
    expect(tag?.classList).toContain('text-label');
  });

  it('uses inverse text for info and danger status backgrounds', () => {
    const tokens = getComputedStyle(document.documentElement);

    expect(tokens.getPropertyValue('--status-info-text').trim()).toBe('var(--text-inverse)');
    expect(tokens.getPropertyValue('--status-danger-text').trim()).toBe('var(--text-inverse)');
  });
});
