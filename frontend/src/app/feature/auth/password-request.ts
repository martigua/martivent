import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HeadlessAuthentication, headlessErrorMessage } from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';
import { TextField } from '../../ui/text-field/text-field';

@Component({
  selector: 'app-password-request',
  imports: [Button, Card, FormField, FormPage, RouterLink, TextField],
  template: `
    <mg-form-page eyebrow="Récupération" titleText="Mot de passe oublié">
      <mg-card>
        @if (sent()) {
          <p class="success" role="status">
            Si cette adresse correspond à un compte, un lien vient d'être envoyé.
          </p>
        } @else {
          <form (submit)="submit($event)">
            <mg-text-field
              label="Adresse email"
              type="email"
              autocomplete="email"
              [formField]="requestForm.email"
            />
            @if (errorMessage()) {
              <p class="error" role="alert">{{ errorMessage() }}</p>
            }
            <mg-button type="submit" [disabled]="pending()">Envoyer le lien</mg-button>
          </form>
        }

        <p class="secondary-action"><a routerLink="/auth/login">Retour à la connexion</a></p>
      </mg-card>
    </mg-form-page>
  `,
  styleUrl: './auth.scss',
})
export class PasswordRequest {
  private readonly authentication = inject(HeadlessAuthentication);

  protected readonly pending = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly requestModel = signal({ email: '' });
  protected readonly requestForm = form(this.requestModel, (fields) => {
    required(fields.email);
    email(fields.email);
  });

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    this.requestForm().markAsTouched();
    if (!this.requestForm().valid() || this.pending()) {
      return;
    }

    this.pending.set(true);
    this.authentication
      .requestPasswordReset(this.requestModel().email)
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.sent.set(true);
        },
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }
}
