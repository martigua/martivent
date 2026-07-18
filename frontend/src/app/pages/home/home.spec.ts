import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationContext } from '../../core/application-context';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: ApplicationContext,
          useValue: {
            context: signal({
              club: {
                name: 'Club returned by Django',
                sport: 'Handball',
                location: 'Paris 19e',
                founded_year: 1980,
                team_count: 9,
                licensed_member_count: 250,
                stats: [
                  { label: 'Année de création', value: '1980' },
                  { label: 'Collectifs', value: '9' },
                  { label: 'Membres', value: '250' },
                ],
              },
              authentication: {
                google: false,
              },
            }).asReadonly(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('presents the club foundation', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('Club returned by Django');
    expect(page.textContent).toContain('1980');
    expect(page.textContent).toContain('250');
    expect(page.textContent).toContain('Année de création');
    expect(page.textContent).not.toContain('Fondé en');
  });
});
