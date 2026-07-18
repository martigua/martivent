import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { Nav } from './nav';

@Component({
  template: '',
})
class RouteTarget {}

describe('Nav', () => {
  let fixture: ComponentFixture<Nav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Nav],
      providers: [provideRouter([{ path: '', component: RouteTarget }])],
    }).compileComponents();

    fixture = TestBed.createComponent(Nav);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
  });

  it('does not render links to placeholder fragments', () => {
    const nav = fixture.nativeElement as HTMLElement;

    const destinations = Array.from(nav.querySelectorAll('a'), (link) => link.getAttribute('href'));

    expect(destinations).not.toContain('/#members');
    expect(destinations).not.toContain('/#dashboard');
    expect(nav.textContent).not.toContain('Membres');
    expect(nav.textContent).not.toContain('Tableau de bord v2');
  });

  it('marks the active home link semantically and visually', () => {
    const nav = fixture.nativeElement as HTMLElement;
    const homeLink = Array.from(nav.querySelectorAll('a')).find(
      (link) => link.textContent.trim() === 'Accueil',
    );
    if (!homeLink) {
      throw new Error('Home navigation link not found');
    }

    expect(homeLink.getAttribute('aria-current')).toBe('page');
    expect(getComputedStyle(homeLink).textDecorationLine).toBe('underline');
  });

  it('uses shared typography classes', () => {
    const nav = fixture.nativeElement as HTMLElement;

    expect(nav.querySelector('.brand')?.classList).toContain('display-sm');
    expect(nav.querySelector('.links')?.classList).toContain('text-small');
  });
});
