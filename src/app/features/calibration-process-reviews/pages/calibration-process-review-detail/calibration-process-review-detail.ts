import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import {
  CalibrationProcess,
  CalibrationProcessDocument,
  CalibrationProcessDocumentType,
  CalibrationProcessStatus,
  CalibrationResult,
  MeterSnapshotReview
} from '../../../my-calibration-items/domain/calibration-process.model';

import { RejectCalibrationProcessDrawerComponent } from '../../ui/reject-calibration-process-drawer/reject-calibration-process-drawer';
import { MeterSnapshotReviewDrawerComponent } from '../../ui/meter-snapshot-review-drawer/meter-snapshot-review-drawer';

@Component({
  selector: 'app-calibration-process-review-detail',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    StatusChipComponent,
    DrawerShellComponent,
    RejectCalibrationProcessDrawerComponent,
    MeterSnapshotReviewDrawerComponent
  ],
  templateUrl: './calibration-process-review-detail.html',
  styleUrl: './calibration-process-review-detail.scss'
})
export class CalibrationProcessReviewDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CalibrationProcessesService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly CalibrationProcessStatus = CalibrationProcessStatus;
  readonly CalibrationProcessDocumentType = CalibrationProcessDocumentType;

  process = signal<CalibrationProcess | null>(null);

  isLoading = signal(false);
  isApproving = signal(false);
  isRejecting = signal(false);

  rejectDrawerOpen = signal(false);
  snapshotReviewDrawerOpen = signal(false);
  meterSnapshotValidationSaved = signal(false);

  documentsDataSource = new MatTableDataSource<CalibrationProcessDocument>([]);

  documentColumns = ['documentType', 'fileName', 'description', 'actions'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.toast.error('No se recibió el identificador del proceso.');
      this.back();
      return;
    }

    this.load(id);
  }

  get processId(): number {
    return this.process()?.id ?? Number(this.route.snapshot.paramMap.get('id'));
  }

  get documents(): CalibrationProcessDocument[] {
    return this.process()?.documents ?? [];
  }

  get certificateDocuments(): CalibrationProcessDocument[] {
    return this.documents.filter(document =>
      Number(document.documentType) === CalibrationProcessDocumentType.CalibrationCertificate
    );
  }

  get signedActaDocument(): CalibrationProcessDocument | null {
    return this.documents
      .filter(document => Number(document.documentType) === CalibrationProcessDocumentType.CalibrationAct)
      .at(-1) ?? null;
  }

  get signedActaUrl(): string | null {
    const documentUrl = this.signedActaDocument?.fileUrl?.trim();

    if (documentUrl) {
      return documentUrl;
    }

    const processUrl = this.process()?.calibrationActUrl?.trim();

    return processUrl || null;
  }

  get hasCertificate(): boolean {
    return this.certificateDocuments.length > 0;
  }

  get hasSignedActaPdf(): boolean {
    return !!this.signedActaUrl;
  }

  get canApprove(): boolean {
    const current = this.process();

    return !!current &&
      Number(current.processStatus) === CalibrationProcessStatus.Submitted &&
      Number(current.calibrationResult) === CalibrationResult.Approved &&
      this.hasCertificate &&
      this.hasSignedActaPdf &&
      this.meterSnapshotValidationSaved();
  }

  get canReject(): boolean {
    return Number(this.process()?.processStatus) === CalibrationProcessStatus.Submitted;
  }

  get approveTooltip(): string {
    if (this.canApprove) {
      return 'Aprobar proceso final';
    }

    const missing = this.getMissingApprovalRequirements();

    return missing.length
      ? `Falta: ${missing.join(', ')}`
      : 'Solo se puede aprobar un proceso enviado a revisión.';
  }

  load(id = this.processId): void {
    this.isLoading.set(true);

    this.service.getById(id).subscribe({
      next: response => {
        this.isLoading.set(false);

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo cargar el proceso.');
          this.back();
          return;
        }

        this.process.set(response.result);
        this.documentsDataSource.data = response.result.documents ?? [];
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar el proceso.');
        this.back();
      }
    });
  }

  back(): void {
    this.router.navigate(['/calibration-process-reviews']);
  }

  onApprove(): void {
    const current = this.process();

    if (!current) return;

    if (!this.canApprove) {
      const missing = this.getMissingApprovalRequirements();

      this.toast.warning(
        missing.length
          ? `No se puede aprobar el proceso. Falta: ${missing.join(', ')}.`
          : 'No se puede aprobar el proceso.'
      );

      return;
    }

    this.confirmDialog.confirm({
      title: 'Aprobar proceso de calibración',
      message: 'Se aprobará el proceso final. Esto actualizará el certificado vigente del medidor. ¿Deseas continuar?',
      confirmText: 'Aprobar',
      cancelText: 'Cancelar',
      type: 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.isApproving.set(true);

      this.service.approve(current.id, {
        comments: 'Documentación revisada y aprobada por CENACE.'
      }).subscribe({
        next: response => {
          this.isApproving.set(false);

          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo aprobar el proceso.');
            return;
          }

          this.toast.success('Proceso aprobado correctamente.');
          this.load(current.id);
        },
        error: () => {
          this.isApproving.set(false);
          this.toast.error('Error al aprobar el proceso.');
        }
      });
    });
  }

  onRejectClicked(): void {
    if (!this.canReject) {
      this.toast.warning('Solo se pueden rechazar procesos en revisión.');
      return;
    }

    this.rejectDrawerOpen.set(true);
  }

  onRejectDrawerClosed(): void {
    this.rejectDrawerOpen.set(false);
  }

  onRejectConfirmed(reason: string): void {
    const current = this.process();

    if (!current) return;

    this.isRejecting.set(true);

    this.service.reject(current.id, {
      rejectionReason: reason
    }).subscribe({
      next: response => {
        this.isRejecting.set(false);

        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo rechazar el proceso.');
          return;
        }

        this.toast.success('Proceso rechazado correctamente.');
        this.rejectDrawerOpen.set(false);
        this.load(current.id);
      },
      error: () => {
        this.isRejecting.set(false);
        this.toast.error('Error al rechazar el proceso.');
      }
    });
  }

  onSnapshotReviewClicked(): void {
    const current = this.process();

    if (!current) return;

    if (Number(current.processStatus) !== CalibrationProcessStatus.Submitted) {
      this.toast.warning('Solo se puede validar la configuración cuando el proceso está en revisión.');
      return;
    }

    this.snapshotReviewDrawerOpen.set(true);
  }

  onSnapshotReviewDrawerClosed(): void {
    this.snapshotReviewDrawerOpen.set(false);
  }

  onMeterSnapshotValidated(review: MeterSnapshotReview): void {
    this.snapshotReviewDrawerOpen.set(false);
    this.meterSnapshotValidationSaved.set(true);

    if (Number(review.reviewStatus) === 3) {
      this.toast.warning(
        'La configuración fue marcada como no coincidente. El proceso no podrá aprobarse hasta corregir la observación.'
      );
    }
  }

  getDocumentTypeLabel(type: CalibrationProcessDocumentType): string {
    switch (Number(type)) {
      case CalibrationProcessDocumentType.CalibrationCertificate:
        return 'Certificado de calibración';

      case CalibrationProcessDocumentType.CalibrationAct:
        return 'Acta firmada';

      default:
        return 'Documento';
    }
  }

  getCalibrationResultLabel(result: CalibrationResult | null | undefined): string {
    switch (Number(result)) {
      case CalibrationResult.Approved:
        return 'Aprobada';

      case CalibrationResult.Rejected:
        return 'Rechazada';

      default:
        return 'Pendiente';
    }
  }

  getProcessStatusLabel(status: CalibrationProcessStatus): string {
    switch (Number(status)) {
      case CalibrationProcessStatus.InProcess:
        return 'En proceso';

      case CalibrationProcessStatus.Submitted:
        return 'En revisión';

      case CalibrationProcessStatus.Approved:
        return 'Aprobado';

      case CalibrationProcessStatus.Rejected:
        return 'Rechazado';

      case CalibrationProcessStatus.Corrected:
        return 'Corregido';

      default:
        return '—';
    }
  }

  getProcessStatusTone(
    status: CalibrationProcessStatus
  ): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (Number(status)) {
      case CalibrationProcessStatus.Submitted:
        return 'primary';

      case CalibrationProcessStatus.Approved:
        return 'success';

      case CalibrationProcessStatus.Rejected:
        return 'danger';

      case CalibrationProcessStatus.InProcess:
      case CalibrationProcessStatus.Corrected:
        return 'info';

      default:
        return 'neutral';
    }
  }

  private getMissingApprovalRequirements(): string[] {
    const missing: string[] = [];
    const current = this.process();

    if (!current || Number(current.processStatus) !== CalibrationProcessStatus.Submitted) {
      missing.push('proceso en revisión');
    }

    if (Number(current?.calibrationResult) !== CalibrationResult.Approved) {
      missing.push('resultado aprobado');
    }

    if (!this.hasCertificate) {
      missing.push('certificado(s) PDF');
    }

    if (!this.hasSignedActaPdf) {
      missing.push('acta firmada en PDF');
    }

    if (!this.meterSnapshotValidationSaved()) {
      missing.push('validación de configuración del medidor');
    }

    return missing;
  }
}