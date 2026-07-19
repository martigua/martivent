import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CurrentUser, SessionUser } from '../../core/current-user';
import { Account } from './account';

describe('Account', () => {
  let fixture: ComponentFixture<Account>;
  let session: ReturnType<typeof signal<SessionUser | null>>;
  let loaded: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    session = signal<SessionUser | null>(null);
    loaded = signal(true);

    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        provideRouter([]),
        {
          provide: CurrentUser,
          useValue: {
            user: session,
            loaded,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    await fixture.whenStable();
  });

  it('offers authentication actions to signed-out visitors', () => {
    const page = fixture.nativeElement as HTMLElement;
    const destinations = Array.from(page.querySelectorAll('a'), (link) =>
      link.getAttribute('href'),
    );

    expect(page.querySelector('h1')?.textContent).toContain('Mon compte');
    expect(page.textContent).toContain('Connectez-vous');
    expect(destinations).toContain('/accounts/login/');
    expect(destinations).toContain('/accounts/signup/');
  });

  it('shows the signed-in account and pending administrator validation', async () => {
    session.set({
      id: 7,
      email: 'member@martigua.fr',
      is_validated: false,
      capabilities: {},
      features: {},
    });
    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;
    const destinations = Array.from(page.querySelectorAll('a'), (link) =>
      link.getAttribute('href'),
    );

    expect(page.textContent).toContain('member@martigua.fr');
    expect(page.textContent).toContain('En attente de validation');
    expect(page.textContent).toContain('Un administrateur doit valider votre compte');
    expect(destinations).toContain('/accounts/email/');
    expect(destinations).toContain('/accounts/password/change/');
    expect(destinations).toContain('/accounts/logout/');
  });

  it('shows administrator validation when the account is validated', async () => {
    session.set({
      id: 7,
      email: 'member@martigua.fr',
      is_validated: true,
      capabilities: {},
      features: {},
    });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Compte validé');
  });

  it('announces loading before the session state is known', async () => {
    loaded.set(false);
    await fixture.whenStable();

    const status = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');

    expect(status?.textContent).toContain('Chargement de votre compte');
  });
});
