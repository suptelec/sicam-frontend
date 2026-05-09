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

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';
import { FileUploadService } from '../../../../core/files/file-upload.service';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import {
  CalibrationProcess,
  CalibrationProcessDocument,
  CalibrationProcessDocumentType,
  CalibrationProcessStatus,
  CalibrationResult,
  CreateCalibrationProcessDocumentRequest,
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
    DrawerActionsComponent,
    DateFieldComponent
  ],
  templateUrl: './update-process-data-drawer.html',
  styleUrl: './update-process-data-drawer.scss'
})
export class UpdateProcessDataDrawerComponent {
  private static readonly CERTIFICATE_FOLDER = 'calibration-process-certificates';
  private static readonly MAX_PDF_SIZE_MB = 15;

  process = input<CalibrationProcess | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly toast = inject(ToastService);

  readonly CalibrationResult = CalibrationResult;

  readonly selectedFiles = signal<File[]>([]);
  readonly fileTouched = signal(false);
  readonly fileError = signal<string | null>(null);

  loading = false;

readonly form = this.fb.group(
  {
    certificateNumber: ['', [Validators.required, Validators.maxLength(100)]],
    certificateIssueDate: [this.todayAsIsoDate(), Validators.required],
    certificateValidUntil: [this.todayPlusYearsAsIsoDate(2), Validators.required],
    calibrationResult: [CalibrationResult.Approved, Validators.required],
    notes: ['', [Validators.maxLength(1000)]]
  },
  {
    validators: [this.validUntilAfterIssueDateValidator()]
  }
);

  constructor() {
    effect(() => {
      const current = this.process();

      this.clearSelectedFiles();

      if (!current) {
        this.reset();
        return;
      }

      this.form.patchValue(
        {
          certificateNumber: current.certificateNumber ?? '',
certificateIssueDate: this.normalizeDateOrFallback(
  current.certificateIssueDate,
  this.todayAsIsoDate()
),
certificateValidUntil: this.normalizeDateOrFallback(
  current.certificateValidUntil,
  this.todayPlusYearsAsIsoDate(2)
),
          calibrationResult: current.calibrationResult ?? CalibrationResult.Approved,
          notes: current.notes ?? ''
        },
        { emitEvent: false }
      );
    });
  }

  get currentProcess(): CalibrationProcess | null {
    return this.process();
  }

  get certificateDocuments(): CalibrationProcessDocument[] {
    return this.currentProcess?.documents?.filter(document =>
      Number(document.documentType) === CalibrationProcessDocumentType.CalibrationCertificate
    ) ?? [];
  }

  get hasCertificateDocument(): boolean {
    return this.certificateDocuments.length > 0;
  }

  get certificateRequired(): boolean {
    return !this.hasCertificateDocument && this.selectedFiles().length === 0;
  }

  get canEdit(): boolean {
    const status = Number(this.currentProcess?.processStatus);

    return status === CalibrationProcessStatus.InProcess ||
      status === CalibrationProcessStatus.Corrected;
  }

  get saveDisabled(): boolean {
    return this.loading ||
      this.form.invalid ||
      this.certificateRequired ||
      !this.currentProcess ||
      !this.canEdit;
  }

  get selectedFilesCount(): number {
    return this.selectedFiles().length;
  }

  get selectedFilesSizeLabel(): string {
    const totalSize = this.selectedFiles()
      .reduce((total, file) => total + file.size, 0);

    return this.formatFileSize(totalSize);
  }

  get certificateStatusText(): string {
    if (this.hasCertificateDocument) {
      return `${this.certificateDocuments.length} cargado(s)`;
    }

    return 'Requerido';
  }

  get saveText(): string {
    if (this.loading) {
      return 'Guardando...';
    }

    if (this.selectedFilesCount > 1) {
      return `Guardar datos y ${this.selectedFilesCount} PDFs`;
    }

    return 'Guardar datos finales';
  }

  onFileSelected(event: Event): void {
    this.fileTouched.set(true);
    this.fileError.set(null);

    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);

    inputElement.value = '';

    if (files.length === 0) return;

    const acceptedFiles: File[] = [];
    const rejectedMessages: string[] = [];

    for (const file of files) {
      const validationError = this.validatePdf(file);

      if (validationError) {
        rejectedMessages.push(`${file.name}: ${validationError}`);
        continue;
      }

      acceptedFiles.push(file);
    }

    if (rejectedMessages.length > 0) {
      this.fileError.set(
        rejectedMessages.length === 1
          ? rejectedMessages[0]
          : `${rejectedMessages.length} archivo(s) no fueron aceptados. Solo se permiten PDFs de máximo ${UpdateProcessDataDrawerComponent.MAX_PDF_SIZE_MB} MB.`
      );

      this.toast.warning('Algunos archivos no cumplen el formato o tamaño permitido.');
    }

    if (acceptedFiles.length === 0) return;

