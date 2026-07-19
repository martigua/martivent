import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CurrentUser } from '../../core/current-user';
import { HeadlessAuthentication, headlessErrorMessage } from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';
import { Tag } from '../../ui/tag/tag';

@Component({
  selector: 'app-account',
  imports: [Button, Card, FormPage, RouterLink, Tag],
  template: `
    <mg-form-page eyebrow="Espace personnel" titleText="Mon compte">
      @if (!currentUser.loaded()) {
        <p role="status">Chargement de votre compte…</p>
      } @else if (currentUser.user(); as user) {
        <mg-card>
          <dl>
            <div>
              <dt class="text-label">Adresse email</dt>
              <dd>{{ user.email }}</dd>
            </div>
            <div>
              <dt class="text-label">Validation</dt>
              <dd>
                @if (user.is_validated) {
                  <mg-tag tone="success">Compte validé</mg-tag>
                } @else {
                  <mg-tag tone="info">En attente de validation</mg-tag>
                }
              </dd>
            </div>
          </dl>

          @if (!user.is_validated) {
            <p class="explanation">
              Un administrateur doit valider votre compte avant que vous puissiez utiliser les
              fonctionnalités réservées aux membres validés.
            </p>
          }

          <nav class="actions" aria-label="Gestion du compte">
            <a routerLink="/account/email">Gérer mes adresses email</a>
            <a routerLink="/account/password">Changer mon mot de passe</a>
            <mg-button variant="secondary" [disabled]="pending()" (click)="logout()">
              Se déconnecter
            </mg-button>
          </nav>
          @if (errorMessage()) {
            <p class="error" role="alert">{{ errorMessage() }}</p>
          }
        </mg-card>
      } @else {
        <mg-card>
          <h2>Retrouvez votre espace personnel.</h2>
          <p>Connectez-vous pour consulter votre compte et son état de validation.</p>
          <nav class="actions" aria-label="Authentification">
            <a routerLink="/auth/login">Se connecter</a>
            <a routerLink="/auth/signup">Créer un compte</a>
          </nav>
        </mg-card>
      }
    </mg-form-page>
  `,
  styleUrl: './account.scss',
})
export class Account {
  private readonly authentication = inject(HeadlessAuthentication);
  private readonly router = inject(Router);

  protected readonly currentUser = inject(CurrentUser);
  protected readonly pending = signal(false);
  protected readonly errorMessage = signal('');

  protected logout(): void {
    this.pending.set(true);
    this.errorMessage.set('');
    this.authentication
      .logout()
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (error: unknown) => {
          this.errorMessage.set(headlessErrorMessage(error));
        },
      });
  }
}
