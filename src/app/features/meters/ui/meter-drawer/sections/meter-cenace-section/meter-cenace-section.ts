import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  InstallationType,
  InstallationTypeLabels,
  MeterRequirementType,
  MeterRequirementTypeLabels
} from '../../../../domain/meter.model';

@Component({
  selector: 'app-meter-cenace-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './meter-cenace-section.html',
  styleUrl: './meter-cenace-section.scss'
})
export class MeterCenaceSectionComponent {
  form = input.required<FormGroup>();

  readonly installationTypes = Object.values(InstallationType)
    .filter(value => typeof value === 'number') as InstallationType[];

  readonly requirementTypes = Object.values(MeterRequirementType)
    .filter(value => typeof value === 'number') as MeterRequirementType[];

  getInstallationTypeLabel(value: InstallationType): string {
    return InstallationTypeLabels[value];
  }

  getRequirementTypeLabel(value: MeterRequirementType): string {
    return MeterRequirementTypeLabels[value];
  }
}