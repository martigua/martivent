import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ApplicationContext, ApplicationContextData } from '../../core/application-context';
import { Home } from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  const backendContext = {
    club: {
      name: 'Club returned by Django',
      sport: 'Handball',
      location: 'Paris 19e',
      founded_year: 1980,
      team_count: 9,
      licensed_member_count: 250,
      stats: [
        { label: 'Année de création', value: '1980' },
        { label: 'Collectifs', value: '9' },
        { label: 'Membres', value: '250' },
      ],
    },
    authentication: {
      google: false,
    },
  } satisfies ApplicationContextData;
  const context = signal<ApplicationContextData | null>(backendContext);
  const error = signal<unknown>(undefined);
  const reload = vi.fn();

  beforeEach(async () => {
    context.set(backendContext);
    error.set(undefined);
    reload.mockReset();

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: ApplicationContext,
          useValue: {
            context: context.asReadonly(),
            error: error.asReadonly(),
            reload,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
  });

  it('presents the club foundation', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('Club returned by Django');
    expect(page.textContent).toContain('1980');
    expect(page.textContent).toContain('250');
    expect(page.textContent).toContain('Année de création');
    expect(page.textContent).not.toContain('Fondé en');
    expect(page.textContent).not.toContain('Nous rejoindre');
    expect(page.textContent).not.toContain('Découvrir les équipes');
  });

  it('presents a load failure instead of the loading state', async () => {
    context.set(null);
    error.set(new Error('Backend unavailable'));
    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Impossible de charger les informations du club.',
    );
    expect(page.textContent).not.toContain('Chargement des informations du club…');
    expect(page.getElementsByTagName('mg-button')).toHaveLength(1);
  });

  it('reloads the application context from the failure action', async () => {
    context.set(null);
    error.set(new Error('Backend unavailable'));
    await fixture.whenStable();

    const retry = (fixture.nativeElement as HTMLElement).querySelector('button');
    retry?.click();
    await fixture.whenStable();

    expect(retry?.textContent).toContain('Réessayer');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('presents a loading status while the context is pending', async () => {
    context.set(null);
    error.set(undefined);
    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Chargement des informations du club…',
    );
  });
});
