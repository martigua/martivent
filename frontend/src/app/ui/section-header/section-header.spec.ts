import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionHeader } from './section-header';

describe('SectionHeader', () => {
  let component: SectionHeader;
  let fixture: ComponentFixture<SectionHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionHeader);
    fixture.componentRef.setInput('titleText', 'Martigua');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders its title and optional lead', async () => {
    fixture.componentRef.setInput('lead', 'Handball Paris 19e');
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h1')?.textContent).toContain('Martigua');
    expect(host.textContent).toContain('Handball Paris 19e');
  });
});
