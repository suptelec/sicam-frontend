import { Component, EventEmitter, Output, inject, input } from '@angular/core';
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
import { DateChangeRequestsService } from '../../data-access/date-change-requests.service';
import { CreateCalibrationDateChangeRequest } from '../../domain/date-change-request.model';

@Component({
  selector: 'app-date-change-request-drawer',
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
  templateUrl: './date-change-request-drawer.html',
  styleUrl: './date-change-request-drawer.scss'
})
export class DateChangeRequestDrawerComponent {
  item = input<CalibrationPlanItem | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DateChangeRequestsService);
  private readonly toast = inject(ToastService);

  loading = false;

  readonly form = this.fb.group(
    {
      requestedPlannedStartDate: ['', Validators.required],
      requestedPlannedEndDate: ['', Validators.required],
      reason: ['', [Validators.required, Validators.maxLength(1000)]]
    },
    {
      validators: [this.endDateAfterStartDateValidator()]
    }
  );

  get currentItem(): CalibrationPlanItem | null {
    return this.item();
  }

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid || !this.currentItem;
  }

  submit(): void {
    const currentItem = this.currentItem;

    if (!currentItem) {
      this.toast.error('No se recibió el ítem del plan.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de enviar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateCalibrationDateChangeRequest = {
      requestedPlannedStartDate: this.normalizeRequired(raw.requestedPlannedStartDate),
      requestedPlannedEndDate: this.normalizeRequired(raw.requestedPlannedEndDate),
      reason: this.normalizeRequired(raw.reason)
    };

    this.loading = true;

    this.service.createForPlanItem(currentItem.id, dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo solicitar el cambio de rango.');
          return;
        }

        this.toast.success('Solicitud de cambio de rango enviada correctamente.');
        this.created.emit();
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al solicitar el cambio de rango.');
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
      requestedPlannedStartDate: '',
      requestedPlannedEndDate: '',
      reason: ''
    });

    this.loading = false;
  }

  private normalizeRequired(value: unknown): string {
    return typeof value === 'string'
      ? value.trim()
      : '';
  }

  private endDateAfterStartDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = control.get('requestedPlannedStartDate')?.value;
      const endDate = control.get('requestedPlannedEndDate')?.value;

      if (!startDate || !endDate) return null;

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }

      return end < start
        ? { endDateBeforeStartDate: true }
        : null;
    };
  }
}