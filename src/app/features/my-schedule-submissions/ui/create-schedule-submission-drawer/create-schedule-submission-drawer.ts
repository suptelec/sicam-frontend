import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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

import { CalibrationPlansService } from '../../../calibration-plans/data-access/calibration-plans.service';
import {
  CalibrationPlan,
  CalibrationPlanStatus
} from '../../../calibration-plans/domain/calibration-plan.model';

import { CalibrationScheduleSubmissionsService } from '../../../my-calibration-items/data-access/calibration-schedule-submissions.service';
import { CreateCalibrationScheduleSubmissionRequest } from '../../../my-calibration-items/domain/calibration-schedule-submission.model';

@Component({
  selector: 'app-create-schedule-submission-drawer',
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
  templateUrl: './create-schedule-submission-drawer.html',
  styleUrl: './create-schedule-submission-drawer.scss'
})
export class CreateScheduleSubmissionDrawerComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly plansService = inject(CalibrationPlansService);
  private readonly service = inject(CalibrationScheduleSubmissionsService);
  private readonly toast = inject(ToastService);
  private readonly userScope = inject(UserScopeService);

  loading = false;
  loadingPlans = signal(false);
  plans = signal<CalibrationPlan[]>([]);

readonly form = this.fb.group({
  calibrationPlanId: [null as number | null, Validators.required],
  notes: ['', [Validators.maxLength(1000)]]
});

  constructor() {
    this.loadPublishedPlans();
  }

  get saveDisabled(): boolean {
    return this.loading || this.loadingPlans() || this.form.invalid;
  }

  get pmseCompanyName(): string {
    return this.userScope.pmseCompanyName() ?? 'Empresa PMSE asociada';
  }

  submit(): void {
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

  const dto: CreateCalibrationScheduleSubmissionRequest = {
    calibrationPlanId: Number(raw.calibrationPlanId),
    notes: this.normalize(raw.notes)
  };

    this.loading = true;

    this.service.create(dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo crear el cronograma.');
          return;
        }

        this.toast.success('Cronograma creado correctamente.');
        this.created.emit();
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al crear el cronograma.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private loadPublishedPlans(): void {
    this.loadingPlans.set(true);

    this.plansService.getAll({
      page: 1,
      take: 100,
      filter: `PlanStatus eq ${CalibrationPlanStatus.Published}`,
      orderBy: 'Year desc'
    }).subscribe({
      next: response => {
        this.loadingPlans.set(false);

        if (response.succeed) {
          this.plans.set(response.result ?? []);
        } else {
          this.toast.warning(response.message ?? 'No se pudieron cargar los planes publicados.');
        }
      },
      error: () => {
        this.loadingPlans.set(false);
        this.toast.warning('No se pudieron cargar los planes publicados.');
      }
    });
  }

  private reset(): void {
    this.form.reset({
      calibrationPlanId: null,
      notes: ''
    });

    this.loading = false;
  }

  private normalize(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();

    return normalized ? normalized : null;
  }

}