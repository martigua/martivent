import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';

import { CurrentUser } from './current-user';

const HEADLESS_BASE_URL = '/_allauth/browser/v1';

interface HeadlessError {
  message: string;
  code: string;
  param?: string;
}

export interface EmailAddress {
  email: string;
  verified: boolean;
  primary: boolean;
}

interface HeadlessResponse<T = never> {
  status: number;
  data?: T;
  errors?: HeadlessError[];
}

@Service()
export class HeadlessAuthentication {
  private readonly http = inject(HttpClient);
  private readonly currentUser = inject(CurrentUser);
  private readonly document = inject(DOCUMENT);

  login(credentials: { email: string; password: string }): Observable<void> {
    return this.authMutation(
      this.http.post<HeadlessResponse>(`${HEADLESS_BASE_URL}/auth/login`, credentials),
    );
  }

  signup(account: { email: string; password: string }): Observable<void> {
    return this.authMutation(
      this.http.post<HeadlessResponse>(`${HEADLESS_BASE_URL}/auth/signup`, account),
    );
  }

  logout(): Observable<void> {
    return this.authMutation(
      this.http.delete<HeadlessResponse>(`${HEADLESS_BASE_URL}/auth/session`).pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            return of(undefined);
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.toVoid(
      this.http.post<HeadlessResponse>(`${HEADLESS_BASE_URL}/auth/password/request`, { email }),
    );
  }

  inspectPasswordReset(key: string): Observable<void> {
    return this.toVoid(
      this.http.get<HeadlessResponse>(`${HEADLESS_BASE_URL}/auth/password/reset`, {
        headers: new HttpHeaders({ 'X-Password-Reset-Key': key }),
      }),
    );
  }

  resetPassword(key: string, password: string): Observable<void> {
    return this.authMutation(
      this.http.post<HeadlessResponse>(`${HEADLESS_BASE_URL}/auth/password/reset`, {
        key,
        password,
      }),
    );
  }

  inspectEmailVerification(key: string): Observable<void> {
    return this.toVoid(
      this.http.get<HeadlessResponse>(`${HEADLESS_BASE_URL}/auth/email/verify`, {
        headers: new HttpHeaders({ 'X-Email-Verification-Key': key }),
      }),
    );
  }

  verifyEmail(key: string): Observable<void> {
    return this.authMutation(
      this.http.post<HeadlessResponse>(`${HEADLESS_BASE_URL}/auth/email/verify`, { key }),
    );
  }

  getEmailAddresses(): Observable<EmailAddress[]> {
    return this.http
      .get<HeadlessResponse<EmailAddress[]>>(`${HEADLESS_BASE_URL}/account/email`)
      .pipe(map((response) => response.data ?? []));
  }

  addEmail(email: string): Observable<EmailAddress[]> {
    return this.emailMutation('POST', { email });
  }

  resendEmailVerification(email: string): Observable<void> {
    return this.toVoid(
      this.http.put<HeadlessResponse>(`${HEADLESS_BASE_URL}/account/email`, { email }),
    );
  }

  markEmailAsPrimary(email: string): Observable<EmailAddress[]> {
    return this.emailMutation('PATCH', { email, primary: true });
  }

  deleteEmail(email: string): Observable<EmailAddress[]> {
    return this.emailMutation('DELETE', { email });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.authMutation(
      this.http.post<HeadlessResponse>(`${HEADLESS_BASE_URL}/account/password/change`, {
        current_password: currentPassword,
        new_password: newPassword,
      }),
    );
  }

  redirectToProvider(provider: string): void {
    const form = this.document.createElement('form');
    form.method = 'POST';
    form.action = `${HEADLESS_BASE_URL}/auth/provider/redirect`;

    const callbackUrl = new URL('/auth/provider/callback', this.document.baseURI).toString();
    const fields = {
      provider,
      callback_url: callbackUrl,
      process: 'login',
      csrfmiddlewaretoken: this.readCookie('csrftoken'),
    };

    for (const [name, value] of Object.entries(fields)) {
      const input = this.document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.append(input);
    }

    this.document.body.append(form);
    form.submit();
  }

  private emailMutation(
    method: 'POST' | 'PATCH' | 'DELETE',
    body: { email: string; primary?: boolean },
  ): Observable<EmailAddress[]> {
    return this.http
      .request<HeadlessResponse<EmailAddress[]>>(method, `${HEADLESS_BASE_URL}/account/email`, {
        body,
      })
      .pipe(
        map((response) => response.data ?? []),
        tap(() => {
          this.currentUser.reload();
        }),
      );
  }

  private authMutation(request: Observable<unknown>): Observable<void> {
    return this.toVoid(request).pipe(
      tap(() => {
        this.currentUser.reload();
      }),
    );
  }

  private toVoid(request: Observable<unknown>): Observable<void> {
    return request.pipe(map(() => undefined));
  }

  private readCookie(name: string): string {
    const prefix = `${name}=`;
    const cookie = this.document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : '';
  }
}

export function headlessErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const response = error.error as HeadlessResponse | null;
    const message = response?.errors?.[0]?.message;
    if (message) {
      return message;
    }
    if (error.status === 429) {
      return 'Trop de tentatives. Réessayez dans quelques instants.';
    }
  }
  return 'Une erreur est survenue. Réessayez.';
}
