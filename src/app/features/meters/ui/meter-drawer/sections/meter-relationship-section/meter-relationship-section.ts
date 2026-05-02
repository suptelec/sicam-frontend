import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-meter-relationship-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './meter-relationship-section.html',
  styleUrl: './meter-relationship-section.scss'
})
export class MeterRelationshipSectionComponent {
  form = input.required<FormGroup>();

  get isPrincipal(): boolean {
    return !!this.form().get('isPrincipal')?.value;
  }
}