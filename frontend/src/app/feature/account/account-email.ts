import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';

import {
  EmailAddress,
  HeadlessAuthentication,
  headlessErrorMessage,
} from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';
import { Tag } from '../../ui/tag/tag';
import { TextField } from '../../ui/text-field/text-field';

@Component({
  selector: 'app-account-email',
  imports: [Button, Card, FormField, FormPage, RouterLink, Tag, TextField],
  template: `
    <mg-form-page eyebrow="Mon compte" titleText="Mes adresses email">
      <mg-card>
        @if (loading()) {
          <p role="status">Chargement des adresses…</p>
        } @else {
          <ul>
            @for (address of addresses(); track address.email) {
              <li>
                <div>
                  <strong>{{ address.email }}</strong>
                  <div class="tags">
                    @if (address.primary) {
                      <mg-tag tone="info">Principale</mg-tag>
                    }
                    @if (address.verified) {
                      <mg-tag tone="success">Vérifiée</mg-tag>
                    }
                  </div>
                </div>
                <div class="actions">
                  @if (!address.primary) {
                    <mg-button variant="secondary" (click)="makePrimary(address.email)">
                      Rendre principale
                    </mg-button>
                    <mg-button variant="secondary" (click)="remove(address.email)">
                      Supprimer
                    </mg-button>
                  }
                  @if (!address.verified) {
                    <mg-button variant="secondary" (click)="resend(address.email)">
                      Renvoyer la vérification
                    </mg-button>
                  }
                </div>
              </li>
            }
          </ul>

          <form (submit)="add($event)">
            <mg-text-field
              label="Ajouter une adresse"
              type="email"
              autocomplete="email"
              [formField]="emailForm.email"
            />
            <mg-button type="submit" [disabled]="pending()">Ajouter</mg-button>
          </form>
        }

        @if (message()) {
          <p class="success" role="status">{{ message() }}</p>
        }
        @if (errorMessage()) {
          <p class="error" role="alert">{{ errorMessage() }}</p>
        }
        <p class="back"><a routerLink="/account">Retour à mon compte</a></p>
      </mg-card>
    </mg-form-page>
  `,
  styleUrl: './account-form.scss',
})
export class AccountEmail implements OnInit {
  private readonly authentication = inject(HeadlessAuthentication);

  protected readonly addresses = signal<EmailAddress[]>([]);
  protected readonly loading = signal(true);
  protected readonly pending = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly emailModel = signal({ email: '' });
  protected readonly emailForm = form(this.emailModel, (fields) => {
    required(fields.email);
    email(fields.email);
  });

  ngOnInit(): void {
    this.authentication
      .getEmailAddresses()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (addresses) => {
          this.addresses.set(addresses);
        },
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }

  protected add(event: SubmitEvent): void {
    event.preventDefault();
    this.emailForm().markAsTouched();
    if (!this.emailForm().valid() || this.pending()) {
      return;
    }
    this.run(
      this.authentication.addEmail(this.emailModel().email),
      'Adresse ajoutée. Consultez votre messagerie pour la vérifier.',
    );
  }

  protected makePrimary(address: string): void {
    this.run(this.authentication.markEmailAsPrimary(address), 'Adresse principale mise à jour.');
  }

  protected resend(address: string): void {
    if (this.pending()) {
      return;
    }
    this.pending.set(true);
    this.message.set('');
    this.errorMessage.set('');
    this.authentication
      .resendEmailVerification(address)
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.message.set('Email de vérification renvoyé.');
        },
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }

  protected remove(address: string): void {
    this.run(this.authentication.deleteEmail(address), 'Adresse supprimée.');
  }

  private run(request: Observable<EmailAddress[]>, message: string): void {
    if (this.pending()) {
      return;
    }
    this.pending.set(true);
    this.message.set('');
    this.errorMessage.set('');
    request
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe({
        next: (addresses) => {
          this.addresses.set(addresses);
          this.emailModel.set({ email: '' });
          this.message.set(message);
        },
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }
}
