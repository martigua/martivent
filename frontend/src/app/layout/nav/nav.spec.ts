import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { CurrentUser, SessionUser } from '../../core/current-user';
import { HeadlessAuthentication } from '../../core/headless-authentication';
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
          { path: 'auth/login', component: RouteTarget },
          { path: 'auth/signup', component: RouteTarget },
        ]),
        {
          provide: CurrentUser,
          useValue: {
            user: session,
            loaded: signal(true),
          },
        },
        {
          provide: HeadlessAuthentication,
          useValue: {
            logout: () => of(undefined),
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

    expect(destinations).toContain('/auth/login');
    expect(destinations).toContain('/auth/signup');
    expect(destinations).not.toContain('/account');
    expect(nav.querySelector('mg-button:not(.menu-toggle)')).toBeNull();
    expect(nav.querySelector('.session-actions')).toBeTruthy();
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
    const logout = Array.from(nav.querySelectorAll('mg-button')).find((button) =>
      button.textContent.includes('Se déconnecter'),
    );
    expect(logout).toBeTruthy();
    expect(destinations).not.toContain('/auth/login');
    expect(destinations).not.toContain('/auth/signup');
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

  it('exposes an accessible compact-navigation toggle', async () => {
    const nav = fixture.nativeElement as HTMLElement;
    const menu = nav.querySelector<HTMLButtonElement>('.menu-toggle button');
    if (!menu) {
      throw new Error('Navigation menu button not found');
    }

    expect(menu.getAttribute('aria-expanded')).toBe('false');
    menu.click();
    await fixture.whenStable();

    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(nav.querySelector('.links')?.classList).toContain('open');
  });
});
