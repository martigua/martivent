import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CurrentUser } from './current-user';

describe('CurrentUser', () => {
  let service: CurrentUser;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CurrentUser);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the session as a resource and evaluates access', async () => {
    TestBed.tick();

    http.expectOne('/api/me/').flush({
      id: 7,
      email: 'coach@martigua.fr',
      capabilities: {
        'accounts.view_user': [{ kind: 'role', name: 'coach', scope: 'u18' }],
      },
      features: { dashboard: 'v2' },
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.user()?.email).toBe('coach@martigua.fr');
    expect(service.hasCapability('accounts.view_user')()).toBe(true);
    expect(service.hasCapability('accounts.change_user')()).toBe(false);
    expect(service.hasFeature('dashboard', 'v2')()).toBe(true);
    expect(service.hasFeature('dashboard', 'legacy')()).toBe(false);
  });

  it('represents an unauthenticated response without failing the public app', async () => {
    TestBed.tick();

    http.expectOne('/api/me/').flush(null, {
      status: 403,
      statusText: 'Forbidden',
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.loaded()).toBe(true);
    expect(service.user()).toBeNull();
  });
});
