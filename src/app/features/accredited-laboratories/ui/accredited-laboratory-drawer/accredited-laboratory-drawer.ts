import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToastService } from '../../../../core/services/toast.service';
import { AccreditedLaboratoriesService } from '../../data-access/accredited-laboratories.service';
import {
  AccreditedLaboratory,
  CreateAccreditedLaboratoryRequest
} from '../../domain/accredited-laboratory.model';

@Component({
  selector: 'app-accredited-laboratory-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './accredited-laboratory-drawer.html',
  styleUrl: './accredited-laboratory-drawer.scss'
})
export class AccreditedLaboratoryDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AccreditedLaboratoriesService);
  private readonly toast = inject(ToastService);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<AccreditedLaboratory>();

  loading = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    accreditationCode: ['', [Validators.required, Validators.maxLength(100)]],
    scope: ['', [Validators.maxLength(500)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(180)]],
    phone: ['', [Validators.maxLength(50)]],
    address: ['', [Validators.maxLength(300)]]
  });

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateAccreditedLaboratoryRequest = {
      name: raw.name.trim(),
      accreditationCode: raw.accreditationCode.trim(),
      scope: this.normalize(raw.scope),
      contactEmail: this.normalize(raw.contactEmail),
      phone: this.normalize(raw.phone),
      address: this.normalize(raw.address)
    };

    this.loading = true;

    this.service.create(dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo crear el laboratorio.');
          return;
        }

        this.toast.success('Laboratorio acreditado creado correctamente.');
        this.created.emit(response.result);
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al crear el laboratorio.');
      }
    });
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.form.reset();
    this.loading = false;
  }

  private normalize(value: string | null | undefined): string | null {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }
}