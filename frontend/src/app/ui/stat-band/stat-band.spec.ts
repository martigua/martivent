import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatBand } from './stat-band';

describe('StatBand', () => {
  let fixture: ComponentFixture<StatBand>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatBand],
    }).compileComponents();

    fixture = TestBed.createComponent(StatBand);
    fixture.componentRef.setInput('stats', [{ label: 'Équipes', value: '7' }]);
    await fixture.whenStable();
  });

  it('renders each statistic in semantic definition-list order', () => {
    const host = fixture.nativeElement as HTMLElement;
    const term = host.querySelector('dt');
    const description = host.querySelector('dd');

    expect(host.textContent).toContain('Équipes');
    expect(host.textContent).toContain('7');
    expect(term?.nextElementSibling).toBe(description);
  });

  it('presents each value before its label visually', () => {
    const host = fixture.nativeElement as HTMLElement;
    const term = host.querySelector('dt');
    const description = host.querySelector('dd');
    if (!term || !description) {
      throw new Error('Statistic term and description not found');
    }

    expect(getComputedStyle(description).order).toBe('1');
    expect(getComputedStyle(term).order).toBe('2');
  });

  it('uses shared typography classes', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('dd')?.classList).toContain('display-md');
    expect(host.querySelector('dt')?.classList).toContain('text-label');
  });
});
