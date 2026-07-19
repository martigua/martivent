import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { CurrentUser, SessionUser } from '../../core/current-user';
import { Nav } from './nav';

@Component({
  template: '',
})
class RouteTarget {}

describe('Nav', () => {
  let fixture: ComponentFixture<Nav>;
  let session: ReturnType<typeof signal<SessionUser | null>>;

  beforeEach(async () => {
    session = signal<SessionUser | null>(null);

    await TestBed.configureTestingModule({
      imports: [Nav],
      providers: [
        provideRouter([
          { path: '', component: RouteTarget },
          { path: 'account', component: RouteTarget },
        ]),
        {
          provide: CurrentUser,
          useValue: {
            user: session,
            loaded: signal(true),
          },
        },
      ],
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

  it('offers login and signup to signed-out visitors', () => {
    const nav = fixture.nativeElement as HTMLElement;
    const destinations = Array.from(nav.querySelectorAll('a'), (link) => link.getAttribute('href'));

    expect(destinations).toContain('/accounts/login/');
    expect(destinations).toContain('/accounts/signup/');
    expect(destinations).not.toContain('/account');
    expect(destinations).not.toContain('/accounts/logout/');
  });

  it('offers account access and logout to signed-in users', async () => {
    session.set({
      id: 7,
      email: 'member@martigua.fr',
      is_validated: false,
      capabilities: {},
      features: {},
    });
    await fixture.whenStable();

    const nav = fixture.nativeElement as HTMLElement;
    const destinations = Array.from(nav.querySelectorAll('a'), (link) => link.getAttribute('href'));

    expect(destinations).toContain('/account');
    expect(destinations).toContain('/accounts/logout/');
    expect(destinations).not.toContain('/accounts/login/');
    expect(destinations).not.toContain('/accounts/signup/');
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
