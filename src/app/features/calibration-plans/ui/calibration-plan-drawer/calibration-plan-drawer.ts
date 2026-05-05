import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationPlansService } from '../../data-access/calibration-plans.service';
import {
  CalibrationPlan,
  CreateCalibrationPlanRequest
} from '../../domain/calibration-plan.model';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';

@Component({
  selector: 'app-calibration-plan-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    DrawerActionsComponent,
    DateFieldComponent
  ],
  templateUrl: './calibration-plan-drawer.html',
  styleUrl: './calibration-plan-drawer.scss'
})
export class CalibrationPlanDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(CalibrationPlansService);
  private readonly toast = inject(ToastService);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<CalibrationPlan>();

  loading = false;

  readonly form = this.fb.group(
    {
      year: [new Date().getFullYear() + 1, [
        Validators.required,
        Validators.min(2020),
        Validators.max(2100)
      ]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    },
    {
      validators: [this.endDateAfterStartDateValidator()]
    }
  );

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid;
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateCalibrationPlanRequest = {
      year: Number(raw.year),
      name: this.normalizeRequired(raw.name),
      description: this.normalize(raw.description),
      startDate: this.normalizeRequired(raw.startDate),
      endDate: this.normalizeRequired(raw.endDate)
    };

    this.loading = true;

    this.service.create(dto).subscribe({
      next: response => {
        if (!response.succeed || !response.result) {
          this.loading = false;
          this.toast.error(response.message ?? 'No se pudo crear el plan.');
          return;
        }

        this.generateItemsAndNavigate(response.result);
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al crear el plan.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private generateItemsAndNavigate(plan: CalibrationPlan): void {
    this.service.generateItems(plan.id).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(
            response.message ??
            'El plan fue creado, pero no se pudieron generar los ítems automáticamente.'
          );

          this.navigateToDetail(plan);
          return;
        }

        this.toast.success(
          `Plan creado correctamente. Ítems generados: ${response.result.generatedItemsCount}. Omitidos: ${response.result.skippedExistingItemsCount}.`
        );

        this.navigateToDetail(plan);
      },
      error: () => {
        this.loading = false;

        this.toast.error(
          'El plan fue creado, pero ocurrió un error al generar los ítems automáticamente.'
        );

        this.navigateToDetail(plan);
      }
    });
  }

  private navigateToDetail(plan: CalibrationPlan): void {
    this.created.emit(plan);
    this.reset();

    this.router.navigate(['/calibration-plans', plan.id]);
  }

  private reset(): void {
    this.form.reset({
      year: new Date().getFullYear() + 1,
      name: '',
      description: '',
      startDate: '',
      endDate: ''
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

  private endDateAfterStartDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = control.get('startDate')?.value;
      const endDate = control.get('endDate')?.value;

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