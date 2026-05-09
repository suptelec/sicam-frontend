import {
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { FileUploadService } from '../../../../core/files/file-upload.service';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import {
  CalibrationProcessDocumentType,
  CreateCalibrationProcessDocumentRequest
} from '../../../my-calibration-items/domain/calibration-process.model';

@Component({
  selector: 'app-process-document-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DrawerActionsComponent
  ],
  templateUrl: './process-document-drawer.html',
  styleUrl: './process-document-drawer.scss'
})
export class ProcessDocumentDrawerComponent {
  private static readonly SIGNED_ACTA_FOLDER = 'calibration-process-signed-actas';
  private static readonly MAX_PDF_SIZE_MB = 15;

  processId = input<number | null>(null);

  /**
   * Se mantiene solo por compatibilidad con la pantalla principal.
   * Este drawer siempre registra CalibrationAct.
   */
  documentType = input<CalibrationProcessDocumentType>(
    CalibrationProcessDocumentType.CalibrationAct
  );

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly toast = inject(ToastService);

  loading = false;

  readonly selectedFile = signal<File | null>(null);
  readonly fileTouched = signal(false);
  readonly fileError = signal<string | null>(null);

  readonly form = this.fb.group({
    description: [
      'Acta firmada electrónicamente por el PMSE.',
      [Validators.maxLength(1000)]
    ]
  });

  get saveDisabled(): boolean {
    return this.loading ||
      !this.processId() ||
      !this.selectedFile() ||
      this.form.invalid;
  }

  get selectedFileName(): string {
    return this.selectedFile()?.name ?? '';
  }

  get selectedFileSizeLabel(): string {
    const file = this.selectedFile();

    if (!file) return '';

    return this.formatFileSize(file.size);
  }

  get submitText(): string {
    return this.loading
      ? 'Guardando...'
      : 'Guardar acta firmada';
  }

  onFileSelected(event: Event): void {
    this.fileTouched.set(true);
    this.fileError.set(null);

    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0] ?? null;

    inputElement.value = '';

    if (!file) return;

    const validationError = this.validatePdf(file);

    if (validationError) {
      this.fileError.set(validationError);
      this.toast.warning(validationError);
      return;
    }

    this.selectedFile.set(file);
  }

  removeSelectedFile(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.loading) return;

    this.selectedFile.set(null);
    this.fileTouched.set(false);
    this.fileError.set(null);
  }

  submit(): void {
    const currentProcessId = this.processId();
    const file = this.selectedFile();

    if (!currentProcessId) {
      this.toast.error('No se recibió el identificador del proceso.');
      return;
    }

    if (!file) {
      this.fileTouched.set(true);
      this.fileError.set('Selecciona el PDF del acta firmada.');
      this.toast.warning('Selecciona el PDF del acta firmada.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos antes de guardar.');
      return;
    }

    this.loading = true;

    this.fileUploadService.upload({
      file,
      folder: ProcessDocumentDrawerComponent.SIGNED_ACTA_FOLDER
    }).subscribe({
      next: uploadResponse => {
        if (!uploadResponse.succeed || !uploadResponse.result) {
          this.loading = false;
          this.toast.error(uploadResponse.message ?? 'No se pudo subir el acta firmada PDF.');
          return;
        }

        const uploaded = uploadResponse.result;

        const dto: CreateCalibrationProcessDocumentRequest = {
          documentType: CalibrationProcessDocumentType.CalibrationAct,
          fileName: uploaded.fileName || file.name,
          fileUrl: uploaded.absoluteUrl || uploaded.relativeUrl,
          contentType: file.type || 'application/pdf',
          description: this.normalize(this.form.getRawValue().description)
        };

        this.service.addDocument(currentProcessId, dto).subscribe({
          next: response => {
            this.loading = false;

            if (!response.succeed) {
              this.toast.error(response.message ?? 'No se pudo registrar el acta firmada.');
              return;
            }

            this.toast.success('Acta firmada cargada correctamente.');
            this.reset();
            this.created.emit();
          },
          error: () => {
            this.loading = false;
            this.toast.error('Error al registrar el acta firmada.');
          }
        });
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al subir el acta firmada PDF.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.form.reset({
      description: 'Acta firmada electrónicamente por el PMSE.'
    });

    this.selectedFile.set(null);
    this.fileTouched.set(false);
    this.fileError.set(null);
    this.loading = false;
  }

  private validatePdf(file: File): string | null {
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return 'Solo se permite cargar el acta firmada en formato PDF.';
    }

    const maxBytes = ProcessDocumentDrawerComponent.MAX_PDF_SIZE_MB * 1024 * 1024;

    if (file.size > maxBytes) {
      return `El archivo supera el tamaño máximo permitido de ${ProcessDocumentDrawerComponent.MAX_PDF_SIZE_MB} MB.`;
    }

    return null;
  }

  private normalize(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();

    return normalized || null;
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