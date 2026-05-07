import { Component, EventEmitter, Output, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';

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
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    DrawerActionsComponent,
    DateFieldComponent
  ],
  templateUrl: './process-event-drawer.html',
  styleUrl: './process-event-drawer.scss'
})
export class ProcessEventDrawerComponent {
  processId = input<number | null>(null);

  /**
   * Opcional.
   * Si el componente padre conoce la fecha autorizada/programada,
   * puede pasarla para bloquear el calendario a ese día.
   *
   * Ejemplo:
   * <app-process-event-drawer
   *   [processId]="processId"
   *   [scheduledDate]="scheduledDate"
   * />
   */
  scheduledDate = input<string | Date | null>(null);

  eventType = input<CalibrationProcessEventType>(
    CalibrationProcessEventType.CalibrationExecuted
  );

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly toast = inject(ToastService);

  loading = false;

  readonly form = this.fb.group({
    occurredAt: [this.getInitialOccurredAtValue(), Validators.required],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    attachmentUrl: ['', [Validators.maxLength(1000)]]
  });

  constructor() {
    this.form.patchValue({
      description: this.defaultDescription
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

  get eventHelpText(): string {
    return this.eventType() === CalibrationProcessEventType.CorrectionRegistered
      ? 'Este evento confirma que el PMSE corrigió la información observada por CENACE.'
      : 'Este evento es obligatorio para enviar el proceso a revisión.';
  }

  get defaultDescription(): string {
    return this.eventType() === CalibrationProcessEventType.CorrectionRegistered
      ? 'Se corrigió el acta de calibración observada por CENACE.'
      : 'Se ejecutó la calibración del medidor conforme al procedimiento autorizado.';
  }

  get submitText(): string {
    return this.eventType() === CalibrationProcessEventType.CorrectionRegistered
      ? 'Registrar corrección'
      : 'Registrar evento';
  }

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid || !this.processId();
  }

  get occurredAtDateLimit(): string | null {
    const value = this.toDateControlValue(this.scheduledDate());

    return value || null;
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

        this.toast.success(this.successMessage);
        this.created.emit();
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al registrar el evento.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private get successMessage(): string {
    return this.eventType() === CalibrationProcessEventType.CorrectionRegistered
      ? 'Evento de corrección registrado.'
      : 'Evento de calibración ejecutada registrado.';
  }

  private reset(): void {
    this.form.reset({
      occurredAt: this.getInitialOccurredAtValue(),
      description: this.defaultDescription,
      attachmentUrl: ''
    });

    this.loading = false;
  }

  private getInitialOccurredAtValue(): string {
    const scheduledDateValue = this.toDateControlValue(this.scheduledDate());

    if (scheduledDateValue) {
      const currentTime = this.getCurrentLocalTime();

      return `${scheduledDateValue}T${currentTime}`;
    }

    return this.getCurrentLocalDateTime();
  }

  private getCurrentLocalDateTime(): string {
    const now = new Date();

    return this.formatLocalDateTime(now);
  }

  private getCurrentLocalTime(): string {
    const now = new Date();

    return `${this.formatNumber(now.getHours())}:${this.formatNumber(now.getMinutes())}`;
  }

  private formatLocalDateTime(value: Date): string {
    const year = value.getFullYear();
    const month = this.formatNumber(value.getMonth() + 1);
    const day = this.formatNumber(value.getDate());
    const hour = this.formatNumber(value.getHours());
    const minute = this.formatNumber(value.getMinutes());

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private formatNumber(value: number): string {
    return `${value}`.padStart(2, '0');
  }

  private toDateControlValue(value: string | Date | null | undefined): string {
    if (!value) return '';

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return '';

      const year = value.getFullYear();
      const month = this.formatNumber(value.getMonth() + 1);
      const day = this.formatNumber(value.getDate());

      return `${year}-${month}-${day}`;
    }

    const normalized = value.trim();

    return normalized ? normalized.substring(0, 10) : '';
  }

  private toUtcIso(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      return new Date().toISOString();
    }

    const normalized = value.trim();

    if (!normalized.includes('T')) {
      return new Date(`${normalized}T00:00`).toISOString();
    }

    return new Date(normalized).toISOString();
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
}