import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { CurrentUser } from './current-user';
import { HeadlessAuthentication } from './headless-authentication';

describe('HeadlessAuthentication', () => {
  let authentication: HeadlessAuthentication;
  let http: HttpTestingController;
  let reloadCount: number;

  beforeEach(() => {
    reloadCount = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CurrentUser,
          useValue: {
            reload: () => reloadCount++,
          },
        },
      ],
    });
    authentication = TestBed.inject(HeadlessAuthentication);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('logs in through the Allauth browser endpoint and reloads app identity', () => {
    authentication.login({ email: 'member@martigua.fr', password: 'secret' }).subscribe(() => {
      expect(reloadCount).toBe(1);
    });

    const request = http.expectOne('/_allauth/browser/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'member@martigua.fr',
      password: 'secret',
    });
    request.flush({ status: 200 });
  });

  it('treats Allauth unauthenticated logout state as success', () => {
    authentication.logout().subscribe(() => {
      expect(reloadCount).toBe(1);
    });

    const request = http.expectOne('/_allauth/browser/v1/auth/session');
    expect(request.request.method).toBe('DELETE');
    request.flush(
      { status: 401 },
      {
        status: 401,
        statusText: 'Unauthorized',
      },
    );
  });

  it('uses key headers when inspecting reset and verification links', () => {
    authentication.inspectPasswordReset('reset-key').subscribe();
    authentication.inspectEmailVerification('email-key').subscribe();

    expect(
      http
        .expectOne('/_allauth/browser/v1/auth/password/reset')
        .request.headers.get('X-Password-Reset-Key'),
    ).toBe('reset-key');
    expect(
      http
        .expectOne('/_allauth/browser/v1/auth/email/verify')
        .request.headers.get('X-Email-Verification-Key'),
    ).toBe('email-key');
  });

  it('manages account email addresses through one typed endpoint', () => {
    authentication.addEmail('second@martigua.fr').subscribe();
    authentication.markEmailAsPrimary('second@martigua.fr').subscribe();
    authentication.resendEmailVerification('second@martigua.fr').subscribe();
    authentication.deleteEmail('old@martigua.fr').subscribe();

    const requests = http.match('/_allauth/browser/v1/account/email');
    expect(requests.map((request) => request.request.method)).toEqual([
      'POST',
      'PATCH',
      'PUT',
      'DELETE',
    ]);
    expect(requests[1].request.body).toEqual({
      email: 'second@martigua.fr',
      primary: true,
    });
    requests.forEach((request) => {
      request.flush({ status: 200, data: [] });
    });
  });

  it('submits social login as a CSRF-protected full-page form', () => {
    document.cookie = 'csrftoken=csrf-value';
    const submit = vi
      .spyOn(HTMLFormElement.prototype, 'submit')
      .mockImplementation(() => undefined);

    authentication.redirectToProvider('google');

    const form = document.body.querySelector<HTMLFormElement>(
      'form[action$="/_allauth/browser/v1/auth/provider/redirect"]',
    );
    if (!form) {
      throw new Error('Provider redirect form not found');
    }
    const fields = new FormData(form);

    expect(form.method).toBe('post');
    expect(fields.get('provider')).toBe('google');
    expect(fields.get('process')).toBe('login');
    expect(fields.get('csrfmiddlewaretoken')).toBe('csrf-value');
    const callbackUrl = fields.get('callback_url');
    if (typeof callbackUrl !== 'string') {
      throw new Error('Provider callback URL not found');
    }
    expect(callbackUrl).toMatch(/\/auth\/provider\/callback$/);
    expect(submit).toHaveBeenCalledOnce();

    form.remove();
    document.cookie = 'csrftoken=; max-age=0';
    submit.mockRestore();
  });
});
