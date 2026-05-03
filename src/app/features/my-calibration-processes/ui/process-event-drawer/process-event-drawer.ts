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
import {
  CalibrationProcessEventType,
  CreateCalibrationProcessEventRequest
} from '../../../my-calibration-items/domain/calibration-process.model';

@Component({
  selector: 'app-process-event-drawer',
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
  templateUrl: './process-event-drawer.html',
  styleUrl: './process-event-drawer.scss'
})
export class ProcessEventDrawerComponent {
  processId = input<number | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly toast = inject(ToastService);

  loading = false;

  eventType = input<CalibrationProcessEventType>(  CalibrationProcessEventType.CalibrationExecuted);

readonly form = this.fb.group({
  occurredAt: [this.getCurrentLocalDateTime(), Validators.required],
  description: ['', [Validators.required, Validators.maxLength(1000)]],
  attachmentUrl: ['', [Validators.maxLength(1000)]]
});

constructor() {
  this.form.patchValue({
    description: this.defaultDescription
  });
}

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid || !this.processId();
  }

  submit(): void {
    const currentProcessId = this.processId();

    if (!currentProcessId) {
      this.toast.error('No se recibió el identificador del proceso.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de registrar el evento.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateCalibrationProcessEventRequest = {
      eventType: this.eventType(),
      description: this.normalizeRequired(raw.description),
      occurredAt: this.toUtcIso(raw.occurredAt),
      attachmentUrl: this.normalize(raw.attachmentUrl)
    };

    this.loading = true;

    this.service.addEvent(currentProcessId, dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo registrar el evento.');
          return;
        }

        this.toast.success('Evento de calibración ejecutada registrado.');
        this.created.emit();
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al registrar el evento.');
      }
    });
  }

get title(): string {
  return this.eventType() === CalibrationProcessEventType.CorrectionRegistered
    ? 'Registrar corrección ejecutada'
    : 'Registrar calibración ejecutada';
}

get description(): string {
  return this.eventType() === CalibrationProcessEventType.CorrectionRegistered
    ? 'Registra el evento que confirma la corrección del proceso observado por CENACE.'
    : 'Registra el evento que confirma que la calibración fue ejecutada conforme a la autorización de CENACE.';
}

get eventLabel(): string {
  return this.eventType() === CalibrationProcessEventType.CorrectionRegistered
    ? 'Corrección registrada'
    : 'Calibración ejecutada';
}

get defaultDescription(): string {
  return this.eventType() === CalibrationProcessEventType.CorrectionRegistered
    ? 'Se corrigió el acta de calibración observada por CENACE.'
    : 'Se ejecutó la calibración del medidor conforme al procedimiento autorizado.';
}

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.form.reset({
      occurredAt: this.getCurrentLocalDateTime(),
      description: this.defaultDescription,
      attachmentUrl: ''
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

  private getCurrentLocalDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    return now.toISOString().slice(0, 16);
  }

  private toUtcIso(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      return new Date().toISOString();
    }

    return new Date(value).toISOString();
  }
}