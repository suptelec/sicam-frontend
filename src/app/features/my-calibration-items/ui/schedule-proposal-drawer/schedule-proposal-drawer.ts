import {
  Component,
  EventEmitter,
  Output,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
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

import { AccreditedLaboratoriesService } from '../../../accredited-laboratories/data-access/accredited-laboratories.service';
import {
  AccreditedLaboratory,
  EntityStatus
} from '../../../accredited-laboratories/domain/accredited-laboratory.model';

import { CalibrationPlanItem } from '../../../calibration-plans/domain/calibration-plan.model';

import { CalibrationScheduleSubmissionsService } from '../../data-access/calibration-schedule-submissions.service';
import {
  AddCalibrationScheduleSubmissionItemRequest,
  CalibrationScheduleSubmission,
  CalibrationScheduleSubmissionStatus
} from '../../domain/calibration-schedule-submission.model';

import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';

import { SystemSettingsService } from '../../../system-settings/data-access/system-settings.service';
import { RegulatoryRulesSettings } from '../../../system-settings/domain/system-settings.model';

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
  private readonly laboratoriesService = inject(AccreditedLaboratoriesService);
  private readonly systemSettingsService = inject(SystemSettingsService);
  private readonly toast = inject(ToastService);
  private readonly userScope = inject(UserScopeService);

  loading = false;

  loadingCatalogs = signal(false);
  loadingRegulatoryRules = signal(false);

  laboratories = signal<AccreditedLaboratory[]>([]);
  regulatoryRules = signal<RegulatoryRulesSettings | null>(null);

  readonly form = this.fb.group(
    {
      scheduledDate: ['', Validators.required],
      accreditedLaboratoryId: [null as number | null, Validators.required],
      notes: ['', [Validators.maxLength(1000)]]
    },
    {
      validators: [
        this.scheduledDateTimeRequiredValidator(),
        this.scheduledDateInsidePlannedRangeValidator(),
        this.scheduledDateRegulatoryLeadDaysValidator()
      ]
    }
  );

  constructor() {
    this.loadLaboratories();
    this.loadRegulatoryRules();

    effect(() => {
      this.items();
      this.regulatoryRules();

      this.form.updateValueAndValidity({
        emitEvent: false
      });
    });
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
      this.loadingRegulatoryRules() ||
      this.form.invalid ||
      this.currentItems.length === 0 ||
      !this.hasCommonRange ||
      this.hasRegulatoryRangeConflict ||
      this.laboratories().length === 0;
  }

  get minDate(): string | null {
    return this.maxDateValue(
      this.commonStartDate,
      this.minimumAllowedScheduleDate
    );
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

  get regulatoryLeadDaysEnabled(): boolean {
    return !!this.regulatoryRules()?.enforceScheduleSubmissionLeadDays;
  }

  get regulatoryLeadDays(): number {
    return this.regulatoryRules()?.scheduleSubmissionLeadDays ?? 8;
  }

  get minimumAllowedScheduleDate(): string | null {
    if (!this.regulatoryLeadDaysEnabled) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() + this.regulatoryLeadDays);

    return this.formatDate(today);
  }

  get hasRegulatoryRangeConflict(): boolean {
    const minimumAllowed = this.minimumAllowedScheduleDate;
    const commonEnd = this.commonEndDate;

    return !!minimumAllowed && !!commonEnd && minimumAllowed > commonEnd;
  }

  get plannedRangeLabel(): string {
    if (!this.hasCommonRange) {
      return 'No disponible';
    }

    return `${this.formatDisplayDate(this.commonStartDate)} - ${this.formatDisplayDate(this.commonEndDate)}`;
  }

  get minimumAllowedScheduleDateLabel(): string {
    if (!this.regulatoryLeadDaysEnabled || !this.minimumAllowedScheduleDate) {
      return 'No aplica';
    }

    return this.formatDisplayDate(this.minimumAllowedScheduleDate);
  }

  get validProposalRangeLabel(): string {
    if (!this.hasCommonRange) {
      return 'No disponible';
    }

    if (this.hasRegulatoryRangeConflict) {
      return 'Sin fechas disponibles';
    }

    return `${this.formatDisplayDate(this.minDate)} - ${this.formatDisplayDate(this.maxDate)}`;
  }

  get regulatoryHelpText(): string | null {
    if (!this.regulatoryLeadDaysEnabled || !this.minimumAllowedScheduleDate) {
      return null;
    }

    return `La fecha propuesta debe ser igual o posterior a ${this.minimumAllowedScheduleDateLabel}, porque el cronograma debe enviarse con ${this.regulatoryLeadDays} día(s) de anticipación.`;
  }

  getLaboratoryLabel(laboratory: AccreditedLaboratory): string {
    const name = laboratory.name?.trim() || 'Laboratorio';

    const code = laboratory.accreditationCode?.trim()
      ? ` · ${laboratory.accreditationCode.trim()}`
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

    if (this.hasRegulatoryRangeConflict) {
      this.toast.warning(
        'El rango planificado termina antes de la primera fecha disponible según la anticipación regulatoria.'
      );
      return;
    }

    if (this.form.invalid || this.loading || this.loadingCatalogs() || this.loadingRegulatoryRules()) {
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

    const accreditedLaboratoryId = Number(raw.accreditedLaboratoryId);
    const proposedCalibrationDate = this.extractDateValue(raw.scheduledDate);
    const proposedCalibrationTime = this.extractTimeValue(raw.scheduledDate);
    const notes = this.normalize(raw.notes);

    if (!accreditedLaboratoryId) {
      this.toast.warning('Selecciona un laboratorio acreditado.');
      return;
    }

    if (!proposedCalibrationDate || !proposedCalibrationTime) {
      this.toast.warning('Selecciona la fecha y hora propuesta de calibración.');
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

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  private loadLaboratories(): void {
    this.loadingCatalogs.set(true);

    this.laboratoriesService.getAll({
      page: 1,
      take: 500,
      filter: `Status eq ${EntityStatus.Active}`,
      orderBy: 'Name asc'
    }).subscribe({
      next: response => {
        this.loadingCatalogs.set(false);

        if (response.succeed) {
          this.laboratories.set(response.result ?? []);
          return;
        }

        this.toast.warning(response.message ?? 'No se pudieron cargar los laboratorios acreditados.');
      },
      error: () => {
        this.loadingCatalogs.set(false);
        this.toast.warning('No se pudieron cargar los laboratorios acreditados.');
      }
    });
  }

  private loadRegulatoryRules(): void {
    this.loadingRegulatoryRules.set(true);

    this.systemSettingsService.getRegulatoryRules().subscribe({
      next: response => {
        this.loadingRegulatoryRules.set(false);

        if (!response.succeed || !response.result) {
          this.toast.warning(
            response.message ?? 'No se pudieron cargar las reglas regulatorias.'
          );
          return;
        }

        this.regulatoryRules.set(response.result);
        this.form.updateValueAndValidity();
      },
      error: () => {
        this.loadingRegulatoryRules.set(false);
        this.toast.warning('No se pudieron cargar las reglas regulatorias.');
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

  private extractDateValue(value: unknown): string {
    const normalized = this.normalizeDateTimeValue(value);

    const match = /^(\d{4}-\d{2}-\d{2})/.exec(normalized);

    return match?.[1] ?? '';
  }

  private extractTimeValue(value: unknown): string | null {
    const normalized = this.normalizeDateTimeValue(value);

    const match = /(?:T|\s)(\d{2}:\d{2})(?::\d{2})?/.exec(normalized);

    return match?.[1] ?? null;
  }

  private normalizeDateTimeValue(value: unknown): string {
    if (value instanceof Date) {
      return `${this.formatDate(value)}T${this.formatTime(value)}`;
    }

    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    const hour = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');

    return `${hour}:${minute}`;
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

  private scheduledDateTimeRequiredValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const scheduledDate = control.get('scheduledDate')?.value;

      if (!scheduledDate) {
        return null;
      }

      const date = this.extractDateValue(scheduledDate);
      const time = this.extractTimeValue(scheduledDate);

      return date && time
        ? null
        : { scheduledTimeRequired: true };
    };
  }

  private scheduledDateInsidePlannedRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const scheduledDate = control.get('scheduledDate')?.value;

      if (!scheduledDate) {
        return null;
      }

      const date = this.extractDateValue(scheduledDate);

      if (!date) {
        return null;
      }

      const start = this.commonStartDate;
      const end = this.commonEndDate;

      if (!start || !end) {
        return null;
      }

      return date < start || date > end
        ? { scheduledDateOutsideRange: true }
        : null;
    };
  }

  private scheduledDateRegulatoryLeadDaysValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const scheduledDate = control.get('scheduledDate')?.value;

      if (!scheduledDate || !this.regulatoryLeadDaysEnabled) {
        return null;
      }

      const minimumAllowedDate = this.minimumAllowedScheduleDate;

      if (!minimumAllowedDate) {
        return null;
      }

      const date = this.extractDateValue(scheduledDate);

      if (!date) {
        return null;
      }

      return date < minimumAllowedDate
        ? { scheduledDateBeforeRegulatoryLeadDays: true }
        : null;
    };
  }

  private maxDateValue(
    first: string | null,
    second: string | null
  ): string | null {
    if (!first) {
      return second;
    }

    if (!second) {
      return first;
    }

    return first > second ? first : second;
  }
}