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
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Équipes');
    expect(host.textContent).toContain('7');
  });

  it('uses shared typography classes', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('dd')?.classList).toContain('display-md');
    expect(host.querySelector('dt')?.classList).toContain('text-label');
  });
});
