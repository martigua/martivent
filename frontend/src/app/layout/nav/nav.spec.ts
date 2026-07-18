import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { CurrentUser } from '../../core/current-user';
import { Nav } from './nav';

describe('Nav', () => {
  let component: Nav;
  let fixture: ComponentFixture<Nav>;
  const canViewMembers = signal(false);
  const hasDashboardV2 = signal(false);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Nav],
      providers: [
        provideRouter([]),
        {
          provide: CurrentUser,
          useValue: {
            hasCapability: () => canViewMembers.asReadonly(),
            hasFeature: () => hasDashboardV2.asReadonly(),
          },
        },
      ],
    }).compileComponents();

    canViewMembers.set(false);
    hasDashboardV2.set(false);
    fixture = TestBed.createComponent(Nav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows capability and feature navigation only when granted', async () => {
    const nav = fixture.nativeElement as HTMLElement;

    expect(nav.textContent).not.toContain('Membres');
    expect(nav.textContent).not.toContain('Tableau de bord v2');

    canViewMembers.set(true);
    hasDashboardV2.set(true);
    await fixture.whenStable();

    expect(nav.textContent).toContain('Membres');
    expect(nav.textContent).toContain('Tableau de bord v2');
  });

  it('uses shared typography classes', () => {
    const nav = fixture.nativeElement as HTMLElement;

    expect(nav.querySelector('.brand')?.classList).toContain('display-sm');
    expect(nav.querySelector('.links')?.classList).toContain('text-small');
  });
});
