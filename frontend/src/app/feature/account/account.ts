import { Component, inject } from '@angular/core';

import { CurrentUser } from '../../core/current-user';
import { Card } from '../../ui/card/card';
import { Tag } from '../../ui/tag/tag';

@Component({
  selector: 'app-account',
  imports: [Card, Tag],
  template: `
    <section class="account">
      <header>
        <p class="eyebrow">Espace personnel</p>
        <h1>Mon compte</h1>
      </header>

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
            <a href="/accounts/email/">Gérer mon adresse email</a>
            <a href="/accounts/password/change/">Changer mon mot de passe</a>
            <a href="/accounts/logout/">Se déconnecter</a>
          </nav>
        </mg-card>
      } @else {
        <mg-card>
          <h2>Retrouvez votre espace personnel.</h2>
          <p>Connectez-vous pour consulter votre compte et son état de validation.</p>
          <nav class="actions" aria-label="Authentification">
            <a href="/accounts/login/">Se connecter</a>
            <a href="/accounts/signup/">Créer un compte</a>
          </nav>
        </mg-card>
      }
    </section>
  `,
  styleUrl: './account.scss',
})
export class Account {
  protected readonly currentUser = inject(CurrentUser);
}
