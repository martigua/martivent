import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tag } from './tag';

describe('Tag', () => {
  let component: Tag;
  let fixture: ComponentFixture<Tag>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tag],
    }).compileComponents();

    fixture = TestBed.createComponent(Tag);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('applies its requested tone', async () => {
    fixture.componentRef.setInput('tone', 'success');
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const tag = host.querySelector('span');

    expect(tag?.classList).toContain('success');
    expect(tag?.classList).toContain('text-label');
  });
});
