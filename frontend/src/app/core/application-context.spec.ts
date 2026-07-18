import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApplicationContext } from './application-context';

describe('ApplicationContext', () => {
  let service: ApplicationContext;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApplicationContext);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads backend-owned club and authentication context as a resource', async () => {
    TestBed.tick();

    http.expectOne('/api/context/').flush({
      club: {
        name: 'Martigua Sports Culture Loisirs',
        sport: 'Handball',
        location: 'Paris 19e',
        founded_year: 1978,
        team_count: 7,
        licensed_member_count: 230,
        stats: [
          { label: 'Fondé en', value: '1978' },
          { label: 'Équipes', value: '7' },
          { label: 'Licencié·es', value: '230' },
        ],
      },
      authentication: {
        google: false,
      },
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.context()?.club.founded_year).toBe(1978);
    expect(service.context()?.club.team_count).toBe(7);
    expect(service.context()?.authentication.google).toBe(false);
  });
});
