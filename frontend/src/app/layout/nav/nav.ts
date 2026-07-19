import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';

import { CurrentUser } from '../../core/current-user';
import { HeadlessAuthentication } from '../../core/headless-authentication';
import { Button } from '../../ui/button/button';

@Component({
  selector: 'mg-nav',
  imports: [Button, RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navigation principale">
      <a class="brand display-sm" routerLink="/">Martigua</a>
      <mg-button
        class="menu-toggle"
        variant="link"
        [ariaExpanded]="menuOpen()"
        ariaControls="main-navigation-links"
        (click)="toggleMenu()"
      >
        Menu
      </mg-button>
      <div id="main-navigation-links" class="links text-small" [class.open]="menuOpen()">
        <a
          routerLink="/"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMenu()"
        >
          Accueil
        </a>
        <div class="session-actions">
          @if (currentUser.loaded()) {
            @if (currentUser.user()) {
              <a
                routerLink="/account"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                (click)="closeMenu()"
              >
                Mon compte
              </a>
              <mg-button variant="link" [disabled]="pending()" (click)="logout()">
                Se déconnecter
              </mg-button>
            } @else {
              <a
                routerLink="/auth/login"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                (click)="closeMenu()"
              >
                Se connecter
              </a>
              <a
                routerLink="/auth/signup"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                (click)="closeMenu()"
              >
                Créer un compte
              </a>
            }
          }
        </div>
      </div>
    </nav>
  `,
  styleUrl: './nav.scss',
})
export class Nav {
  private readonly authentication = inject(HeadlessAuthentication);
  private readonly router = inject(Router);

  protected readonly currentUser = inject(CurrentUser);
  protected readonly pending = signal(false);
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.pending.set(true);
    this.authentication
      .logout()
      .pipe(
        finalize(() => {
          this.pending.set(false);
        }),
      )
      .subscribe(() => {
        this.closeMenu();
        void this.router.navigateByUrl('/');
      });
  }
}
