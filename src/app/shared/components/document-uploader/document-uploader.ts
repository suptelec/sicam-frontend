import { Component, input, output, signal, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FileUploadService } from '../../../core/files/file-upload.service';
import { UploadFileResponse } from '../../../core/files/file-upload.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-document-uploader',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './document-uploader.html',
  styleUrl: './document-uploader.scss'
})
export class DocumentUploaderComponent {
  private readonly fileUploadService = inject(FileUploadService);
  private readonly toast = inject(ToastService);

  label = input<string>('Subir documento');
  description = input<string | null>(null);
  folder = input.required<string>();
  accept = input<string>('.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg');
  disabled = input<boolean>(false);

  uploaded = output<UploadFileResponse>();

  selectedFile = signal<File | null>(null);
  uploading = signal(false);

  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0] ?? null;

    if (!file) return;

    this.selectedFile.set(file);
  }

  upload(): void {
    const file = this.selectedFile();

    if (!file || this.uploading() || this.disabled()) {
      return;
    }

    this.uploading.set(true);

    this.fileUploadService.upload({
      file,
      folder: this.folder()
    }).subscribe({
      next: response => {
        this.uploading.set(false);

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo subir el archivo.');
          return;
        }

        this.toast.success('Archivo subido correctamente.');
        this.uploaded.emit(response.result);
        this.selectedFile.set(null);
      },
      error: () => {
        this.uploading.set(false);
        this.toast.error('Ocurrió un error al subir el archivo.');
      }
    });
  }

  clear(): void {
    this.selectedFile.set(null);
  }
}