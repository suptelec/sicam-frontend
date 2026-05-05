import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';
import { ToastService } from '../../../../core/services/toast.service';

import {
  CalibrationPlanItem,
  UpdateCalibrationPlanItemPlannedRangeRequest
} from '../../domain/calibration-plan.model';

@Component({
  selector: 'app-calibration-plan-item-range-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    DrawerActionsComponent,
    DateFieldComponent
  ],
  templateUrl: './calibration-plan-item-range-drawer.html',
  styleUrl: './calibration-plan-item-range-drawer.scss'
})
export class CalibrationPlanItemRangeDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  @Input() items: CalibrationPlanItem[] = [];
  @Input() loading = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<UpdateCalibrationPlanItemPlannedRangeRequest>();

  readonly form = this.fb.group(
    {
      plannedStartDate: ['', Validators.required],
      plannedEndDate: ['', Validators.required]
    },
    {
      validators: [this.endDateAfterStartDateValidator()]
    }
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.patchFormFromItems();
    }
  }

  get title(): string {
    return this.items.length === 1
      ? 'Editar rango planificado'
      : 'Editar rango en lote';
  }

  get description(): string {
    if (this.items.length === 1) {
      const item = this.items[0];

      return `Actualiza el rango oficial planificado para el medidor ${item?.meterCode ?? 'seleccionado'}.`;
    }

    return `Actualiza el mismo rango oficial planificado para ${this.items.length} ítems seleccionados.`;
  }

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid || this.items.length === 0;
  }

  submit(): void {
    if (this.form.invalid || this.loading || this.items.length === 0) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa las fechas antes de guardar.');
      return;
    }

    const raw = this.form.getRawValue();

    this.saved.emit({
      plannedStartDate: this.normalizeRequired(raw.plannedStartDate),
      plannedEndDate: this.normalizeRequired(raw.plannedEndDate)
    });
  }

  close(): void {
    if (this.loading) return;

    this.closed.emit();
  }

  private patchFormFromItems(): void {
    const first = this.items[0];

    if (!first) {
      this.form.reset({
        plannedStartDate: '',
        plannedEndDate: ''
      });

      return;
    }

    const firstStartDate = first.plannedStartDate ?? '';
    const firstEndDate = first.plannedEndDate ?? '';

    const allHaveSameStartDate = this.items.every(
      item => (item.plannedStartDate ?? '') === firstStartDate
    );

    const allHaveSameEndDate = this.items.every(
      item => (item.plannedEndDate ?? '') === firstEndDate
    );

    this.form.reset({
      plannedStartDate: allHaveSameStartDate ? firstStartDate : '',
      plannedEndDate: allHaveSameEndDate ? firstEndDate : ''
    });
  }

  private normalizeRequired(value: unknown): string {
    return typeof value === 'string'
      ? value.trim()
      : '';
  }

  private endDateAfterStartDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = control.get('plannedStartDate')?.value;
      const endDate = control.get('plannedEndDate')?.value;

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