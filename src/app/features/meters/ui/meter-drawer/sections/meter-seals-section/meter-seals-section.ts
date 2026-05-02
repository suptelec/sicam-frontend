import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-meter-seals-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './meter-seals-section.html',
  styleUrl: './meter-seals-section.scss'
})
export class MeterSealsSectionComponent {
  form = input.required<FormGroup>();
}