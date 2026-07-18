import { Component, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

@Component({
  template: '',
  styleUrl: '../styles/_elements.scss',
  encapsulation: ViewEncapsulation.None,
})
class GlobalElements {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, GlobalElements],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the navigation and routed page shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const destinations = Array.from(compiled.querySelectorAll('nav a'), (link) =>
      link.getAttribute('href'),
    );

    expect(compiled.querySelector('mg-nav')).not.toBeNull();
    expect(compiled.querySelector('main router-outlet')).not.toBeNull();
    expect(destinations.some((destination) => destination?.includes('#'))).toBe(false);
  });

  it('enables smooth scrolling only when reduced motion is not preferred', async () => {
    const fixture = TestBed.createComponent(GlobalElements);
    await fixture.whenStable();

    const rootRules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules),
    );
    const motionRule = rootRules.find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule &&
        rule.conditionText === '(prefers-reduced-motion: no-preference)',
    );
    const smoothHtmlRules = Array.from(motionRule?.cssRules ?? []).filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule &&
        rule.selectorText === 'html' &&
        rule.style.scrollBehavior === 'smooth',
    );
    const unconditionalSmoothHtmlRules = rootRules.filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule &&
        rule.selectorText === 'html' &&
        rule.style.scrollBehavior === 'smooth',
    );

    expect(smoothHtmlRules).toHaveLength(1);
    expect(unconditionalSmoothHtmlRules).toHaveLength(0);
  });
});
