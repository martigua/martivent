import { httpResource } from '@angular/common/http';
import { Service, Signal, computed } from '@angular/core';

export interface CapabilitySource {
  kind: 'direct' | 'role' | 'group' | 'superuser';
  name: string;
  scope: string | null;
}

export interface SessionUser {
  id: number;
  email: string;
  is_validated: boolean;
  capabilities: Record<string, CapabilitySource[]>;
  features: Record<string, string>;
}

@Service()
export class CurrentUser {
  private readonly userResource = httpResource<SessionUser>(() => '/api/me/');

  readonly user = computed(() => (this.userResource.hasValue() ? this.userResource.value() : null));
  readonly loaded = computed(() => !this.userResource.isLoading());

  reload(): void {
    this.userResource.reload();
  }

  hasCapability(capability: string): Signal<boolean> {
    return computed(() => capability in (this.user()?.capabilities ?? {}));
  }

  hasFeature(feature: string, variant: string): Signal<boolean> {
    return computed(() => this.user()?.features[feature] === variant);
  }
}
