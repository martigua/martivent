import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { CurrentUser } from './core/current-user';
import { routes } from './app.routes';

describe('application routes', () => {
  it('delegates pages to lazy feature routes', () => {
    const homeRoute = routes.find((route) => route.path === '');
    const accountRoute = routes.find((route) => route.path === 'account');

    expect(homeRoute?.loadChildren).toBeTypeOf('function');
    expect(homeRoute?.component).toBeUndefined();
    expect(accountRoute?.loadChildren).toBeTypeOf('function');
    expect(accountRoute?.component).toBeUndefined();
  });

  it('renders the lazy account feature at /account', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: CurrentUser,
          useValue: {
            user: signal(null),
            loaded: signal(true),
          },
        },
      ],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/account');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Mon compte');
  });
});
