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

  readonly selectedFile = signal<File | null>(null);
  readonly fileTouched = signal(false);
  readonly fileError = signal<string | null>(null);

  loading = false;

  readonly form = this.fb.group(
    {
      certificateNumber: ['', [Validators.required, Validators.maxLength(100)]],
      certificateIssueDate: [this.todayAsIsoDate(), Validators.required],
      certificateValidUntil: [this.todayAsIsoDate(), Validators.required],
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

      this.clearSelectedFile();

      if (!current) {
        this.reset();
        return;
      }

      this.form.patchValue(
        {
          certificateNumber: current.certificateNumber ?? '',
          certificateIssueDate: this.normalizeDateOrToday(current.certificateIssueDate),
          certificateValidUntil: this.normalizeDateOrToday(current.certificateValidUntil),
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

  get certificateDocument(): CalibrationProcessDocument | null {
    return this.currentProcess?.documents?.find(document =>
      Number(document.documentType) === CalibrationProcessDocumentType.CalibrationCertificate
    ) ?? null;
  }

  get hasCertificateDocument(): boolean {
    return !!this.certificateDocument;
  }

  get certificateRequired(): boolean {
    return !this.hasCertificateDocument && !this.selectedFile();
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

  get selectedFileName(): string {
    return this.selectedFile()?.name ?? '';
  }

  get selectedFileSizeLabel(): string {
    const file = this.selectedFile();

    if (!file) return '';

    return this.formatFileSize(file.size);
  }

  onFileSelected(event: Event): void {
    this.fileTouched.set(true);
    this.fileError.set(null);

    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0] ?? null;

    inputElement.value = '';

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      this.selectedFile.set(null);
      this.fileError.set('Solo se permite cargar el certificado en formato PDF.');
      return;
    }

    const maxBytes = UpdateProcessDataDrawerComponent.MAX_PDF_SIZE_MB * 1024 * 1024;

    if (file.size > maxBytes) {
      this.selectedFile.set(null);
      this.fileError.set(`El PDF no puede superar ${UpdateProcessDataDrawerComponent.MAX_PDF_SIZE_MB} MB.`);
      return;
    }

    this.selectedFile.set(file);
  }

  removeSelectedFile(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.loading) return;

    this.clearSelectedFile();
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
      this.fileError.set('Selecciona el PDF del certificado de calibración.');
      this.toast.warning('Selecciona el PDF del certificado de calibración.');
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

        const file = this.selectedFile();

        if (!file) {
          this.loading = false;
          this.toast.success('Datos finales de calibración actualizados correctamente.');
          this.updated.emit();
          return;
        }

        this.uploadCertificate(current.id, file);
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al actualizar los datos finales.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.clearSelectedFile();
    this.closed.emit();
  }

  private uploadCertificate(processId: number, file: File): void {
    this.fileUploadService.upload({
      file,
      folder: UpdateProcessDataDrawerComponent.CERTIFICATE_FOLDER
    }).subscribe({
      next: uploadResponse => {
        if (!uploadResponse.succeed || !uploadResponse.result) {
          this.loading = false;
          this.toast.error(uploadResponse.message ?? 'No se pudo subir el certificado PDF.');
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
            this.loading = false;

            if (!response.succeed) {
              this.toast.error(response.message ?? 'No se pudo registrar el certificado PDF.');
              return;
            }

            this.toast.success('Datos finales y certificado PDF guardados correctamente.');
            this.clearSelectedFile();
            this.updated.emit();
          },
          error: () => {
            this.loading = false;
            this.toast.error('Error al registrar el certificado PDF.');
          }
        });
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al subir el certificado PDF.');
      }
    });
  }

  private reset(): void {
    this.form.reset({
      certificateNumber: '',
      certificateIssueDate: this.todayAsIsoDate(),
      certificateValidUntil: this.todayAsIsoDate(),
      calibrationResult: CalibrationResult.Approved,
      notes: ''
    });

    this.loading = false;
    this.clearSelectedFile();
  }

  private clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.fileTouched.set(false);
    this.fileError.set(null);
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

  private normalizeDateOrToday(value: string | null | undefined): string {
    if (!value) {
      return this.todayAsIsoDate();
    }

    const normalized = value.substring(0, 10);

    if (
      normalized.startsWith('0001-01-01') ||
      normalized.startsWith('1901-01-01') ||
      normalized.startsWith('0001-1-1')
    ) {
      return this.todayAsIsoDate();
    }

    const year = Number(normalized.substring(0, 4));

    if (!year || year < 2000) {
      return this.todayAsIsoDate();
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

  private formatFileSize(sizeInBytes: number): string {
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