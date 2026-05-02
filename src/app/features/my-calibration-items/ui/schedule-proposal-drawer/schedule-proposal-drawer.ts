import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { Observable, of, switchMap, throwError } from 'rxjs';

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

import { AccreditedLaboratoriesService } from '../../../accredited-laboratories/data-access/accredited-laboratories.service';
import { AccreditedLaboratory } from '../../../accredited-laboratories/domain/accredited-laboratory.model';

import { CalibrationPlanItem } from '../../../calibration-plans/domain/calibration-plan.model';

import { CalibrationScheduleSubmissionsService } from '../../data-access/calibration-schedule-submissions.service';
import {
  AddCalibrationScheduleSubmissionItemRequest,
  CalibrationScheduleSubmission,
  CalibrationScheduleSubmissionStatus,
  CreateCalibrationScheduleSubmissionRequest
} from '../../domain/calibration-schedule-submission.model';

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
    DrawerActionsComponent
  ],
  templateUrl: './schedule-proposal-drawer.html',
  styleUrl: './schedule-proposal-drawer.scss'
})
export class ScheduleProposalDrawerComponent {
  item = input<CalibrationPlanItem | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationScheduleSubmissionsService);
  private readonly laboratoriesService = inject(AccreditedLaboratoriesService);
  private readonly toast = inject(ToastService);
  private readonly userScope = inject(UserScopeService);

  loading = false;
  loadingCatalogs = signal(false);
  laboratories = signal<AccreditedLaboratory[]>([]);

  readonly form = this.fb.group(
    {
      scheduledDate: ['', Validators.required],
      accreditedLaboratoryId: [null as number | null, Validators.required],
      notes: ['', [Validators.maxLength(1000)]]
    },
    {
      validators: [this.scheduledDateInsidePlannedRangeValidator()]
    }
  );

  constructor() {
    this.loadLaboratories();
  }

  get currentItem(): CalibrationPlanItem | null {
    return this.item();
  }

  get saveDisabled(): boolean {
    return this.loading || this.loadingCatalogs() || this.form.invalid || !this.currentItem;
  }

  get minDate(): string | null {
    return this.currentItem?.plannedStartDate ?? null;
  }

  get maxDate(): string | null {
    return this.currentItem?.plannedEndDate ?? null;
  }

  getLaboratoryLabel(laboratory: AccreditedLaboratory): string {
    const code = laboratory.accreditationCode
      ? ` · ${laboratory.accreditationCode}`
      : '';

    return `${laboratory.name}${code}`;
  }

submit(): void {
  const currentItem = this.currentItem;

  if (!currentItem) {
    this.toast.error('No se recibió el ítem del plan.');
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

  const raw = this.form.getRawValue();
  const notes = this.normalize(raw.notes);

  const addItemDto = {
    calibrationPlanItemId: currentItem.id,
    accreditedLaboratoryId: Number(raw.accreditedLaboratoryId),
    proposedCalibrationDate: this.normalizeRequired(raw.scheduledDate),
    laboratoryName: null,
    notes
  };

  this.loading = true;

  this.getOrCreateDraftSubmission(
    currentItem.calibrationPlanId,
    pmseCompanyId,
    notes
  ).pipe(
    switchMap(submission => {
      return this.service.addItem(submission.id, addItemDto);
    })
  ).subscribe({
    next: response => {
      this.loading = false;

      if (!response.succeed) {
        this.toast.error(response.message ?? 'No se pudo agregar el ítem al cronograma.');
        return;
      }

      this.toast.success('Propuesta agregada al cronograma.');
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

    this.laboratoriesService.getAll({
      page: 1,
      take: 300,
      orderBy: 'Name asc'
    }).subscribe({
      next: response => {
        this.loadingCatalogs.set(false);

        if (response.succeed) {
          this.laboratories.set(response.result ?? []);
        } else {
          this.toast.warning(response.message ?? 'No se pudieron cargar los laboratorios.');
        }
      },
      error: () => {
        this.loadingCatalogs.set(false);
        this.toast.warning('No se pudieron cargar los laboratorios.');
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

  private normalizeRequired(value: unknown): string {
    return typeof value === 'string'
      ? value.trim()
      : '';
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
      const currentItem = this.currentItem;

      if (
        !scheduledDate ||
        !currentItem?.plannedStartDate ||
        !currentItem?.plannedEndDate
      ) {
        return null;
      }

      const scheduled = new Date(scheduledDate);
      const start = new Date(currentItem.plannedStartDate);
      const end = new Date(currentItem.plannedEndDate);

      if (
        Number.isNaN(scheduled.getTime()) ||
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        return null;
      }

      if (scheduled < start || scheduled > end) {
        return { scheduledDateOutsideRange: true };
      }

      return null;
    };
  }
}