    this.selectedFiles.set([
      ...this.selectedFiles(),
      ...acceptedFiles
    ]);
  }

  removeSelectedFile(fileToRemove: File, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.loading) return;

    this.selectedFiles.set(
      this.selectedFiles().filter(file => file !== fileToRemove)
    );

    if (this.selectedFiles().length === 0) {
      this.fileTouched.set(false);
    }
  }

  clearSelectedFiles(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.loading) return;

    this.selectedFiles.set([]);
    this.fileTouched.set(false);
    this.fileError.set(null);
  }

  submit(): void {
    const current = this.currentProcess;

    if (!current) {
      this.toast.error('No se recibió el proceso.');
      return;
    }

    if (!this.canEdit) {
      this.toast.warning('Solo puedes actualizar datos finales cuando el proceso está en proceso o en corrección.');
      return;
    }

    if (this.certificateRequired) {
      this.fileTouched.set(true);
      this.fileError.set('Selecciona al menos un certificado PDF.');
      this.toast.warning('Selecciona al menos un certificado PDF.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: UpdateCalibrationProcessDataRequest = {
      certificateNumber: this.normalizeRequired(raw.certificateNumber),
      certificateIssueDate: this.normalizeRequired(raw.certificateIssueDate),
      certificateValidUntil: this.normalizeRequired(raw.certificateValidUntil),
      calibrationResult: Number(raw.calibrationResult) as CalibrationResult,
      notes: this.normalize(raw.notes)
    };

    this.loading = true;

    this.service.updateData(current.id, dto).subscribe({
      next: response => {
        if (!response.succeed) {
          this.loading = false;
          this.toast.error(response.message ?? 'No se pudieron actualizar los datos finales.');
          return;
        }

        const files = [...this.selectedFiles()];

        if (files.length === 0) {
          this.loading = false;
          this.toast.success('Datos finales de calibración actualizados correctamente.');
          this.updated.emit();
          return;
        }

        this.uploadCertificates(current.id, files, 0, 0);
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al actualizar los datos finales.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.clearSelectedFiles();
    this.closed.emit();
  }

  private uploadCertificates(
    processId: number,
    files: File[],
    index: number,
    uploadedCount: number
  ): void {
    if (index >= files.length) {
      this.loading = false;

      this.toast.success(
        uploadedCount === 1
          ? 'Datos finales y certificado PDF guardados correctamente.'
          : `Datos finales y ${uploadedCount} certificados PDF guardados correctamente.`
      );

      this.clearSelectedFiles();
      this.updated.emit();
      return;
    }

    const file = files[index];

    this.fileUploadService.upload({
      file,
      folder: UpdateProcessDataDrawerComponent.CERTIFICATE_FOLDER
    }).subscribe({
      next: uploadResponse => {
        if (!uploadResponse.succeed || !uploadResponse.result) {
          this.loading = false;
          this.toast.error(uploadResponse.message ?? `No se pudo subir "${file.name}".`);
          return;
        }

        const uploaded = uploadResponse.result;

        const dto: CreateCalibrationProcessDocumentRequest = {
          documentType: CalibrationProcessDocumentType.CalibrationCertificate,
          fileName: uploaded.fileName || file.name,
          fileUrl: uploaded.absoluteUrl || uploaded.relativeUrl,
          contentType: file.type || 'application/pdf',
          description: 'Certificado de calibración emitido por laboratorio acreditado.'
        };

        this.service.addDocument(processId, dto).subscribe({
          next: response => {
            if (!response.succeed) {
              this.loading = false;
              this.toast.error(response.message ?? `No se pudo registrar "${file.name}".`);
              return;
            }

            this.uploadCertificates(
              processId,
              files,
              index + 1,
              uploadedCount + 1
            );
          },
          error: () => {
            this.loading = false;
            this.toast.error(`Error al registrar "${file.name}".`);
          }
        });
      },
      error: () => {
        this.loading = false;
        this.toast.error(`Error al subir "${file.name}".`);
      }
    });
  }

  private reset(): void {
this.form.reset({
  certificateNumber: '',
  certificateIssueDate: this.todayAsIsoDate(),
  certificateValidUntil: this.todayPlusYearsAsIsoDate(2),
  calibrationResult: CalibrationResult.Approved,
  notes: ''
});

    this.loading = false;
    this.clearSelectedFiles();
  }

  private validatePdf(file: File): string | null {
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return 'no es PDF';
    }

    const maxBytes = UpdateProcessDataDrawerComponent.MAX_PDF_SIZE_MB * 1024 * 1024;

    if (file.size > maxBytes) {
      return `supera ${UpdateProcessDataDrawerComponent.MAX_PDF_SIZE_MB} MB`;
    }

    return null;
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

private normalizeDateOrFallback(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) {
    return fallback;
  }

  const normalized = value.substring(0, 10);

  if (
    normalized.startsWith('0001-01-01') ||
    normalized.startsWith('1901-01-01') ||
    normalized.startsWith('0001-1-1')
  ) {
    return fallback;
  }

  const year = Number(normalized.substring(0, 4));

  if (!year || year < 2000) {
    return fallback;
  }

  return normalized;
}

  private todayAsIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

private todayPlusYearsAsIsoDate(years: number): string {
  const date = new Date();

  date.setFullYear(date.getFullYear() + years);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

  formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    }

    const sizeInKb = sizeInBytes / 1024;

    if (sizeInKb < 1024) {
      return `${sizeInKb.toFixed(1)} KB`;
    }

    return `${(sizeInKb / 1024).toFixed(1)} MB`;
  }
}