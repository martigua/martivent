import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, form, minLength, required, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HeadlessAuthentication, headlessErrorMessage } from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';
import { TextField } from '../../ui/text-field/text-field';

@Component({
  selector: 'app-password-reset',
  imports: [Button, Card, FormField, FormPage, RouterLink, TextField],
  template: `
    <mg-form-page eyebrow="Récupération" titleText="Nouveau mot de passe">
      <mg-card>
        @if (checking()) {
          <p role="status">Vérification du lien…</p>
        } @else if (!validKey()) {
          <p class="error" role="alert">{{ errorMessage() }}</p>
          <p class="secondary-action">
            <a routerLink="/auth/password">Demander un nouveau lien</a>
          </p>
        } @else {
          <form (submit)="submit($event)">
            <mg-text-field
              label="Nouveau mot de passe"
              type="password"
              autocomplete="new-password"
              [formField]="resetForm.password"
            />
            <mg-text-field
              label="Confirmer le mot de passe"
              type="password"
              autocomplete="new-password"
              [formField]="resetForm.confirmation"
            />
            @if (errorMessage()) {
              <p class="error" role="alert">{{ errorMessage() }}</p>
            }
            <mg-button type="submit" [disabled]="pending()">Changer le mot de passe</mg-button>
          </form>
        }
      </mg-card>
    </mg-form-page>
  `,
  styleUrl: './auth.scss',
})
export class PasswordReset implements OnInit {
  private readonly authentication = inject(HeadlessAuthentication);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly key = this.route.snapshot.paramMap.get('key') ?? '';

  protected readonly checking = signal(true);
  protected readonly validKey = signal(false);
  protected readonly pending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly resetModel = signal({ password: '', confirmation: '' });
  protected readonly resetForm = form(this.resetModel, (fields) => {
    required(fields.password);
    minLength(fields.password, 8);
    required(fields.confirmation);
    validate(fields.confirmation, (context) =>
      context.value() === context.valueOf(fields.password)
        ? undefined
        : { kind: 'passwordMismatch', message: 'Les mots de passe ne correspondent pas.' },
    );
  });

  ngOnInit(): void {
    this.authentication
      .inspectPasswordReset(this.key)
      .pipe(
        finalize(() => {
          this.checking.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.validKey.set(true);
        },
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    this.resetForm().markAsTouched();
    if (!this.resetForm().valid() || this.pending()) {
      return;
    }

    this.pending.set(true);
    this.errorMessage.set('');
    this.authentication
      .resetPassword(this.key, this.resetModel().password)
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/auth/login'),
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }
}
