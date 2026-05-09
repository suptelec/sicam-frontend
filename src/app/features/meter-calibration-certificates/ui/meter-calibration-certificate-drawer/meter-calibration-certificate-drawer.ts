import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { DocumentUploaderComponent } from '../../../../shared/components/document-uploader/document-uploader';
import { UploadFileResponse } from '../../../../core/files/file-upload.model';
import { ToastService } from '../../../../core/services/toast.service';

import { MetersService } from '../../../meters/data-access/meters.service';
import { Meter } from '../../../meters/domain/meter.model';

import { AccreditedLaboratoriesService } from '../../../accredited-laboratories/data-access/accredited-laboratories.service';
import {
  AccreditedLaboratory,
  EntityStatus
} from '../../../accredited-laboratories/domain/accredited-laboratory.model';

import { MeterCalibrationCertificatesService } from '../../data-access/meter-calibration-certificates.service';
import {
  CalibrationResult,
  CalibrationResultLabels,
  CreateMeterCalibrationCertificateRequest,
  MeterCalibrationCertificate
} from '../../domain/meter-calibration-certificate.model';

import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

@Component({
  selector: 'app-meter-calibration-certificate-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    DrawerActionsComponent,
    DocumentUploaderComponent
  ],
  templateUrl: './meter-calibration-certificate-drawer.html',
  styleUrl: './meter-calibration-certificate-drawer.scss'
})
export class MeterCalibrationCertificateDrawerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MeterCalibrationCertificatesService);
  private readonly metersService = inject(MetersService);
  private readonly laboratoriesService = inject(AccreditedLaboratoriesService);
  private readonly toast = inject(ToastService);
  private readonly userScope = inject(UserScopeService);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<MeterCalibrationCertificate>();

  loading = false;
  loadingCatalogs = signal(false);

  meters = signal<Meter[]>([]);
  laboratories = signal<AccreditedLaboratory[]>([]);

  readonly CalibrationResult = CalibrationResult;
  readonly CalibrationResultLabels = CalibrationResultLabels;

  readonly calibrationResults = Object.values(CalibrationResult)
    .filter(value => typeof value === 'number') as CalibrationResult[];

  readonly form = this.fb.group(
    {
      meterId: [null as number | null, Validators.required],
      accreditedLaboratoryId: [null as number | null, Validators.required],

      certificateNumber: ['', [Validators.required, Validators.maxLength(120)]],
      secondaryCertificateNumber: ['', [Validators.maxLength(250)]],

      issueDate: ['', Validators.required],
      validUntil: ['', Validators.required],

      calibrationResult: [CalibrationResult.Approved, Validators.required],

      pdfUrl: [''],
      notes: ['', [Validators.maxLength(1000)]]
    },
    {
      validators: [this.validUntilAfterIssueDateValidator()]
    }
  );

  ngOnInit(): void {
    this.loadCatalogs();
  }

  get isPmseUser(): boolean {
    return this.userScope.isPmseUser();
  }

  get currentPmseCompanyName(): string | null {
    return this.userScope.pmseCompanyName();
  }

  get saveDisabled(): boolean {
    return this.loading ||
      this.loadingCatalogs() ||
      this.form.invalid ||
      this.laboratories().length === 0;
  }

  get selectedMeter(): Meter | null {
    const meterId = this.form.controls.meterId.value;

    if (!meterId) return null;

    return this.meters().find(meter => meter.id === meterId) ?? null;
  }

  get hasPdf(): boolean {
    return !!this.form.controls.pdfUrl.value?.trim();
  }

  get selectedPdfUrl(): string | null {
    return this.form.controls.pdfUrl.value?.trim() || null;
  }

  getMeterLabel(meter: Meter): string {
    const serial = meter.serial ? ` · Serial: ${meter.serial}` : '';
    const company = meter.pmseCompanyName ? ` · ${meter.pmseCompanyName}` : '';

    return `${meter.code}${serial}${company}`;
  }

  getLaboratoryLabel(laboratory: AccreditedLaboratory): string {
    const name = laboratory.name?.trim() || 'Laboratorio';

    const code = laboratory.accreditationCode?.trim()
      ? ` · ${laboratory.accreditationCode.trim()}`
      : '';

    return `${name}${code}`;
  }

  getResultLabel(result: CalibrationResult): string {
    return CalibrationResultLabels[result] ?? '—';
  }

  onPdfUploaded(file: UploadFileResponse): void {
    this.form.controls.pdfUrl.setValue(file.absoluteUrl);
    this.form.controls.pdfUrl.markAsDirty();
    this.toast.success('PDF asociado al certificado.');
  }

  clearPdf(): void {
    this.form.controls.pdfUrl.setValue('');
    this.form.controls.pdfUrl.markAsDirty();
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateMeterCalibrationCertificateRequest = {
      meterId: Number(raw.meterId),
      accreditedLaboratoryId: Number(raw.accreditedLaboratoryId),

      certificateNumber: this.normalizeRequired(raw.certificateNumber),
      secondaryCertificateNumber: this.normalize(raw.secondaryCertificateNumber),

      issueDate: this.normalizeRequired(raw.issueDate),
      validUntil: this.normalizeRequired(raw.validUntil),

      calibrationResult: Number(raw.calibrationResult) as CalibrationResult,

      pdfUrl: this.normalize(raw.pdfUrl),
      notes: this.normalize(raw.notes)
    };

    this.loading = true;

    this.service.create(dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo registrar el certificado.');
          return;
        }

        this.toast.success('Certificado registrado correctamente.');
        this.created.emit(response.result);
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al registrar el certificado.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private loadCatalogs(): void {
    this.loadingCatalogs.set(true);

    const meterFilter = this.userScope.getPmseFilter('PmseCompanyId');

    let completed = 0;

    const finish = () => {
      completed += 1;

      if (completed === 2) {
        this.loadingCatalogs.set(false);
      }
    };

    this.metersService.getAll({
      page: 1,
      take: 500,
      filter: meterFilter || undefined,
      orderBy: 'Code asc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.meters.set(response.result ?? []);
        } else {
          this.toast.warning(response.message ?? 'No se pudieron cargar los medidores.');
        }

        finish();
      },
      error: () => {
        this.toast.warning('No se pudieron cargar los medidores.');
        finish();
      }
    });

    this.laboratoriesService.getAll({
      page: 1,
      take: 500,
      filter: `Status eq ${EntityStatus.Active}`,
      orderBy: 'Name asc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.laboratories.set(response.result ?? []);
        } else {
          this.toast.warning(response.message ?? 'No se pudieron cargar los laboratorios acreditados.');
        }

        finish();
      },
      error: () => {
        this.toast.warning('No se pudieron cargar los laboratorios acreditados.');
        finish();
      }
    });
  }

  private reset(): void {
    this.form.reset({
      meterId: null,
      accreditedLaboratoryId: null,
      certificateNumber: '',
      secondaryCertificateNumber: '',
      issueDate: '',
      validUntil: '',
      calibrationResult: CalibrationResult.Approved,
      pdfUrl: '',
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
      const issueDate = control.get('issueDate')?.value;
      const validUntil = control.get('validUntil')?.value;

      if (!issueDate || !validUntil) return null;

      const issue = new Date(issueDate);
      const valid = new Date(validUntil);

      if (Number.isNaN(issue.getTime()) || Number.isNaN(valid.getTime())) {
        return null;
      }

      return valid < issue
        ? { validUntilBeforeIssueDate: true }
        : null;
    };
  }
}