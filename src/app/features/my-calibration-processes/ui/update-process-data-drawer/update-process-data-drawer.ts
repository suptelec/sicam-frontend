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

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import {
  CalibrationProcess,
  CalibrationProcessStatus,
  CalibrationResult,
  UpdateCalibrationProcessDataRequest
} from '../../../my-calibration-items/domain/calibration-process.model';

@Component({
  selector: 'app-update-process-data-drawer',
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
  templateUrl: './update-process-data-drawer.html',
  styleUrl: './update-process-data-drawer.scss'
})
export class UpdateProcessDataDrawerComponent {
  process = input<CalibrationProcess | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

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
      const current = this.process();

      if (!current) return;

      this.form.patchValue(
        {
          accreditedLaboratoryId: current.accreditedLaboratoryId ?? null,
          executionDate: current.executionDate ?? '',
          laboratoryName: current.laboratoryName ?? '',

          certificateNumber: current.certificateNumber ?? '',
          certificateIssueDate: current.certificateIssueDate ?? '',
          certificateValidUntil: current.certificateValidUntil ?? '',
          calibrationResult: Number(current.calibrationResult) as CalibrationResult,

          mainMeterSealAfterCalibration: current.mainMeterSealAfterCalibration ?? '',
          terminalBlockSealOneAfterCalibration: current.terminalBlockSealOneAfterCalibration ?? '',
          terminalBlockSealTwoAfterCalibration: current.terminalBlockSealTwoAfterCalibration ?? '',

          notes: current.notes ?? ''
        },
        { emitEvent: false }
      );
    });
  }

  get currentProcess(): CalibrationProcess | null {
    return this.process();
  }

  get canEdit(): boolean {
    const status = Number(this.currentProcess?.processStatus);

    return status === CalibrationProcessStatus.InProcess ||
      status === CalibrationProcessStatus.Corrected;
  }

  get saveDisabled(): boolean {
    return this.loading ||
      this.loadingCatalogs() ||
      this.form.invalid ||
      !this.currentProcess ||
      !this.canEdit;
  }

  getLaboratoryLabel(laboratory: AccreditedLaboratory): string {
    const code = laboratory.accreditationCode
      ? ` · ${laboratory.accreditationCode}`
      : '';

    return `${laboratory.name}${code}`;
  }

  submit(): void {
    const current = this.currentProcess;

    if (!current) {
      this.toast.error('No se recibió el proceso.');
      return;
    }

    if (!this.canEdit) {
      this.toast.warning('Solo puedes editar procesos en estado En proceso o En corrección.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: UpdateCalibrationProcessDataRequest = {
      accreditedLaboratoryId: Number(raw.accreditedLaboratoryId),
      executionDate: this.normalizeRequired(raw.executionDate),
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

    this.service.updateData(current.id, dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudieron actualizar los datos del proceso.');
          return;
        }

        this.toast.success('Datos del proceso actualizados correctamente.');
        this.updated.emit();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al actualizar los datos del proceso.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

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