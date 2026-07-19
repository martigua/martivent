import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormPage } from './form-page';

describe('FormPage', () => {
  let fixture: ComponentFixture<FormPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormPage],
    }).compileComponents();
    fixture = TestBed.createComponent(FormPage);
    fixture.componentRef.setInput('eyebrow', 'Espace personnel');
    fixture.componentRef.setInput('titleText', 'Créer un compte');
    await fixture.whenStable();
  });

  it('owns the shared form-page heading and content layout', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.eyebrow')?.textContent).toContain('Espace personnel');
    expect(page.querySelector('h1')?.textContent).toContain('Créer un compte');
    expect(page.querySelector('.content')).toBeTruthy();
  });
});
