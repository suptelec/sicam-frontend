import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { Observable, forkJoin, of, switchMap, throwError } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

import { PmseLaboratoriesService } from '../../../pmse-laboratories/data-access/pmse-laboratories.service';
import { PmseLaboratory } from '../../../pmse-laboratories/domain/pmse-laboratory.model';

import { CalibrationPlanItem } from '../../../calibration-plans/domain/calibration-plan.model';

import { CalibrationScheduleSubmissionsService } from '../../data-access/calibration-schedule-submissions.service';
import {
  AddCalibrationScheduleSubmissionItemRequest,
  CalibrationScheduleSubmission,
  CalibrationScheduleSubmissionStatus
} from '../../domain/calibration-schedule-submission.model';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';

@Component({
  selector: 'app-schedule-proposal-drawer',
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
  templateUrl: './schedule-proposal-drawer.html',
  styleUrl: './schedule-proposal-drawer.scss'
})
export class ScheduleProposalDrawerComponent {
  items = input<CalibrationPlanItem[]>([]);

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationScheduleSubmissionsService);
  private readonly laboratoriesService = inject(PmseLaboratoriesService);
  private readonly toast = inject(ToastService);
  private readonly userScope = inject(UserScopeService);

  loading = false;
  loadingCatalogs = signal(false);
  laboratories = signal<PmseLaboratory[]>([]);

