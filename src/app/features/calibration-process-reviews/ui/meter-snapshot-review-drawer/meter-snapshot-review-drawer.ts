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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';

import { WorkAuthorizationsService } from '../../../my-calibration-items/data-access/work-authorizations.service';
import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';

import {
  AuthorizationMeterSnapshot,
  AuthorizationMeterSnapshotPhoto
} from '../../../my-calibration-items/domain/work-authorization.model';

import {
  CalibrationProcess,
  MeterCalibrationActaFormResponse,
  MeterSnapshotReview,
  MeterSnapshotReviewStatus,
  SaveMeterSnapshotReviewRequest
} from '../../../my-calibration-items/domain/calibration-process.model';

@Component({
  selector: 'app-meter-snapshot-review-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatTooltipModule,
    DrawerActionsComponent
  ],
  templateUrl: './meter-snapshot-review-drawer.html',
  styleUrl: './meter-snapshot-review-drawer.scss'
})
export class MeterSnapshotReviewDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly calibrationProcessesService = inject(CalibrationProcessesService);
  private readonly workAuthorizationsService = inject(WorkAuthorizationsService);
  private readonly toast = inject(ToastService);

  @Input() process: CalibrationProcess | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() validated = new EventEmitter<MeterSnapshotReview>();

  readonly MeterSnapshotReviewStatus = MeterSnapshotReviewStatus;

  readonly actaForm = signal<MeterCalibrationActaFormResponse | null>(null);
  readonly snapshot = signal<AuthorizationMeterSnapshot | null>(null);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly form = this.fb.group({
    reviewStatus: [null as MeterSnapshotReviewStatus | null, [Validators.required]],
    notes: ['', [Validators.maxLength(1000)]]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['process'] && this.process?.id) {
      this.reset();
      this.loadReferencePhotos();
    }
  }

  get currentProcess(): CalibrationProcess | null {
    return this.process;
  }

  get currentActaForm(): MeterCalibrationActaFormResponse | null {
    return this.actaForm();
  }

  get photos(): AuthorizationMeterSnapshotPhoto[] {
    return [...(this.snapshot()?.photos ?? [])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  get hasPhotos(): boolean {
    return this.photos.length > 0;
  }

  get saveDisabled(): boolean {
    return this.isLoading() ||
      this.isSaving() ||
      this.form.invalid ||
      !this.hasPhotos;
  }

  loadReferencePhotos(): void {
    const current = this.process;

    if (!current?.id) {
      this.loadError.set('No se recibió el proceso de calibración.');
      return;
    }

    this.isLoading.set(true);
    this.loadError.set(null);
    this.actaForm.set(null);
    this.snapshot.set(null);

    this.calibrationProcessesService.getActaForm(current.id).subscribe({
      next: actaResponse => {
        if (!actaResponse.succeed || !actaResponse.result) {
          this.isLoading.set(false);
          this.loadError.set(
            actaResponse.message ??
            'No se pudo obtener la autorización asociada al proceso.'
          );
          return;
        }

        const form = actaResponse.result;
        this.actaForm.set(form);

        if (!form.calibrationWorkAuthorizationId) {
          this.isLoading.set(false);
          this.loadError.set('El proceso no tiene una autorización de trabajo asociada.');
          return;
        }

        this.workAuthorizationsService
          .getMeterSnapshot(form.calibrationWorkAuthorizationId)
          .subscribe({
            next: snapshotResponse => {
              this.isLoading.set(false);

              if (!snapshotResponse.succeed) {
                this.snapshot.set(null);
                this.loadError.set(
                  snapshotResponse.message ??
                  'No se pudieron cargar las fotos de configuración inicial.'
                );
                return;
              }

              this.snapshot.set(snapshotResponse.result ?? null);

              if (!snapshotResponse.result?.photos?.length) {
                this.loadError.set(
                  'La autorización no tiene fotos de configuración inicial registradas.'
                );
              }
            },
            error: () => {
              this.isLoading.set(false);
              this.snapshot.set(null);
              this.loadError.set('Error al cargar las fotos de configuración inicial.');
            }
          });
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('Error al obtener la autorización asociada al proceso.');
      }
    });
  }

  submit(): void {
    if (this.isSaving()) return;

    if (this.form.invalid || !this.hasPhotos) {
      this.form.markAllAsTouched();

      if (!this.hasPhotos) {
        this.toast.warning('No existen fotos iniciales para validar la configuración.');
      }

      return;
    }

    const current = this.process;

    if (!current?.id) {
      this.toast.error('No se recibió el proceso de calibración.');
      return;
    }

    const reviewStatus = Number(
      this.form.controls.reviewStatus.value
    ) as MeterSnapshotReviewStatus;

    const notes = this.form.controls.notes.value?.trim() ?? '';

    if (
      reviewStatus !== MeterSnapshotReviewStatus.MatchesReference &&
      reviewStatus !== MeterSnapshotReviewStatus.DoesNotMatchReference
    ) {
      this.toast.warning('Selecciona si la configuración coincide o no coincide.');
      return;
    }

    if (
      reviewStatus === MeterSnapshotReviewStatus.DoesNotMatchReference &&
      !notes
    ) {
      this.form.controls.notes.setErrors({ required: true });
      this.form.controls.notes.markAsTouched();
      this.toast.warning('Cuando no coincide, las observaciones son obligatorias.');
      return;
    }

    const dto: SaveMeterSnapshotReviewRequest = {
      reviewStatus,
      notes: notes || null
    };

    this.isSaving.set(true);

    this.calibrationProcessesService
      .saveMeterSnapshotReview(current.id, dto)
      .subscribe({
        next: response => {
          this.isSaving.set(false);

          if (!response.succeed || !response.result) {
            this.toast.error(
              response.message ??
              'No se pudo guardar la validación de configuración.'
            );
            return;
          }

          this.toast.success('Validación de configuración guardada correctamente.');
          this.validated.emit(response.result);
          this.close();
        },
        error: () => {
          this.isSaving.set(false);
          this.toast.error('Error al guardar la validación de configuración.');
        }
      });
  }

  close(): void {
    if (this.isSaving()) return;

    this.closed.emit();
  }

  private reset(): void {
    this.form.reset({
      reviewStatus: null,
      notes: ''
    });

    this.isLoading.set(false);
    this.isSaving.set(false);
    this.loadError.set(null);
    this.actaForm.set(null);
    this.snapshot.set(null);
  }
}