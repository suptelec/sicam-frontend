import { Component, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';

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
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';

import { AccreditedLaboratoriesService } from '../../../accredited-laboratories/data-access/accredited-laboratories.service';
import { AccreditedLaboratory } from '../../../accredited-laboratories/domain/accredited-laboratory.model';

import { CalibrationPlanItem } from '../../../calibration-plans/domain/calibration-plan.model';

import { CalibrationProcessesService } from '../../data-access/calibration-processes.service';
import {
  CalibrationResult,
  CreateCalibrationProcessRequest
} from '../../domain/calibration-process.model';

@Component({
  selector: 'app-start-calibration-process-drawer',
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
  templateUrl: './start-calibration-process-drawer.html',
  styleUrl: './start-calibration-process-drawer.scss'
})
export class StartCalibrationProcessDrawerComponent {
  item = input<CalibrationPlanItem | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<number>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly laboratoriesService = inject(AccreditedLaboratoriesService);
  private readonly toast = inject(ToastService);

  readonly CalibrationResult = CalibrationResult;

  loading = false;
  loadingCatalogs = signal(false);
  laboratories = signal<AccreditedLaboratory[]>([]);

  readonly form = this.fb.group(
  {
    accreditedLaboratoryId: [null as number | null, Validators.required],
    executionDate: ['', Validators.required],
    laboratoryName: ['', [Validators.maxLength(250)]],

    certificateNumber: ['', [Validators.required, Validators.maxLength(100)]],
    certificateIssueDate: ['', Validators.required],
    certificateValidUntil: ['', Validators.required],
    calibrationResult: [CalibrationResult.Approved, Validators.required],

    mainMeterSealAfterCalibration: ['', [Validators.maxLength(100)]],
    terminalBlockSealOneAfterCalibration: ['', [Validators.maxLength(100)]],
    terminalBlockSealTwoAfterCalibration: ['', [Validators.maxLength(100)]],

    notes: ['', [Validators.maxLength(1000)]]
  },
  {
    validators: [this.validUntilAfterIssueDateValidator()]
  }
);

  constructor() {
    this.loadLaboratories();

    effect(() => {
      const currentItem = this.item();

      if (!currentItem?.scheduledDate) return;

      this.form.patchValue(
        {
          executionDate: currentItem.scheduledDate,
          certificateIssueDate: currentItem.scheduledDate
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
    return this.loading ||
      this.loadingCatalogs() ||
      this.form.invalid ||
      !this.currentItem ||
      !this.scheduledDate;
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

    if (!currentItem.scheduledDate) {
      this.toast.error('El ítem no tiene fecha aprobada para iniciar calibración.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de iniciar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateCalibrationProcessRequest = {
      accreditedLaboratoryId: Number(raw.accreditedLaboratoryId),
      executionDate: currentItem.scheduledDate,
      laboratoryName: this.normalize(raw.laboratoryName),
      certificateNumber: this.normalizeRequired(raw.certificateNumber),
      certificateIssueDate: this.normalizeRequired(raw.certificateIssueDate),
      certificateValidUntil: this.normalizeRequired(raw.certificateValidUntil),
      calibrationResult: Number(raw.calibrationResult) as CalibrationResult,
      notes: this.normalize(raw.notes),
      mainMeterSealAfterCalibration: this.normalize(raw.mainMeterSealAfterCalibration),
      terminalBlockSealOneAfterCalibration: this.normalize(raw.terminalBlockSealOneAfterCalibration),
      terminalBlockSealTwoAfterCalibration: this.normalize(raw.terminalBlockSealTwoAfterCalibration)
    };

    this.loading = true;

    this.service.createForPlanItem(currentItem.id, dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo iniciar el proceso de calibración.');
          return;
        }

        this.toast.success('Proceso de calibración iniciado correctamente.');
        this.created.emit(response.result.id);
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al iniciar el proceso de calibración.');
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
      accreditedLaboratoryId: null,
      executionDate: this.currentItem?.scheduledDate ?? '',
      laboratoryName: '',
      certificateNumber: '',
      certificateIssueDate: this.currentItem?.scheduledDate ?? '',
      certificateValidUntil: '',
      calibrationResult: CalibrationResult.Approved,
      mainMeterSealAfterCalibration: '',
      terminalBlockSealOneAfterCalibration: '',
      terminalBlockSealTwoAfterCalibration: '',
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

private validUntilAfterIssueDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const issueDate = control.get('certificateIssueDate')?.value;
    const validUntil = control.get('certificateValidUntil')?.value;

    if (!issueDate || !validUntil) {
      return null;
    }

    const issue = new Date(issueDate);
    const until = new Date(validUntil);

    if (Number.isNaN(issue.getTime()) || Number.isNaN(until.getTime())) {
      return null;
    }

    return until <= issue
      ? { certificateValidUntilBeforeOrEqualIssueDate: true }
      : null;
  };
}
}