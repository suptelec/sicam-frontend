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

  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);

readonly captionControl = new FormControl<string>(
  'Foto de configuración del medidor antes de la calibración',
  { nonNullable: true }
);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['authorization'] && this.authorization?.id) {
      this.clearSelectedFile();
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

  get canUpload(): boolean {
    return !this.isLocked &&
      !this.isUploading() &&
      !!this.selectedFile();
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

  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0] ?? null;

    inputElement.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.warning('Solo se permiten imágenes para la configuración del medidor.');
      return;
    }

    this.clearSelectedFile();

    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  uploadPhoto(): void {
    const file = this.selectedFile();

    if (!file || this.isUploading() || this.isLocked) return;

    const caption = this.captionControl.value.trim();

    this.isUploading.set(true);

    this.fileUploadService.upload({
      file,
      folder: 'authorization-meter-snapshots'
    }).subscribe({
      next: uploadResponse => {
        if (!uploadResponse.succeed || !uploadResponse.result) {
          this.isUploading.set(false);
          this.toast.error(uploadResponse.message ?? 'No se pudo subir la imagen.');
          return;
        }

        const uploaded = uploadResponse.result;

        const dto: CreateAuthorizationMeterSnapshotPhotoRequest = {
          fileName: uploaded.fileName || file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
          storageKey: uploaded.relativeUrl,
          fileUrl: uploaded.absoluteUrl,
          caption: caption || null,
          sortOrder: this.photos.length + 1
        };

        this.service.addMeterSnapshotPhoto(this.authorization.id, dto).subscribe({
          next: response => {
            this.isUploading.set(false);

            if (!response.succeed) {
              this.toast.error(response.message ?? 'No se pudo registrar la foto.');
              return;
            }

            this.toast.success('Foto de configuración registrada correctamente.');
            this.clearSelectedFile();
            this.captionControl.setValue('Foto de configuración del medidor antes de la calibración');
            this.loadSnapshot();
          },
          error: () => {
            this.isUploading.set(false);
            this.toast.error('Error al registrar la foto de configuración.');
          }
        });
      },
      error: () => {
        this.isUploading.set(false);
        this.toast.error('Error al subir la imagen.');
      }
    });
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

    this.clearSelectedFile();
    this.closed.emit();
  }

  clearSelectedFile(): void {
    const currentPreview = this.previewUrl();

    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }

    this.previewUrl.set(null);
    this.selectedFile.set(null);
  }
}