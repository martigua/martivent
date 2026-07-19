import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HeadlessAuthentication, headlessErrorMessage } from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';
import { TextField } from '../../ui/text-field/text-field';

@Component({
  selector: 'app-signup',
  imports: [Button, Card, FormField, FormPage, RouterLink, TextField],
  template: `
    <mg-form-page eyebrow="Rejoindre Martigua" titleText="Créer un compte">
      <mg-card>
        <form (submit)="submit($event)">
          <mg-text-field
            label="Adresse email"
            type="email"
            autocomplete="email"
            [formField]="signupForm.email"
          />
          <mg-text-field
            label="Mot de passe"
            type="password"
            autocomplete="new-password"
            [formField]="signupForm.password"
          />
          <mg-text-field
            label="Confirmer le mot de passe"
            type="password"
            autocomplete="new-password"
            [formField]="signupForm.confirmation"
          />

          @if (signupForm().touched() && signupForm().invalid()) {
            <p class="error" role="alert">Vérifiez l'adresse email et les mots de passe saisis.</p>
          }
          @if (errorMessage()) {
            <p class="error" role="alert">{{ errorMessage() }}</p>
          }

          <mg-button type="submit" [disabled]="pending()">Créer mon compte</mg-button>
        </form>

        <p class="secondary-action">Déjà membre ? <a routerLink="/auth/login">Se connecter</a></p>
      </mg-card>
    </mg-form-page>
  `,
  styleUrl: './auth.scss',
})
export class Signup {
  private readonly authentication = inject(HeadlessAuthentication);
  private readonly router = inject(Router);

  protected readonly pending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly signupModel = signal({ email: '', password: '', confirmation: '' });
  protected readonly signupForm = form(this.signupModel, (fields) => {
    required(fields.email);
    email(fields.email);
    required(fields.password);
    minLength(fields.password, 8);
    required(fields.confirmation);
    validate(fields.confirmation, (context) =>
      context.value() === context.valueOf(fields.password)
        ? undefined
        : { kind: 'passwordMismatch', message: 'Les mots de passe ne correspondent pas.' },
    );
  });

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    this.signupForm().markAsTouched();
    if (!this.signupForm().valid() || this.pending()) {
      return;
    }

    const { email: accountEmail, password } = this.signupModel();
    this.pending.set(true);
    this.errorMessage.set('');
    this.authentication
      .signup({ email: accountEmail, password })
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
}
