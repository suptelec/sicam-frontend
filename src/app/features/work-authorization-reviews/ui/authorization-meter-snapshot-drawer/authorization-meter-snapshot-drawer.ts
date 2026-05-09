import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FileUploadService } from '../../../../core/files/file-upload.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';

import { WorkAuthorizationsService } from '../../../my-calibration-items/data-access/work-authorizations.service';
import {
  AuthorizationMeterSnapshot,
  AuthorizationMeterSnapshotPhoto,
  CalibrationWorkAuthorization,
  CalibrationWorkAuthorizationStatus,
  CreateAuthorizationMeterSnapshotPhotoRequest
} from '../../../my-calibration-items/domain/work-authorization.model';

interface SelectedSnapshotFile {
  id: string;
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-authorization-meter-snapshot-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './authorization-meter-snapshot-drawer.html',
  styleUrl: './authorization-meter-snapshot-drawer.scss'
})
export class AuthorizationMeterSnapshotDrawerComponent implements OnChanges {
  private readonly service = inject(WorkAuthorizationsService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  @Input({ required: true }) authorization!: CalibrationWorkAuthorization;

  @Output() closed = new EventEmitter<void>();
  @Output() authorized = new EventEmitter<void>();

  readonly snapshot = signal<AuthorizationMeterSnapshot | null>(null);
  readonly isLoading = signal(false);
  readonly isUploading = signal(false);
  readonly isDeleting = signal(false);
  readonly isAuthorizing = signal(false);

  readonly selectedFiles = signal<SelectedSnapshotFile[]>([]);

  readonly captionControl = new FormControl<string>(
    'Foto de configuración del medidor antes de la calibración',
    { nonNullable: true }
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['authorization'] && this.authorization?.id) {
      this.clearSelectedFiles();
      this.loadSnapshot();
    }
  }

