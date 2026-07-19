import { Component, inject, signal } from '@angular/core';
import { FormField, form, minLength, required, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HeadlessAuthentication, headlessErrorMessage } from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';
import { TextField } from '../../ui/text-field/text-field';

@Component({
  selector: 'app-account-password',
  imports: [Button, Card, FormField, FormPage, RouterLink, TextField],
  template: `
    <mg-form-page eyebrow="Mon compte" titleText="Changer mon mot de passe">
      <mg-card>
        @if (changed()) {
          <p class="success" role="status">Votre mot de passe a été changé.</p>
        } @else {
          <form (submit)="submit($event)">
            <mg-text-field
              label="Mot de passe actuel"
              type="password"
              autocomplete="current-password"
              [formField]="passwordForm.currentPassword"
            />
            <mg-text-field
              label="Nouveau mot de passe"
              type="password"
              autocomplete="new-password"
              [formField]="passwordForm.newPassword"
            />
            <mg-text-field
              label="Confirmer le nouveau mot de passe"
              type="password"
              autocomplete="new-password"
              [formField]="passwordForm.confirmation"
            />
            @if (errorMessage()) {
              <p class="error" role="alert">{{ errorMessage() }}</p>
            }
            <mg-button type="submit" [disabled]="pending()">Changer le mot de passe</mg-button>
          </form>
        }

        <p class="back"><a routerLink="/account">Retour à mon compte</a></p>
      </mg-card>
    </mg-form-page>
  `,
  styleUrl: './account-form.scss',
})
export class AccountPassword {
  private readonly authentication = inject(HeadlessAuthentication);

  protected readonly pending = signal(false);
  protected readonly changed = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly passwordModel = signal({
    currentPassword: '',
    newPassword: '',
    confirmation: '',
  });
  protected readonly passwordForm = form(this.passwordModel, (fields) => {
    required(fields.currentPassword);
    required(fields.newPassword);
    minLength(fields.newPassword, 8);
    required(fields.confirmation);
    validate(fields.confirmation, (context) =>
      context.value() === context.valueOf(fields.newPassword)
        ? undefined
        : { kind: 'passwordMismatch', message: 'Les mots de passe ne correspondent pas.' },
    );
  });

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    this.passwordForm().markAsTouched();
    if (!this.passwordForm().valid() || this.pending()) {
      return;
    }

    const model = this.passwordModel();
    this.pending.set(true);
    this.errorMessage.set('');
    this.authentication
      .changePassword(model.currentPassword, model.newPassword)
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.changed.set(true);
        },
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }
}
