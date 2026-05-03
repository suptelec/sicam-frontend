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
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationPlanItem } from '../../../calibration-plans/domain/calibration-plan.model';
import { WorkAuthorizationsService } from '../../data-access/work-authorizations.service';
import { CreateCalibrationWorkAuthorizationRequest } from '../../domain/work-authorization.model';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';

@Component({
  selector: 'app-work-authorization-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    DrawerActionsComponent,
    DateFieldComponent
  ],
  templateUrl: './work-authorization-drawer.html',
  styleUrl: './work-authorization-drawer.scss'
})
export class WorkAuthorizationDrawerComponent {
  item = input<CalibrationPlanItem | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(WorkAuthorizationsService);
  private readonly toast = inject(ToastService);

  loading = false;

  readonly form = this.fb.group(
    {
      requestedWorkDate: ['', Validators.required],
      requestedStartTime: ['', Validators.required],
      requestedEndTime: ['', Validators.required],
      requestReason: ['', [Validators.required, Validators.maxLength(1000)]],
      requestDocumentUrl: ['', [Validators.required, Validators.maxLength(1000)]]
    },
    {
      validators: [this.endTimeAfterStartTimeValidator()]
    }
  );

  constructor() {
    effect(() => {
      const currentItem = this.item();

      if (!currentItem?.scheduledDate) return;

      this.form.patchValue(
        {
          requestedWorkDate: currentItem.scheduledDate
        },
        { emitEvent: false }
      );
    });
  }

  get currentItem(): CalibrationPlanItem | null {
    return this.item();
  }

  get scheduledDate(): string | null {
    return this.currentItem?.scheduledDate ?? null;
  }

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid || !this.currentItem || !this.scheduledDate;
  }

  submit(): void {
    const currentItem = this.currentItem;

    if (!currentItem) {
      this.toast.error('No se recibió el ítem del plan.');
      return;
    }

    if (!currentItem.scheduledDate) {
      this.toast.error('El ítem no tiene fecha aprobada para solicitar autorización.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de enviar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateCalibrationWorkAuthorizationRequest = {
      requestedWorkDate: currentItem.scheduledDate,
      requestedStartTime: this.normalizeTime(raw.requestedStartTime),
      requestedEndTime: this.normalizeTime(raw.requestedEndTime),
      requestReason: this.normalizeRequired(raw.requestReason),
      requestDocumentUrl: this.normalizeRequired(raw.requestDocumentUrl)
    };

    this.loading = true;

    this.service.createForPlanItem(currentItem.id, dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo solicitar la autorización.');
          return;
        }

        this.toast.success('Solicitud de autorización enviada correctamente.');
        this.created.emit();
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al solicitar la autorización.');
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
      requestedWorkDate: this.currentItem?.scheduledDate ?? '',
      requestedStartTime: '',
      requestedEndTime: '',
      requestReason: '',
      requestDocumentUrl: ''
    });

    this.loading = false;
  }

  private normalizeRequired(value: unknown): string {
    return typeof value === 'string'
      ? value.trim()
      : '';
  }

  private normalizeTime(value: unknown): string {
    if (typeof value !== 'string') return '';

    const normalized = value.trim();

    if (!normalized) return '';

    return normalized.length === 5
      ? `${normalized}:00`
      : normalized;
  }

  private endTimeAfterStartTimeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startTime = control.get('requestedStartTime')?.value;
      const endTime = control.get('requestedEndTime')?.value;

      if (!startTime || !endTime) return null;

      return String(endTime) <= String(startTime)
        ? { endTimeBeforeOrEqualStartTime: true }
        : null;
    };
  }
}