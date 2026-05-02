import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-meter-technical-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './meter-technical-section.html',
  styleUrl: './meter-technical-section.scss'
})
export class MeterTechnicalSectionComponent {
  form = input.required<FormGroup>();
}