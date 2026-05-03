import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { CalibrationScheduleSubmissionsService } from '../../../my-calibration-items/data-access/calibration-schedule-submissions.service';
import {
  CalibrationScheduleSubmission,
  CalibrationScheduleSubmissionItem,
  CalibrationScheduleSubmissionStatus
} from '../../../my-calibration-items/domain/calibration-schedule-submission.model';

import { RejectScheduleSubmissionDrawerComponent } from '../../ui/reject-schedule-submission-drawer/reject-schedule-submission-drawer';

@Component({
  selector: 'app-schedule-submission-review-detail',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    StatusChipComponent,
    TableCardComponent,
    DrawerShellComponent,
    RejectScheduleSubmissionDrawerComponent
  ],
  templateUrl: './schedule-submission-review-detail.html',
  styleUrl: './schedule-submission-review-detail.scss'
})
export class ScheduleSubmissionReviewDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CalibrationScheduleSubmissionsService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly CalibrationScheduleSubmissionStatus = CalibrationScheduleSubmissionStatus;

  submission = signal<CalibrationScheduleSubmission | null>(null);
  isLoading = signal(false);
  isApproving = signal(false);
  isRejecting = signal(false);

  rejectDrawerOpen = signal(false);

  dataSource = new MatTableDataSource<CalibrationScheduleSubmissionItem>([]);

  displayedColumns = [
    'meter',
    'proposedDate',
    'laboratory',
    'notes'
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.toast.error('No se recibió el identificador del cronograma.');
      this.back();
      return;
    }

    this.load(id);
  }

  get submissionId(): number {
    return this.submission()?.id ?? Number(this.route.snapshot.paramMap.get('id'));
  }

  get itemsCount(): number {
    return this.submission()?.items?.length ?? 0;
  }

  get canReview(): boolean {
    return Number(this.submission()?.submissionStatus) === CalibrationScheduleSubmissionStatus.Submitted;
  }

  load(id = this.submissionId): void {
    this.isLoading.set(true);

    this.service.getById(id).subscribe({
      next: response => {
        this.isLoading.set(false);

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo cargar el cronograma.');
          this.back();
          return;
        }

        this.submission.set(response.result);
        this.dataSource.data = response.result.items ?? [];
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar el cronograma.');
        this.back();
      }
    });
  }

  back(): void {
    this.router.navigate(['/schedule-submission-reviews']);
  }

  onApprove(): void {
    const current = this.submission();

    if (!current || !this.canReview) {
      this.toast.warning('Solo se pueden aprobar cronogramas enviados a CENACE.');
      return;
    }

    this.confirmDialog.confirm({
      title: 'Aprobar cronograma',
      message: `Se aprobará el cronograma de ${current.pmseCompanyName ?? 'PMSE'} para el plan ${current.planYear}. Esto asignará las fechas aprobadas a los ítems. ¿Deseas continuar?`,
      confirmText: 'Aprobar',
      cancelText: 'Cancelar',
      type: 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.isApproving.set(true);

      this.service.approve(current.id, 'Cronograma aprobado.').subscribe({
        next: response => {
          this.isApproving.set(false);

          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo aprobar el cronograma.');
            return;
          }

          this.toast.success('Cronograma aprobado correctamente.');
          this.load(current.id);
        },
        error: () => {
          this.isApproving.set(false);
          this.toast.error('Error al aprobar el cronograma.');
        }
      });
    });
  }

  onRejectClicked(): void {
    if (!this.canReview) {
      this.toast.warning('Solo se pueden rechazar cronogramas enviados a CENACE.');
      return;
    }

    this.rejectDrawerOpen.set(true);
  }

  onRejectDrawerClosed(): void {
    this.rejectDrawerOpen.set(false);
  }

  onRejectConfirmed(reason: string): void {
    const current = this.submission();

    if (!current) return;

    this.isRejecting.set(true);

    this.service.reject(current.id, reason).subscribe({
      next: response => {
        this.isRejecting.set(false);

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo rechazar el cronograma.');
          return;
        }

        this.toast.success('Cronograma rechazado correctamente.');
        this.rejectDrawerOpen.set(false);
        this.load(current.id);
      },
      error: () => {
        this.isRejecting.set(false);
        this.toast.error('Error al rechazar el cronograma.');
      }
    });
  }

  getStatusLabel(status: CalibrationScheduleSubmissionStatus): string {
    switch (Number(status)) {
      case CalibrationScheduleSubmissionStatus.Draft:
        return 'Borrador';

      case CalibrationScheduleSubmissionStatus.Submitted:
        return 'Enviado a CENACE';

      case CalibrationScheduleSubmissionStatus.Approved:
        return 'Aprobado';

      case CalibrationScheduleSubmissionStatus.Rejected:
        return 'Rechazado';

      default:
        return '—';
    }
  }

  getStatusTone(
    status: CalibrationScheduleSubmissionStatus
  ): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (Number(status)) {
      case CalibrationScheduleSubmissionStatus.Draft:
        return 'warning';

      case CalibrationScheduleSubmissionStatus.Submitted:
        return 'primary';

      case CalibrationScheduleSubmissionStatus.Approved:
        return 'success';

      case CalibrationScheduleSubmissionStatus.Rejected:
        return 'danger';

      default:
        return 'neutral';
    }
  }

  getStatusIcon(status: CalibrationScheduleSubmissionStatus): string {
    switch (Number(status)) {
      case CalibrationScheduleSubmissionStatus.Submitted:
        return 'send';

      case CalibrationScheduleSubmissionStatus.Approved:
        return 'check_circle';

      case CalibrationScheduleSubmissionStatus.Rejected:
        return 'cancel';

      case CalibrationScheduleSubmissionStatus.Draft:
        return 'edit_note';

      default:
        return 'info';
    }
  }
}