readonly form = this.fb.group(
  {
    scheduledDate: ['', Validators.required],
    accreditedLaboratoryId: [null as number | null, Validators.required],
    notes: ['', [Validators.maxLength(1000)]]
  },
  {
    validators: [
      this.scheduledDateTimeRequiredValidator(),
      this.scheduledDateInsidePlannedRangeValidator()
    ]
  }
);

  constructor() {
    this.loadLaboratories();
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

  get saveDisabled(): boolean {
    return this.loading ||
      this.loadingCatalogs() ||
      this.form.invalid ||
      this.currentItems.length === 0 ||
      !this.hasCommonRange;
  }

  get minDate(): string | null {
    return this.commonStartDate;
  }

  get maxDate(): string | null {
    return this.commonEndDate;
  }

  get commonStartDate(): string | null {
    const validDates = this.currentItems
      .map(item => item.plannedStartDate)
      .filter((date): date is string => !!date);

    if (validDates.length !== this.currentItems.length || validDates.length === 0) {
      return null;
    }

    return validDates.reduce((latest, current) =>
      current > latest ? current : latest
    );
  }

  get commonEndDate(): string | null {
    const validDates = this.currentItems
      .map(item => item.plannedEndDate)
      .filter((date): date is string => !!date);

    if (validDates.length !== this.currentItems.length || validDates.length === 0) {
      return null;
    }

    return validDates.reduce((earliest, current) =>
      current < earliest ? current : earliest
    );
  }

  get hasCommonRange(): boolean {
    const start = this.commonStartDate;
    const end = this.commonEndDate;

    return !!start && !!end && start <= end;
  }

  getLaboratoryLabel(laboratory: PmseLaboratory): string {
    const name = laboratory.accreditedLaboratoryName ?? 'Laboratorio';

    const code = laboratory.accreditationCode
      ? ` · ${laboratory.accreditationCode}`
      : '';

    return `${name}${code}`;
  }

  submit(): void {
    const items = this.currentItems;

    if (items.length === 0) {
      this.toast.error('No se recibieron ítems del plan.');
      return;
    }

    if (!this.hasCommonRange) {
      this.toast.warning('Los ítems seleccionados no tienen un rango planificado común.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const pmseCompanyId = this.userScope.pmseCompanyId();

    if (!pmseCompanyId) {
      this.toast.error('No se pudo resolver la empresa PMSE del usuario.');
      return;
    }

    const planIds = new Set(items.map(item => item.calibrationPlanId));

    if (planIds.size > 1) {
      this.toast.warning('Los ítems seleccionados deben pertenecer al mismo plan anual.');
      return;
    }

const raw = this.form.getRawValue();
const notes = this.normalize(raw.notes);
const proposedCalibrationDate = this.normalizeDateValue(raw.scheduledDate);
const proposedCalibrationTime = this.normalizeTimeValue(raw.scheduledDate);
const accreditedLaboratoryId = Number(raw.accreditedLaboratoryId);

if (!proposedCalibrationDate || !proposedCalibrationTime || proposedCalibrationTime === '00:00:00') {
  this.form.markAllAsTouched();
  this.toast.warning('Selecciona la fecha y hora propuesta.');
  return;
}

    const calibrationPlanId = items[0].calibrationPlanId;

    this.loading = true;

    this.getOrCreateDraftSubmission(
      calibrationPlanId,
      pmseCompanyId,
      notes
    ).pipe(
      switchMap(submission => {
        const requests = items.map(item => {
const dto: AddCalibrationScheduleSubmissionItemRequest = {
  calibrationPlanItemId: item.id,
  accreditedLaboratoryId,
  proposedCalibrationDate,
  proposedCalibrationTime,
  notes
};

          return this.service.addItem(submission.id, dto);
        });

        return forkJoin(requests);
      })
    ).subscribe({
      next: responses => {
        this.loading = false;

        const failed = responses.filter(response => !response.succeed);

        if (failed.length > 0) {
          this.toast.error(
            items.length === 1
              ? failed[0].message ?? 'No se pudo agregar el ítem al cronograma.'
              : `No se pudieron agregar ${failed.length} ítem(s) al cronograma.`
          );
          return;
        }

        const message = items.length === 1
          ? 'Propuesta agregada al cronograma.'
          : `Propuesta agregada al cronograma para ${items.length} ítems.`;

        this.toast.success(message);
        this.submitted.emit();
        this.reset();
      },
      error: error => {
        this.loading = false;
        this.toast.error(error?.message ?? 'Error al guardar la propuesta.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private loadLaboratories(): void {
    this.loadingCatalogs.set(true);

    const pmseFilter = this.userScope.getPmseFilter('PmseCompanyId');

    const filter = [
      'Status eq 1',
      pmseFilter
    ]
      .filter(Boolean)
      .map(value => `(${value})`)
      .join(' and ');

    this.laboratoriesService.getAll({
      page: 1,
      take: 300,
      filter,
      orderBy: 'AccreditedLaboratoryName asc'
    }).subscribe({
      next: response => {
        this.loadingCatalogs.set(false);

        if (response.succeed) {
          this.laboratories.set(response.result ?? []);
          return;
        }

        this.toast.warning(response.message ?? 'No se pudieron cargar los laboratorios contratados.');
      },
      error: () => {
        this.loadingCatalogs.set(false);
        this.toast.warning('No se pudieron cargar los laboratorios contratados.');
      }
    });
  }

  private reset(): void {
    this.form.reset({
      scheduledDate: '',
      accreditedLaboratoryId: null,
      notes: ''
    });

    this.loading = false;
  }

  private normalize(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();

    return normalized ? normalized : null;
  }

private normalizeDateValue(value: unknown): string {
  if (value instanceof Date) {
    return this.formatDate(value);
  }

  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();

  if (!normalized) {
    return '';
  }

  const isoDateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(normalized);

  if (isoDateMatch?.[1]) {
    return isoDateMatch[1];
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return this.formatDate(parsed);
}

private normalizeTimeValue(value: unknown): string | null {
  if (value instanceof Date) {
    return this.formatTime(value);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const timeMatch = /(?:T|\s)(\d{2}):(\d{2})(?::(\d{2}))?/.exec(normalized);

  if (timeMatch) {
    const hours = timeMatch[1];
    const minutes = timeMatch[2];
    const seconds = timeMatch[3] ?? '00';

    return `${hours}:${minutes}:${seconds}`;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return this.formatTime(parsed);
}

private scheduledDateTimeRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const scheduledDate = control.get('scheduledDate')?.value;

    if (!scheduledDate) {
      return null;
    }

    const proposedTime = this.normalizeTimeValue(scheduledDate);

    return !proposedTime || proposedTime === '00:00:00'
      ? { scheduledTimeRequired: true }
      : null;
  };
}

  private getOrCreateDraftSubmission(
    calibrationPlanId: number,
    pmseCompanyId: number,
    notes: string | null
  ): Observable<CalibrationScheduleSubmission> {
    return this.service.findActiveByPlanAndPmse(
      calibrationPlanId,
      pmseCompanyId
    ).pipe(
      switchMap(existingSubmission => {
        if (!existingSubmission) {
          return throwError(() => new Error(
            'Primero debes crear un cronograma borrador desde Mis cronogramas.'
          ));
        }

        if (existingSubmission.submissionStatus !== CalibrationScheduleSubmissionStatus.Draft) {
          return throwError(() => new Error(
            'Ya existe un cronograma activo para este plan, pero no está en borrador.'
          ));
        }

        return of(existingSubmission);
      })
    );
  }

private scheduledDateInsidePlannedRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const scheduledDate = control.get('scheduledDate')?.value;
    const items = this.currentItems;

    if (!scheduledDate || items.length === 0) {
      return null;
    }

    const scheduledDateOnly = this.normalizeDateValue(scheduledDate);

    if (!scheduledDateOnly) {
      return null;
    }

    const isOutsideAnyRange = items.some(item => {
      if (!item.plannedStartDate || !item.plannedEndDate) {
        return false;
      }

      return scheduledDateOnly < item.plannedStartDate ||
             scheduledDateOnly > item.plannedEndDate;
    });

    return isOutsideAnyRange
      ? { scheduledDateOutsideRange: true }
      : null;
  };
}

private formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

private formatTime(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${hours}:${minutes}:00`;
}
  
}