import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApplicationContext } from '../../core/application-context';
import { HeadlessAuthentication, headlessErrorMessage } from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';
import { TextField } from '../../ui/text-field/text-field';

@Component({
  selector: 'app-login',
  imports: [Button, Card, FormField, FormPage, RouterLink, TextField],
  template: `
    <mg-form-page eyebrow="Espace personnel" titleText="Se connecter">
      <mg-card>
        <form (submit)="submit($event)">
          <mg-text-field
            label="Adresse email"
            type="email"
            autocomplete="email"
            [formField]="loginForm.email"
          />
          <mg-text-field
            label="Mot de passe"
            type="password"
            autocomplete="current-password"
            [formField]="loginForm.password"
          />

          @if (errorMessage()) {
            <p class="error" role="alert">{{ errorMessage() }}</p>
          }

          <mg-button type="submit" [disabled]="pending()">Se connecter</mg-button>
        </form>

        <p class="secondary-action">
          <a routerLink="/auth/password">Mot de passe oublié ?</a>
        </p>
        <p class="secondary-action">
          Pas encore de compte ? <a routerLink="/auth/signup">Créer un compte</a>
        </p>

        @if (applicationContext.context()?.authentication?.google) {
          <div class="provider">
            <mg-button variant="secondary" (click)="signInWithGoogle()">
              Continuer avec Google
            </mg-button>
          </div>
        }
      </mg-card>
    </mg-form-page>
  `,
  styleUrl: './auth.scss',
})
export class Login {
  private readonly authentication = inject(HeadlessAuthentication);
  private readonly router = inject(Router);

  protected readonly applicationContext = inject(ApplicationContext);
  protected readonly pending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly loginModel = signal({ email: '', password: '' });
  protected readonly loginForm = form(this.loginModel, (fields) => {
    required(fields.email, { message: "L'adresse email est obligatoire." });
    email(fields.email, { message: "L'adresse email n'est pas valide." });
    required(fields.password, { message: 'Le mot de passe est obligatoire.' });
  });

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    this.loginForm().markAsTouched();
    if (!this.loginForm().valid() || this.pending()) {
      return;
    }

    this.pending.set(true);
    this.errorMessage.set('');
    this.authentication
      .login(this.loginModel())
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/account'),
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }

  protected signInWithGoogle(): void {
    this.authentication.redirectToProvider('google');
  }
}
