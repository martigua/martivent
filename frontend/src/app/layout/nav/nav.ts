import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CurrentUser } from '../../core/current-user';

@Component({
  selector: 'mg-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navigation principale">
      <a class="brand display-sm" routerLink="/">Martigua</a>
      <div class="links text-small">
        <a
          routerLink="/"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          Accueil
        </a>
        @if (currentUser.loaded()) {
          @if (currentUser.user()) {
            <a routerLink="/account" routerLinkActive="active" ariaCurrentWhenActive="page">
              Mon compte
            </a>
            <a href="/accounts/logout/">Se déconnecter</a>
          } @else {
            <a href="/accounts/login/">Se connecter</a>
            <a class="signup" href="/accounts/signup/">Créer un compte</a>
          }
        }
      </div>
    </nav>
  `,
  styleUrl: './nav.scss',
})
export class Nav {
  protected readonly currentUser = inject(CurrentUser);
}
