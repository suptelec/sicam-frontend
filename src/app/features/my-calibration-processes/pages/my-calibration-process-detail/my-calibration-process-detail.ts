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

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import {
  CalibrationProcess,
  CalibrationProcessDocument,
  CalibrationProcessDocumentType,
  CalibrationProcessEventType,
  CalibrationProcessStatus
} from '../../../my-calibration-items/domain/calibration-process.model';

import { ProcessDocumentDrawerComponent } from '../../ui/process-document-drawer/process-document-drawer';

import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ProcessEventDrawerComponent } from '../../ui/process-event-drawer/process-event-drawer';
import { StartCorrectionDrawerComponent } from '../../ui/start-correction-drawer/start-correction-drawer';
import { UpdateProcessDataDrawerComponent } from '../../ui/update-process-data-drawer/update-process-data-drawer';

@Component({
  selector: 'app-my-calibration-process-detail',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    TableCardComponent,
    StatusChipComponent,
    DrawerShellComponent,
    ProcessDocumentDrawerComponent,
    ProcessEventDrawerComponent,
    StartCorrectionDrawerComponent,
    UpdateProcessDataDrawerComponent
  ],
  templateUrl: './my-calibration-process-detail.html',
  styleUrl: './my-calibration-process-detail.scss'
})
export class MyCalibrationProcessDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CalibrationProcessesService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  

  readonly CalibrationProcessDocumentType = CalibrationProcessDocumentType;
  readonly CalibrationProcessEventType = CalibrationProcessEventType;
  readonly CalibrationProcessStatus = CalibrationProcessStatus;

  eventDrawerOpen = signal(false);
  isSubmitting = signal(false);
  process = signal<CalibrationProcess | null>(null);
  isLoading = signal(false);
  documentDrawerOpen = signal(false);
  startCorrectionDrawerOpen = signal(false);
  updateDataDrawerOpen = signal(false);

  dataSource = new MatTableDataSource<CalibrationProcessDocument>([]);

  displayedColumns = [
    'documentType',
    'fileName',
    'description',
    'actions'
  ];

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

  get hasCertificate(): boolean {
    return this.documents.some(x =>
      Number(x.documentType) === CalibrationProcessDocumentType.CalibrationCertificate
    );
  }

  get hasAct(): boolean {
    return this.documents.some(x =>
      Number(x.documentType) === CalibrationProcessDocumentType.CalibrationAct
    );
  }

  get canContinueToReview(): boolean {
    return this.hasCertificate && this.hasAct;
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
        this.dataSource.data = response.result.documents ?? [];
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar el proceso.');
        this.back();
      }
    });
  }

  back(): void {
    this.router.navigate(['/my-calibration-items']);
  }

  onAddDocument(): void {
    this.documentDrawerOpen.set(true);
  }

  onDocumentDrawerClosed(): void {
    this.documentDrawerOpen.set(false);
  }

  onDocumentCreated(): void {
    this.documentDrawerOpen.set(false);
    this.load();
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

  getProcessStatusLabel(status: CalibrationProcessStatus): string {
    switch (Number(status)) {
      case CalibrationProcessStatus.InProcess:
        return 'En proceso';

      case CalibrationProcessStatus.Submitted:
        return 'Enviado a revisión';

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

onEditDataClicked(): void {
  if (!this.canEditProcess) {
    this.toast.warning('Solo puedes editar procesos en estado En proceso o En corrección.');
    return;
  }

  this.updateDataDrawerOpen.set(true);
}

onUpdateDataDrawerClosed(): void {
  this.updateDataDrawerOpen.set(false);
}

onProcessDataUpdated(): void {
  this.updateDataDrawerOpen.set(false);
  this.load();
}

get hasCalibrationExecutedEvent(): boolean {
  return this.process()?.events?.some(x =>
    Number(x.eventType) === CalibrationProcessEventType.CalibrationExecuted
  ) ?? false;
}


get canStartCorrection(): boolean {
  return Number(this.process()?.processStatus) === CalibrationProcessStatus.Rejected;
}

get canEditProcess(): boolean {
  const status = Number(this.process()?.processStatus);

  return status === CalibrationProcessStatus.InProcess ||
    status === CalibrationProcessStatus.Corrected;
}

get hasCorrectionEvent(): boolean {
  return this.process()?.events?.some(x =>
    Number(x.eventType) === CalibrationProcessEventType.CorrectionRegistered
  ) ?? false;
}

get canSubmitToReview(): boolean {
  const current = this.process();

  if (!current) return false;

  const status = Number(current.processStatus);

  const validStatus =
    status === CalibrationProcessStatus.InProcess ||
    status === CalibrationProcessStatus.Corrected;

  const hasRequiredEvent = status === CalibrationProcessStatus.Corrected
    ? this.hasCalibrationExecutedEvent && this.hasCorrectionEvent
    : this.hasCalibrationExecutedEvent;

  return validStatus &&
    this.hasCertificate &&
    this.hasAct &&
    hasRequiredEvent;
}

onAddEvent(): void {
  this.eventDrawerOpen.set(true);
}

onEventDrawerClosed(): void {
  this.eventDrawerOpen.set(false);
}

onEventCreated(): void {
  this.eventDrawerOpen.set(false);
  this.load();
}

onStartCorrectionClicked(): void {
  if (!this.canStartCorrection) {
    this.toast.warning('Solo puedes iniciar corrección cuando el proceso está rechazado.');
    return;
  }

  this.startCorrectionDrawerOpen.set(true);
}

onStartCorrectionDrawerClosed(): void {
  this.startCorrectionDrawerOpen.set(false);
}

onCorrectionStarted(): void {
  this.startCorrectionDrawerOpen.set(false);
  this.load();
}

onSubmitToReview(): void {
  const current = this.process();

  if (!current) return;

  if (!this.canSubmitToReview) {
    this.toast.warning('Debes cargar certificado, acta y registrar el evento de calibración ejecutada.');
    return;
  }

  this.confirmDialog.confirm({
    title: 'Enviar proceso a revisión',
    message: 'Se enviará el proceso de calibración a revisión CENACE. Luego no podrás editarlo mientras esté en revisión. ¿Deseas continuar?',
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
          this.toast.error(response.message ?? 'No se pudo enviar el proceso a revisión.');
          return;
        }

        this.toast.success('Proceso enviado a revisión CENACE.');
        this.load(current.id);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error al enviar el proceso a revisión.');
      }
    });
  });
}

  getProcessStatusTone(
    status: CalibrationProcessStatus
  ): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (Number(status)) {
      case CalibrationProcessStatus.InProcess:
      case CalibrationProcessStatus.Corrected:
        return 'info';

      case CalibrationProcessStatus.Submitted:
        return 'primary';

      case CalibrationProcessStatus.Approved:
        return 'success';

      case CalibrationProcessStatus.Rejected:
        return 'danger';

      default:
        return 'neutral';
    }
  }
}