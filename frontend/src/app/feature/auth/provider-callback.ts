import { Component, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CurrentUser } from '../../core/current-user';
import { Card } from '../../ui/card/card';
import { FormPage } from '../../ui/form-page/form-page';

@Component({
  selector: 'app-provider-callback',
  imports: [Card, FormPage, RouterLink],
  template: `
    <mg-form-page eyebrow="Connexion" titleText="Retour de Google">
      <mg-card>
        @if (error) {
          <p class="error" role="alert">La connexion avec Google n'a pas abouti.</p>
          <p class="secondary-action"><a routerLink="/auth/login">Réessayer</a></p>
        } @else {
          <p role="status">Finalisation de la connexion…</p>
        }
      </mg-card>
    </mg-form-page>
  `,
  styleUrl: './auth.scss',
})
export class ProviderCallback {
  private readonly currentUser = inject(CurrentUser);
  private readonly router = inject(Router);
  protected readonly error = inject(ActivatedRoute).snapshot.queryParamMap.get('error');

  constructor() {
    effect(() => {
      if (!this.error && this.currentUser.loaded()) {
        void this.router.navigateByUrl(this.currentUser.user() ? '/account' : '/auth/login');
      }
    });
  }
}
