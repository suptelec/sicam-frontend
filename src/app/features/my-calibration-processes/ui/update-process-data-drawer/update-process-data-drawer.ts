import { Component, EventEmitter, Output, effect, inject, input } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import {
  CalibrationProcess,
  CalibrationProcessStatus,
  CalibrationResult,
  UpdateCalibrationProcessDataRequest
} from '../../../my-calibration-items/domain/calibration-process.model';

@Component({
  selector: 'app-update-process-data-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    DrawerActionsComponent,
    DateFieldComponent
  ],
  templateUrl: './update-process-data-drawer.html',
  styleUrl: './update-process-data-drawer.scss'
})
export class UpdateProcessDataDrawerComponent {
  process = input<CalibrationProcess | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly toast = inject(ToastService);

  readonly CalibrationResult = CalibrationResult;

  loading = false;

readonly form = this.fb.group(
  {
    certificateNumber: ['', [Validators.required, Validators.maxLength(100)]],
    certificateIssueDate: [this.todayAsIsoDate(), Validators.required],
    certificateValidUntil: [this.todayAsIsoDate(), Validators.required],
    calibrationResult: [CalibrationResult.Approved, Validators.required],
    notes: ['', [Validators.maxLength(1000)]]
  },
  {
    validators: [this.validUntilAfterIssueDateValidator()]
  }
);

  constructor() {
    effect(() => {
      const current = this.process();

      if (!current) {
        this.reset();
        return;
      }

this.form.patchValue(
  {
    certificateNumber: current.certificateNumber ?? '',
    certificateIssueDate: this.normalizeDateOrToday(current.certificateIssueDate),
    certificateValidUntil: this.normalizeDateOrToday(current.certificateValidUntil),
    calibrationResult: current.calibrationResult ?? CalibrationResult.Approved,
    notes: current.notes ?? ''
  },
  { emitEvent: false }
);
    });
  }

  get currentProcess(): CalibrationProcess | null {
    return this.process();
  }

  get canEdit(): boolean {
    const status = Number(this.currentProcess?.processStatus);

    return status === CalibrationProcessStatus.InProcess ||
      status === CalibrationProcessStatus.Corrected;
  }

  get saveDisabled(): boolean {
    return this.loading ||
      this.form.invalid ||
      !this.currentProcess ||
      !this.canEdit;
  }

  submit(): void {
    const current = this.currentProcess;

    if (!current) {
      this.toast.error('No se recibió el proceso.');
      return;
    }

    if (!this.canEdit) {
      this.toast.warning('Solo puedes actualizar datos finales cuando el proceso está en proceso o en corrección.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: UpdateCalibrationProcessDataRequest = {
      certificateNumber: this.normalizeRequired(raw.certificateNumber),
      certificateIssueDate: this.normalizeRequired(raw.certificateIssueDate),
      certificateValidUntil: this.normalizeRequired(raw.certificateValidUntil),
      calibrationResult: Number(raw.calibrationResult) as CalibrationResult,
      notes: this.normalize(raw.notes)
    };

    this.loading = true;

    this.service.updateData(current.id, dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudieron actualizar los datos finales.');
          return;
        }

        this.toast.success('Datos finales de calibración actualizados correctamente.');
        this.updated.emit();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al actualizar los datos finales.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.closed.emit();
  }

private reset(): void {
  this.form.reset({
    certificateNumber: '',
    certificateIssueDate: this.todayAsIsoDate(),
    certificateValidUntil: this.todayAsIsoDate(),
    calibrationResult: CalibrationResult.Approved,
    notes: ''
  });

  this.loading = false;
}

  private normalize(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();

    return normalized ? normalized : null;
  }

  private normalizeRequired(value: unknown): string {
    return typeof value === 'string'
      ? value.trim()
      : '';
  }

  private validUntilAfterIssueDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const issueDate = control.get('certificateIssueDate')?.value;
      const validUntil = control.get('certificateValidUntil')?.value;

      if (!issueDate || !validUntil) return null;

      const issue = new Date(issueDate);
      const valid = new Date(validUntil);

      if (Number.isNaN(issue.getTime()) || Number.isNaN(valid.getTime())) {
        return null;
      }

      return valid < issue
        ? { validUntilBeforeIssueDate: true }
        : null;
    };
  }
private normalizeDateOrToday(value: string | null | undefined): string {
  if (!value) {
    return this.todayAsIsoDate();
  }

  const normalized = value.substring(0, 10);

  if (
    normalized.startsWith('0001-01-01') ||
    normalized.startsWith('1901-01-01') ||
    normalized.startsWith('0001-1-1')
  ) {
    return this.todayAsIsoDate();
  }

  const year = Number(normalized.substring(0, 4));

  if (!year || year < 2000) {
    return this.todayAsIsoDate();
  }

  return normalized;
}

private todayAsIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
}