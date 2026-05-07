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
  processId = input<number | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly toast = inject(ToastService);

  loading = false;

  readonly selectedFile = signal<File | null>(null);

  readonly form = this.fb.group({
    description: [
      'Certificado de calibración emitido por laboratorio acreditado.',
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

  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0] ?? null;

    inputElement.value = '';

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      this.toast.warning('Solo se permite cargar el certificado en formato PDF.');
      return;
    }

    this.selectedFile.set(file);
  }

  removeSelectedFile(): void {
    if (this.loading) return;

    this.selectedFile.set(null);
  }

  submit(): void {
    const currentProcessId = this.processId();
    const file = this.selectedFile();

    if (!currentProcessId) {
      this.toast.error('No se recibió el identificador del proceso.');
      return;
    }

    if (!file) {
      this.toast.warning('Selecciona el PDF del certificado de calibración.');
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
      folder: 'calibration-process-certificates'
    }).subscribe({
      next: uploadResponse => {
        if (!uploadResponse.succeed || !uploadResponse.result) {
          this.loading = false;
          this.toast.error(uploadResponse.message ?? 'No se pudo subir el certificado PDF.');
          return;
        }

        const uploaded = uploadResponse.result;
        const raw = this.form.getRawValue();

        const dto: CreateCalibrationProcessDocumentRequest = {
          documentType: CalibrationProcessDocumentType.CalibrationCertificate,
          fileName: uploaded.fileName || file.name,
          fileUrl: uploaded.absoluteUrl,
          contentType: file.type || 'application/pdf',
          description: this.normalize(raw.description)
        };

        this.service.addDocument(currentProcessId, dto).subscribe({
          next: response => {
            this.loading = false;

            if (!response.succeed) {
              this.toast.error(response.message ?? 'No se pudo registrar el certificado.');
              return;
            }

            this.toast.success('Certificado PDF cargado correctamente.');
            this.created.emit();
            this.reset();
          },
          error: () => {
            this.loading = false;
            this.toast.error('Error al registrar el certificado.');
          }
        });
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al subir el certificado PDF.');
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
      description: 'Certificado de calibración emitido por laboratorio acreditado.'
    });

    this.selectedFile.set(null);
    this.loading = false;
  }

  private normalize(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();

    return normalized ? normalized : null;
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