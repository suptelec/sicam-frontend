import { Component, EventEmitter, Output, effect, inject, input, signal  } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';

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
  items = input<CalibrationPlanItem[]>([]);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(WorkAuthorizationsService);
  private readonly toast = inject(ToastService);

  showAllSelectedItems = signal(false);

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
      const scheduledDate = this.commonScheduledDate;

      if (!scheduledDate) return;

      this.form.patchValue(
        {
          requestedWorkDate: scheduledDate
        },
        { emitEvent: false }
      );
    });
  }


get selectedItemsPreviewLimit(): number {
  return 3;
}

get visibleSelectedItems(): CalibrationPlanItem[] {
  return this.showAllSelectedItems()
    ? this.currentItems
    : this.currentItems.slice(0, this.selectedItemsPreviewLimit);
}

get hiddenSelectedItemsCount(): number {
  return Math.max(this.currentItems.length - this.visibleSelectedItems.length, 0);
}

toggleSelectedItemsVisibility(): void {
  this.showAllSelectedItems.update(value => !value);
}

  get currentItems(): CalibrationPlanItem[] {
    return this.items() ?? [];
  }

  get firstItem(): CalibrationPlanItem | null {
    return this.currentItems[0] ?? null;
  }

  get isBulkMode(): boolean {
    return this.currentItems.length > 1;
  }

  get commonScheduledDate(): string | null {
    const dates = this.currentItems
      .map(item => item.scheduledDate)
      .filter((date): date is string => !!date);

    if (dates.length !== this.currentItems.length || dates.length === 0) {
      return null;
    }

    const uniqueDates = new Set(dates);

    return uniqueDates.size === 1
      ? dates[0]
      : null;
  }

  get scheduledDate(): string | null {
    return this.commonScheduledDate;
  }

  get hasCommonScheduledDate(): boolean {
    return !!this.commonScheduledDate;
  }

  get saveDisabled(): boolean {
    return this.loading ||
      this.form.invalid ||
      this.currentItems.length === 0 ||
      !this.hasCommonScheduledDate;
  }

  submit(): void {
    const items = this.currentItems;

    if (items.length === 0) {
      this.toast.error('No se recibieron ítems del plan.');
      return;
    }

    if (!this.commonScheduledDate) {
      this.toast.warning('Los ítems seleccionados deben tener la misma fecha aprobada.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de enviar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateCalibrationWorkAuthorizationRequest = {
      requestedWorkDate: this.commonScheduledDate,
      requestedStartTime: this.normalizeTime(raw.requestedStartTime),
      requestedEndTime: this.normalizeTime(raw.requestedEndTime),
      requestReason: this.normalizeRequired(raw.requestReason),
      requestDocumentUrl: this.normalizeRequired(raw.requestDocumentUrl)
    };

    this.loading = true;

    const requests = items.map(item =>
      this.service.createForPlanItem(item.id, dto)
    );

    forkJoin(requests).subscribe({
      next: responses => {
        this.loading = false;

        const failed = responses.filter(response => !response.succeed);

        if (failed.length > 0) {
          this.toast.error(
            items.length === 1
              ? failed[0].message ?? 'No se pudo solicitar la autorización.'
              : `No se pudieron solicitar ${failed.length} autorización(es).`
          );
          return;
        }

        const message = items.length === 1
          ? 'Solicitud de autorización enviada correctamente.'
          : `Solicitudes de autorización enviadas correctamente para ${items.length} ítems.`;

        this.toast.success(message);
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
      requestedWorkDate: this.commonScheduledDate ?? '',
      requestedStartTime: '',
      requestedEndTime: '',
      requestReason: '',
      requestDocumentUrl: ''
    });

    this.showAllSelectedItems.set(false);
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