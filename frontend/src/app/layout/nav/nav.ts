import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CurrentUser } from '../../core/current-user';

@Component({
  selector: 'mg-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navigation principale">
      <a class="brand" routerLink="/">Martigua</a>
      <div class="links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          Accueil
        </a>
        @if (canViewMembers()) {
          <a routerLink="/" fragment="members">Membres</a>
        }
        @if (hasDashboardV2()) {
          <a routerLink="/" fragment="dashboard">Tableau de bord v2</a>
        }
      </div>
    </nav>
  `,
  styleUrl: './nav.scss',
})
export class Nav {
  private readonly currentUser = inject(CurrentUser);

  protected readonly canViewMembers = this.currentUser.hasCapability('accounts.view_user');
  protected readonly hasDashboardV2 = this.currentUser.hasFeature('dashboard', 'v2');
}
