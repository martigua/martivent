import { httpResource } from '@angular/common/http';
import { Service, computed } from '@angular/core';

export interface ClubContext {
  name: string;
  sport: string;
  location: string;
  founded_year: number;
  team_count: number;
  licensed_member_count: number;
  stats: readonly {
    label: string;
    value: string;
  }[];
}

export interface ApplicationContextData {
  club: ClubContext;
  authentication: {
    google: boolean;
  };
}

@Service()
export class ApplicationContext {
  private readonly contextResource = httpResource<ApplicationContextData>(() => '/api/context/');

  readonly context = computed(() =>
    this.contextResource.hasValue() ? this.contextResource.value() : null,
  );
  readonly loading = this.contextResource.isLoading;
  readonly error = this.contextResource.error;

  reload(): void {
    this.contextResource.reload();
  }
}
