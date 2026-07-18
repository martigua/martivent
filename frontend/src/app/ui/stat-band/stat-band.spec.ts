import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatBand } from './stat-band';

describe('StatBand', () => {
  let component: StatBand;
  let fixture: ComponentFixture<StatBand>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatBand],
    }).compileComponents();

    fixture = TestBed.createComponent(StatBand);
    fixture.componentRef.setInput('stats', [{ label: 'Équipes', value: '7' }]);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders each statistic', () => {
    expect(fixture.nativeElement.textContent).toContain('Équipes');
    expect(fixture.nativeElement.textContent).toContain('7');
  });
});
