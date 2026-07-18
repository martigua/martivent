import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
      </div>
    </nav>
  `,
  styleUrl: './nav.scss',
})
export class Nav {}
