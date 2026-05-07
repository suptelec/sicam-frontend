import {
  Component,
  EventEmitter,
  Output,
  effect,
  inject,
  input,
  signal
} from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationPlanItem } from '../../../calibration-plans/domain/calibration-plan.model';

import { WorkAuthorizationsService } from '../../data-access/work-authorizations.service';
import { CalibrationProcessesService } from '../../data-access/calibration-processes.service';

import {
  AuthorizationMeterSnapshot,
  AuthorizationMeterSnapshotPhoto,
  CalibrationWorkAuthorization
} from '../../domain/work-authorization.model';

import { CreateCalibrationProcessRequest } from '../../domain/calibration-process.model';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';

@Component({
  selector: 'app-start-calibration-process-drawer',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DrawerActionsComponent,
    DateFieldComponent
  ],
  templateUrl: './start-calibration-process-drawer.html',
  styleUrl: './start-calibration-process-drawer.scss'
})
export class StartCalibrationProcessDrawerComponent {
  item = input<CalibrationPlanItem | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<number>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly workAuthorizationsService = inject(WorkAuthorizationsService);
  private readonly toast = inject(ToastService);

  loading = false;

  readonly isLoadingSnapshot = signal(false);
  readonly approvedAuthorization = signal<CalibrationWorkAuthorization | null>(null);
  readonly snapshot = signal<AuthorizationMeterSnapshot | null>(null);
  readonly snapshotLoadAttempted = signal(false);

  readonly form = this.fb.group({
    executionDate: ['', Validators.required],
    notes: ['', [Validators.maxLength(1000)]]
  });

  constructor() {
    effect(() => {
      const currentItem = this.item();

      this.snapshot.set(null);
      this.approvedAuthorization.set(null);
      this.snapshotLoadAttempted.set(false);

      this.form.reset({
        executionDate: currentItem?.scheduledDate ?? '',
        notes: ''
      });

      if (!currentItem) return;

      this.loadAuthorizationSnapshot(currentItem.id);
    });
  }

  get currentItem(): CalibrationPlanItem | null {
    return this.item();
  }

  get scheduledDate(): string | null {
    return this.currentItem?.scheduledDate ?? null;
  }

  get photos(): AuthorizationMeterSnapshotPhoto[] {
    return [...(this.snapshot()?.photos ?? [])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  get hasReferencePhotos(): boolean {
    return this.photos.length > 0;
  }

  get canStartProcess(): boolean {
    return !!this.currentItem &&
      !!this.scheduledDate &&
      this.hasReferencePhotos;
  }

  get saveDisabled(): boolean {
    return this.loading ||
      this.isLoadingSnapshot() ||
      this.form.invalid ||
      !this.canStartProcess;
  }

  submit(): void {
    const currentItem = this.currentItem;

    if (!currentItem) {
      this.toast.error('No se recibió el ítem del plan.');
      return;
    }

    if (!this.scheduledDate) {
      this.toast.warning('El ítem no tiene fecha de cronograma aprobada.');
      return;
    }

    if (!this.hasReferencePhotos) {
      this.toast.warning(
        'No se puede iniciar la calibración porque no se encontraron fotos de referencia enviadas por CENACE.'
      );
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de iniciar.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreateCalibrationProcessRequest = {
      executionDate: this.normalizeRequired(raw.executionDate),
      notes: this.normalize(raw.notes)
    };

    this.loading = true;

    this.service.createForPlanItem(currentItem.id, dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo iniciar el proceso.');
          return;
        }

        this.toast.success('Proceso de calibración iniciado correctamente.');
        this.created.emit(response.result.id);
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al iniciar el proceso de calibración.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  private loadAuthorizationSnapshot(calibrationPlanItemId: number): void {
    this.isLoadingSnapshot.set(true);

    this.workAuthorizationsService
      .findApprovedByPlanItem(calibrationPlanItemId)
      .subscribe({
        next: authorization => {
          this.approvedAuthorization.set(authorization);

          if (!authorization) {
            this.snapshot.set(null);
            this.snapshotLoadAttempted.set(true);
            this.isLoadingSnapshot.set(false);
            return;
          }

          this.workAuthorizationsService
            .getMeterSnapshot(authorization.id)
            .subscribe({
              next: response => {
                this.isLoadingSnapshot.set(false);
                this.snapshotLoadAttempted.set(true);

                if (response.succeed) {
                  this.snapshot.set(response.result ?? null);
                  return;
                }

                this.snapshot.set(null);
              },
              error: () => {
                this.isLoadingSnapshot.set(false);
                this.snapshotLoadAttempted.set(true);
                this.snapshot.set(null);
              }
            });
        },
        error: () => {
          this.isLoadingSnapshot.set(false);
          this.snapshotLoadAttempted.set(true);
          this.approvedAuthorization.set(null);
          this.snapshot.set(null);
        }
      });
  }

  private reset(): void {
    this.form.reset({
      executionDate: '',
      notes: ''
    });

    this.loading = false;
    this.isLoadingSnapshot.set(false);
    this.approvedAuthorization.set(null);
    this.snapshot.set(null);
    this.snapshotLoadAttempted.set(false);
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