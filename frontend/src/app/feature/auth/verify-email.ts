import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HeadlessAuthentication, headlessErrorMessage } from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';

@Component({
  selector: 'app-verify-email',
  imports: [Button, Card, FormPage, RouterLink],
  template: `
    <mg-form-page eyebrow="Adresse email" titleText="Confirmer mon adresse">
      <mg-card>
        @if (verified()) {
          <p class="success" role="status">Votre adresse email est confirmée.</p>
          <p class="secondary-action"><a routerLink="/account">Retour à mon compte</a></p>
        } @else if (checking()) {
          <p role="status">Vérification du lien…</p>
        } @else if (!validKey()) {
          <p class="error" role="alert">{{ errorMessage() }}</p>
        } @else {
          <p>Le lien est valide. Confirmez cette adresse pour terminer.</p>
          @if (errorMessage()) {
            <p class="error" role="alert">{{ errorMessage() }}</p>
          }
          <div class="provider">
            <mg-button [disabled]="pending()" (click)="verify()">Confirmer mon adresse</mg-button>
          </div>
        }
      </mg-card>
    </mg-form-page>
  `,
  styleUrl: './auth.scss',
})
export class VerifyEmail implements OnInit {
  private readonly authentication = inject(HeadlessAuthentication);
  private readonly route = inject(ActivatedRoute);
  private readonly key = this.route.snapshot.paramMap.get('key') ?? '';

  protected readonly checking = signal(true);
  protected readonly validKey = signal(false);
  protected readonly pending = signal(false);
  protected readonly verified = signal(false);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.authentication
      .inspectEmailVerification(this.key)
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

  protected verify(): void {
    this.pending.set(true);
    this.errorMessage.set('');
    this.authentication
      .verifyEmail(this.key)
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.verified.set(true);
        },
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }
}
