import { Component, EventEmitter, Output, inject, input } from '@angular/core';
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
    MatSelectModule,
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
  private readonly toast = inject(ToastService);

  readonly CalibrationProcessDocumentType = CalibrationProcessDocumentType;

  loading = false;

  readonly form = this.fb.group({
    documentType: [
      CalibrationProcessDocumentType.CalibrationCertificate,
      Validators.required
    ],
    fileName: ['', [Validators.required, Validators.maxLength(250)]],
    fileUrl: ['', [Validators.required, Validators.maxLength(1000)]],
    contentType: ['application/pdf', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(1000)]]
  });

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid || !this.processId();
  }

  get selectedDocumentType(): CalibrationProcessDocumentType {
    return Number(this.form.controls.documentType.value) as CalibrationProcessDocumentType;
  }

  submit(): void {
    const currentProcessId = this.processId();

    if (!currentProcessId) {
      this.toast.error('No se recibió el identificador del proceso.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateCalibrationProcessDocumentRequest = {
      documentType: Number(raw.documentType) as CalibrationProcessDocumentType,
      fileName: this.normalizeRequired(raw.fileName),
      fileUrl: this.normalizeRequired(raw.fileUrl),
      contentType: this.normalizeRequired(raw.contentType),
      description: this.normalize(raw.description)
    };

    this.loading = true;

    this.service.addDocument(currentProcessId, dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo cargar el documento.');
          return;
        }

        this.toast.success('Documento cargado correctamente.');
        this.created.emit();
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al cargar el documento.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  getDocumentTypeLabel(type: CalibrationProcessDocumentType): string {
    switch (Number(type)) {
      case CalibrationProcessDocumentType.CalibrationCertificate:
        return 'Certificado de calibración';

      case CalibrationProcessDocumentType.CalibrationAct:
        return 'Acta de calibración';

      default:
        return 'Documento';
    }
  }

  private reset(): void {
    this.form.reset({
      documentType: CalibrationProcessDocumentType.CalibrationCertificate,
      fileName: '',
      fileUrl: '',
      contentType: 'application/pdf',
      description: ''
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
}