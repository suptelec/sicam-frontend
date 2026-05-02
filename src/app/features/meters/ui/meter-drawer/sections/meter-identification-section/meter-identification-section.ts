import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface MeterCompanyOption {
  id: number;
  name: string;
  externalCode?: string;
}

@Component({
  selector: 'app-meter-identification-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './meter-identification-section.html',
  styleUrl: './meter-identification-section.scss'
})
export class MeterIdentificationSectionComponent {
  form = input.required<FormGroup>();
  companies = input.required<MeterCompanyOption[]>();

  showCompanySelect = input<boolean>(true);
  companyName = input<string | null>(null);
}