  get photos(): AuthorizationMeterSnapshotPhoto[] {
    return [...(this.snapshot()?.photos ?? [])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  get hasPhotos(): boolean {
    return this.photos.length > 0;
  }

  get isLocked(): boolean {
    return !!this.snapshot()?.isLocked ||
      this.authorization.authorizationStatus !== CalibrationWorkAuthorizationStatus.Requested;
  }

  get selectedFilesCount(): number {
    return this.selectedFiles().length;
  }

  get hasSelectedFiles(): boolean {
    return this.selectedFilesCount > 0;
  }

  get selectedFilesTotalSizeText(): string {
    const total = this.selectedFiles()
      .reduce((sum, item) => sum + item.file.size, 0);

    return this.formatFileSize(total);
  }

  get uploadButtonText(): string {
    if (this.selectedFilesCount <= 1) {
      return 'Subir foto';
    }

    return `Subir ${this.selectedFilesCount} fotos`;
  }

  get canUpload(): boolean {
    return !this.isLocked &&
      !this.isUploading() &&
      this.hasSelectedFiles;
  }

  get canAuthorize(): boolean {
    return this.hasPhotos &&
      !this.isLocked &&
      !this.isLoading() &&
      !this.isUploading() &&
      !this.isDeleting() &&
      !this.isAuthorizing();
  }

  loadSnapshot(): void {
    this.isLoading.set(true);

    this.service.getMeterSnapshot(this.authorization.id).subscribe({
      next: response => {
        this.isLoading.set(false);

        if (response.succeed) {
          this.snapshot.set(response.result ?? null);
          return;
        }

        this.snapshot.set(null);
      },
      error: () => {
        this.isLoading.set(false);
        this.snapshot.set(null);
      }
    });
  }

  onFilesSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);

    inputElement.value = '';

    if (files.length === 0) return;

    const validFiles = files.filter(file => this.isAllowedImage(file));
    const rejectedFiles = files.length - validFiles.length;

    if (rejectedFiles > 0) {
      this.toast.warning('Solo se permiten imágenes JPG, JPEG o PNG.');
    }

    if (validFiles.length === 0) return;

    const currentFiles = this.selectedFiles();

    const newSelectedFiles = validFiles.map((file, index) => ({
      id: this.createClientFileId(file, index),
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    this.selectedFiles.set([
      ...currentFiles,
      ...newSelectedFiles
    ]);
  }

  removeSelectedFile(selectedFile: SelectedSnapshotFile): void {
    this.revokePreviewUrl(selectedFile.previewUrl);

    this.selectedFiles.set(
      this.selectedFiles().filter(item => item.id !== selectedFile.id)
    );
  }

  clearSelectedFiles(): void {
    this.selectedFiles().forEach(item => {
      this.revokePreviewUrl(item.previewUrl);
    });

    this.selectedFiles.set([]);
  }

  uploadPhoto(): void {
    const files = [...this.selectedFiles()];

    if (files.length === 0 || this.isUploading() || this.isLocked) return;

    const caption = this.captionControl.value.trim();
    const initialSortOrder = this.photos.length + 1;

    this.isUploading.set(true);

    this.uploadSelectedFileAt(files, 0, caption, initialSortOrder, 0);
  }

  deletePhoto(photo: AuthorizationMeterSnapshotPhoto): void {
    if (this.isLocked || this.isDeleting()) return;

    this.confirmDialog.confirm({
      title: 'Eliminar foto',
      message: `Se eliminará la foto "${photo.fileName}". ¿Deseas continuar?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.isDeleting.set(true);

      this.service.deleteMeterSnapshotPhoto(this.authorization.id, photo.id).subscribe({
        next: response => {
          this.isDeleting.set(false);

          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo eliminar la foto.');
            return;
          }

          this.toast.success('Foto eliminada correctamente.');
          this.loadSnapshot();
        },
        error: () => {
          this.isDeleting.set(false);
          this.toast.error('Error al eliminar la foto.');
        }
      });
    });
  }

  authorize(): void {
    if (!this.hasPhotos) {
      this.toast.warning('Debes cargar al menos una foto de configuración antes de autorizar.');
      return;
    }

    if (!this.canAuthorize) return;

    this.confirmDialog.confirm({
      title: 'Autorizar inicio de trabajos',
      message: `Se autorizará el inicio de trabajos para el medidor ${this.authorization.meterCode ?? this.authorization.calibrationPlanItemId}. Las fotos quedarán bloqueadas y serán visibles para el PMSE.`,
      confirmText: 'Autorizar',
      cancelText: 'Cancelar',
      type: 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.isAuthorizing.set(true);

      this.service.authorize(this.authorization.id, {
        authorizationNotes: 'Se autoriza el inicio de trabajos conforme al cronograma aprobado. Revisar la configuración del medidor enviada por CENACE.',
        authorizationDocumentUrl: this.authorization.requestDocumentUrl
      }).subscribe({
        next: response => {
          this.isAuthorizing.set(false);

          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo autorizar la solicitud.');
            return;
          }

          this.toast.success('Autorización aprobada correctamente.');
          this.authorized.emit();
        },
        error: () => {
          this.isAuthorizing.set(false);
          this.toast.error('Error al autorizar la solicitud.');
        }
      });
    });
  }

  close(): void {
    if (this.isUploading() || this.isAuthorizing() || this.isDeleting()) return;

    this.clearSelectedFiles();
    this.closed.emit();
  }

  private uploadSelectedFileAt(
    files: SelectedSnapshotFile[],
    index: number,
    caption: string,
    initialSortOrder: number,
    uploadedCount: number
  ): void {
    if (index >= files.length) {
      this.isUploading.set(false);

      if (uploadedCount > 0) {
        this.toast.success(
          uploadedCount === 1
            ? 'Foto de configuración registrada correctamente.'
            : `${uploadedCount} fotos de configuración registradas correctamente.`
        );

        this.captionControl.setValue('Foto de configuración del medidor antes de la calibración');
        this.clearSelectedFiles();
        this.loadSnapshot();
      }

      return;
    }

    const selectedFile = files[index];
    const file = selectedFile.file;

    this.fileUploadService.upload({
      file,
      folder: 'authorization-meter-snapshots'
    }).subscribe({
      next: uploadResponse => {
        if (!uploadResponse.succeed || !uploadResponse.result) {
          this.isUploading.set(false);
          this.toast.error(uploadResponse.message ?? `No se pudo subir la imagen "${file.name}".`);
          return;
        }

        const uploaded = uploadResponse.result;

        const dto: CreateAuthorizationMeterSnapshotPhotoRequest = {
          fileName: uploaded.fileName || file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
          storageKey: uploaded.relativeUrl,
          fileUrl: uploaded.absoluteUrl,
          caption: this.buildCaption(caption, files.length, index),
          sortOrder: initialSortOrder + index
        };

        this.service.addMeterSnapshotPhoto(this.authorization.id, dto).subscribe({
          next: response => {
            if (!response.succeed) {
              this.isUploading.set(false);
              this.toast.error(response.message ?? `No se pudo registrar la foto "${file.name}".`);
              return;
            }

            this.removeSelectedFile(selectedFile);

            this.uploadSelectedFileAt(
              files,
              index + 1,
              caption,
              initialSortOrder,
              uploadedCount + 1
            );
          },
          error: () => {
            this.isUploading.set(false);
            this.toast.error(`Error al registrar la foto "${file.name}".`);
          }
        });
      },
      error: () => {
        this.isUploading.set(false);
        this.toast.error(`Error al subir la imagen "${file.name}".`);
      }
    });
  }

  private isAllowedImage(file: File): boolean {
    const validMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];

    const lowerName = file.name.toLowerCase();

    return validMimeTypes.includes(file.type) ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg');
  }

  private buildCaption(
    caption: string,
    totalFiles: number,
    index: number
  ): string | null {
    const normalized = caption.trim();

    if (!normalized) {
      return null;
    }

    if (totalFiles <= 1) {
      return normalized;
    }

    return `${normalized} ${index + 1}`;
  }

  private createClientFileId(file: File, index: number): string {
    return `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`;
  }

  private revokePreviewUrl(previewUrl: string): void {
    URL.revokeObjectURL(previewUrl);
  }

  private formatFileSize(size: number): string {
    if (size <= 0) return '0 B';

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
}