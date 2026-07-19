import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';

import { TextField } from './text-field';

@Component({
  imports: [FormField, TextField],
  template: `<mg-text-field label="Adresse email" [formField]="emailForm.email" />`,
})
class TestHost {
  readonly model = signal({ email: '' });
  readonly emailForm = form(this.model, (fields) => {
    required(fields.email);
  });
}

describe('TextField', () => {
  let fixture: ComponentFixture<TextField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextField],
    }).compileComponents();
    fixture = TestBed.createComponent(TextField);
    fixture.componentRef.setInput('label', 'Adresse email');
    await fixture.whenStable();
  });

  it('updates its value and exposes the configured native input behavior', async () => {
    fixture.componentRef.setInput('type', 'email');
    fixture.componentRef.setInput('autocomplete', 'email');
    await fixture.whenStable();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    if (!input) {
      throw new Error('Text field input not found');
    }
    input.value = 'member@martigua.fr';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.value()).toBe('member@martigua.fr');
    expect(input.autocomplete).toBe('email');
  });

  it('works as a Signal Forms control', async () => {
    const hostFixture = TestBed.createComponent(TestHost);
    await hostFixture.whenStable();
    const input = (hostFixture.nativeElement as HTMLElement).querySelector('input');
    if (!input) {
      throw new Error('Text field input not found');
    }
    input.value = 'member@martigua.fr';
    input.dispatchEvent(new Event('input'));

    expect(hostFixture.componentInstance.model().email).toBe('member@martigua.fr');
  });
});
