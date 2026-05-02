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

import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { CalibrationScheduleSubmissionsService } from '../../../my-calibration-items/data-access/calibration-schedule-submissions.service';
import {
  CalibrationScheduleSubmission,
  CalibrationScheduleSubmissionItem,
  CalibrationScheduleSubmissionStatus
} from '../../../my-calibration-items/domain/calibration-schedule-submission.model';

@Component({
  selector: 'app-my-schedule-submission-detail',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    StatusChipComponent,
    TableCardComponent
  ],
  templateUrl: './my-schedule-submission-detail.html',
  styleUrl: './my-schedule-submission-detail.scss'
})
export class MyScheduleSubmissionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CalibrationScheduleSubmissionsService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly CalibrationScheduleSubmissionStatus = CalibrationScheduleSubmissionStatus;

  submission = signal<CalibrationScheduleSubmission | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);

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

  get hasDocument(): boolean {
    return !!this.submission()?.documentUrl;
  }

  get canSubmit(): boolean {
    const current = this.submission();

    return !!current &&
      Number(current.submissionStatus) === CalibrationScheduleSubmissionStatus.Draft &&
      this.itemsCount > 0 &&
      this.hasDocument;
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
    this.router.navigate(['/my-schedule-submissions']);
  }

  onSubmit(): void {
    const current = this.submission();

    if (!current) return;

    if (!this.canSubmit) {
      this.toast.warning('El cronograma debe estar en borrador, tener ítems y documento oficial.');
      return;
    }

    this.confirmDialog.confirm({
      title: 'Enviar cronograma a CENACE',
      message: `Se enviará el cronograma del plan ${current.planYear} para revisión. Luego no podrás editarlo. ¿Deseas continuar?`,
      confirmText: 'Enviar',
      cancelText: 'Cancelar',
      type: 'warning'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.isSubmitting.set(true);

      this.service.submit(current.id).subscribe({
        next: response => {
          this.isSubmitting.set(false);

          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo enviar el cronograma.');
            return;
          }

          this.toast.success('Cronograma enviado a CENACE.');
          this.load(current.id);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toast.error('Error al enviar el cronograma.');
        }
      });
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
      case CalibrationScheduleSubmissionStatus.Draft:
        return 'edit_note';

      case CalibrationScheduleSubmissionStatus.Submitted:
        return 'send';

      case CalibrationScheduleSubmissionStatus.Approved:
        return 'check_circle';

      case CalibrationScheduleSubmissionStatus.Rejected:
        return 'cancel';

      default:
        return 'info';
    }
  }
}