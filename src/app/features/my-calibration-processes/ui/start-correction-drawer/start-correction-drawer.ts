import { Component, EventEmitter, Output, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import { CalibrationProcess } from '../../../my-calibration-items/domain/calibration-process.model';

@Component({
  selector: 'app-start-correction-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    DrawerActionsComponent
  ],
  templateUrl: './start-correction-drawer.html',
  styleUrl: './start-correction-drawer.scss'
})
export class StartCorrectionDrawerComponent {
  process = input<CalibrationProcess | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() corrected = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly toast = inject(ToastService);

  loading = false;

  readonly form = this.fb.group({
    correctionNotes: [
      'Se corrige documentación observada por CENACE.',
      [Validators.required, Validators.maxLength(1000)]
    ]
  });

  get currentProcess(): CalibrationProcess | null {
    return this.process();
  }

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid || !this.currentProcess;
  }

  submit(): void {
    const current = this.currentProcess;

    if (!current) {
      this.toast.error('No se recibió el proceso.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Ingresa una nota de corrección.');
      return;
    }

    const notes = this.form.controls.correctionNotes.value?.trim();

    if (!notes) {
      this.form.controls.correctionNotes.setErrors({ required: true });
      return;
    }

    this.loading = true;

    this.service.startCorrection(current.id, {
      correctionNotes: notes
    }).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo iniciar la corrección.');
          return;
        }

        this.toast.success('Corrección iniciada correctamente.');
        this.corrected.emit();
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al iniciar la corrección.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.form.reset({
      correctionNotes: 'Se corrige documentación observada por CENACE.'
    });

    this.loading = false;
  }
}