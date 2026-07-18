import { Component, computed, inject } from '@angular/core';

import { ApplicationContext } from '../../core/application-context';
import { Button } from '../../ui/button/button';
import { Card } from '../../ui/card/card';
import { SectionHeader } from '../../ui/section-header/section-header';
import { StatBand } from '../../ui/stat-band/stat-band';
import { Tag } from '../../ui/tag/tag';

@Component({
  selector: 'app-home',
  imports: [Button, Card, SectionHeader, StatBand, Tag],
  template: `
    <section class="hero">
      @if (club(); as club) {
        <mg-section-header [eyebrow]="eyebrow()" [titleText]="club.name" [lead]="lead()" />
        <div class="actions">
          <mg-button>Nous rejoindre</mg-button>
          <mg-button variant="secondary">Découvrir les équipes</mg-button>
        </div>
      } @else {
        <p role="status">Chargement des informations du club…</p>
      }
    </section>

    @if (stats().length) {
      <mg-stat-band [stats]="stats()" />
    }

    <section class="foundation" id="dashboard">
      <mg-card>
        <mg-tag tone="success">Fondation technique</mg-tag>
        <h2>Prête pour les prochains terrains de jeu.</h2>
        <p>
          Cette première page valide le design system, les variantes de fonctionnalités et les
          droits transmis par Django.
        </p>
      </mg-card>
    </section>
  `,
  styleUrl: './home.scss',
})
export class Home {
  private readonly applicationContext = inject(ApplicationContext);

  protected readonly club = computed(() => this.applicationContext.context()?.club ?? null);
  protected readonly eyebrow = computed(() => {
    const club = this.club();
    return club ? `${club.sport} · ${club.location}` : '';
  });
  protected readonly lead = computed(() => {
    const club = this.club();
    return club ? `Un club ouvert, exigeant et convivial, fondé en ${club.founded_year}.` : '';
  });
  protected readonly stats = computed(() => this.club()?.stats ?? []);
}
