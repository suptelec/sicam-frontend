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
  CalibrationProcessEvent,
  CalibrationProcessEventType,
  CalibrationProcessStatus,
  CalibrationResult,
  MeterCalibrationActa,
  MeterCalibrationActaFormResponse,
  MeterCalibrationActaSeal
} from '../../../my-calibration-items/domain/calibration-process.model';

import { ProcessEventDrawerComponent } from '../../ui/process-event-drawer/process-event-drawer';
import { StartCorrectionDrawerComponent } from '../../ui/start-correction-drawer/start-correction-drawer';
import { UpdateProcessDataDrawerComponent } from '../../ui/update-process-data-drawer/update-process-data-drawer';
import { MeterCalibrationActaDrawerComponent } from '../../ui/meter-calibration-acta-drawer/meter-calibration-acta-drawer';

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
    ProcessEventDrawerComponent,
    StartCorrectionDrawerComponent,
    UpdateProcessDataDrawerComponent,
    MeterCalibrationActaDrawerComponent
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

  process = signal<CalibrationProcess | null>(null);
  actaForm = signal<MeterCalibrationActaFormResponse | null>(null);
  actaDrawerOpen = signal(false);

  isLoading = signal(false);
  isLoadingActa = signal(false);
  isSubmitting = signal(false);

  eventDrawerOpen = signal(false);
  startCorrectionDrawerOpen = signal(false);
  updateDataDrawerOpen = signal(false);

  documentsDataSource = new MatTableDataSource<CalibrationProcessDocument>([]);
  eventsDataSource = new MatTableDataSource<CalibrationProcessEvent>([]);

  documentColumns = ['documentType', 'fileName', 'description', 'actions'];
  eventColumns = ['eventType', 'occurredAt', 'description', 'attachment'];

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

  get events(): CalibrationProcessEvent[] {
    return this.process()?.events ?? [];
  }

  get existingActa(): MeterCalibrationActa | null {
    return this.actaForm()?.existingActa ?? null;
  }

  get actaSeals(): MeterCalibrationActaSeal[] {
    return this.existingActa?.seals ?? [];
  }

  get hasFinalData(): boolean {
    const current = this.process();

    return !!current?.certificateNumber?.trim() &&
      this.hasValidDate(current.certificateIssueDate) &&
      this.hasValidDate(current.certificateValidUntil) &&
      current.calibrationResult !== null &&
      current.calibrationResult !== undefined;
  }

  get hasCertificate(): boolean {
    return this.documents.some(x =>
      Number(x.documentType) === CalibrationProcessDocumentType.CalibrationCertificate
    );
  }

  get hasCalibrationExecutedEvent(): boolean {
    return this.events.some(x =>
      Number(x.eventType) === CalibrationProcessEventType.CalibrationExecuted
    );
  }

  get hasCorrectionEvent(): boolean {
    return this.events.some(x =>
      Number(x.eventType) === CalibrationProcessEventType.CorrectionRegistered
    );
  }

  get hasActa(): boolean {
    return !!this.existingActa;
  }

  get hasActaChecks(): boolean {
    return (this.existingActa?.checks?.length ?? 0) > 0;
  }

  get hasActaSeals(): boolean {
    return this.actaSeals.length > 0;
  }

  get allActaSealsHavePhotos(): boolean {
    return this.actaSeals.length > 0 &&
      this.actaSeals.every(seal => (seal.photos?.length ?? 0) > 0);
  }

  get hasGeneratedActaFile(): boolean {
    const current = this.process();
    const acta = this.existingActa;

    return !!current?.calibrationActUrl?.trim() ||
      !!acta?.generatedFileUrl?.trim();
  }

  get actaDownloadUrl(): string | null {
    return this.process()?.calibrationActUrl ??
      this.existingActa?.generatedFileUrl ??
      null;
  }

  get canEditProcess(): boolean {
    const status = Number(this.process()?.processStatus);

    return status === CalibrationProcessStatus.InProcess ||
      status === CalibrationProcessStatus.Corrected;
  }

  get canStartCorrection(): boolean {
    return Number(this.process()?.processStatus) === CalibrationProcessStatus.Rejected;
  }

  get canSubmitToReview(): boolean {
    const current = this.process();

    if (!current || !this.canEditProcess) return false;

    const correctionOk = Number(current.processStatus) === CalibrationProcessStatus.Corrected
      ? this.hasCorrectionEvent
      : true;

    return this.hasFinalData &&
      this.hasCertificate &&
      this.hasCalibrationExecutedEvent &&
      this.hasActa &&
      this.hasActaChecks &&
      this.hasActaSeals &&
      this.allActaSealsHavePhotos &&
      correctionOk;
  }

  get submitTooltip(): string {
    if (this.canSubmitToReview) {
      return 'Enviar a revisión CENACE';
    }

    const missing = this.getMissingSubmitRequirements();

    return missing.length
      ? `Falta: ${missing.join(', ')}`
      : 'No se puede enviar a revisión.';
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
        this.eventsDataSource.data = response.result.events ?? [];

        this.loadActaForm(response.result.id);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar el proceso.');
        this.back();
      }
    });
  }

  loadActaForm(processId = this.processId): void {
    this.isLoadingActa.set(true);

    this.service.getActaForm(processId).subscribe({
      next: response => {
        this.isLoadingActa.set(false);

        if (response.succeed) {
          this.actaForm.set(response.result ?? null);
          return;
        }

        this.actaForm.set(null);
      },
      error: () => {
        this.isLoadingActa.set(false);
        this.actaForm.set(null);
      }
    });
  }

  back(): void {
    this.router.navigate(['/my-calibration-items']);
  }



  onAddEvent(): void {
    if (!this.canEditProcess) {
      this.toast.warning('Solo puedes registrar eventos cuando el proceso está en proceso o en corrección.');
      return;
    }

    this.eventDrawerOpen.set(true);
  }

  onEventDrawerClosed(): void {
    this.eventDrawerOpen.set(false);
  }

  onEventCreated(): void {
    this.eventDrawerOpen.set(false);
    this.load(this.processId);
  }

  onEditDataClicked(): void {
    if (!this.canEditProcess) {
      this.toast.warning('Solo puedes registrar datos finales cuando el proceso está en proceso o en corrección.');
      return;
    }

    this.updateDataDrawerOpen.set(true);
  }

  onUpdateDataDrawerClosed(): void {
    this.updateDataDrawerOpen.set(false);
  }

  onProcessDataUpdated(): void {
    this.updateDataDrawerOpen.set(false);
    this.load(this.processId);
  }

onOpenActa(): void {
  if (!this.canEditProcess) {
    this.toast.warning('Solo puedes crear o editar el acta cuando el proceso está en proceso o en corrección.');
    return;
  }

  this.actaDrawerOpen.set(true);
}

onActaDrawerClosed(): void {
  this.actaDrawerOpen.set(false);
}

onActaSaved(): void {
  this.actaDrawerOpen.set(false);
  this.load(this.processId);
}

  onStartCorrectionClicked(): void {
    if (!this.canStartCorrection) {
      this.toast.warning('Solo se puede iniciar corrección cuando el proceso fue rechazado.');
      return;
    }

    this.startCorrectionDrawerOpen.set(true);
  }

  onStartCorrectionDrawerClosed(): void {
    this.startCorrectionDrawerOpen.set(false);
  }

  onCorrectionStarted(): void {
    this.startCorrectionDrawerOpen.set(false);
    this.load(this.processId);
  }

  onSubmitToReview(): void {
    const current = this.process();

    if (!current) return;

    if (!this.canSubmitToReview) {
      const missing = this.getMissingSubmitRequirements();

      this.toast.warning(
        missing.length
          ? `No se puede enviar a revisión. Falta: ${missing.join(', ')}.`
          : 'No se puede enviar a revisión.'
      );

      return;
    }

    this.confirmDialog.confirm({
      title: 'Enviar proceso a revisión',
      message: 'Se enviará el proceso de calibración a revisión CENACE. SICAM generará el acta oficial si las validaciones del backend son correctas. ¿Deseas continuar?',
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

  getEventTypeLabel(type: CalibrationProcessEventType): string {
    switch (Number(type)) {
      case CalibrationProcessEventType.CalibrationExecuted:
        return 'Calibración ejecutada';

      case CalibrationProcessEventType.CorrectionRegistered:
        return 'Corrección registrada';

      default:
        return 'Evento técnico';
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

  private getMissingSubmitRequirements(): string[] {
    const missing: string[] = [];
    const current = this.process();

    if (!this.hasFinalData) {
      missing.push('datos finales');
    }

    if (!this.hasCertificate) {
      missing.push('certificado PDF');
    }

    if (!this.hasCalibrationExecutedEvent) {
      missing.push('evento de calibración ejecutada');
    }

    if (!this.hasActa) {
      missing.push('acta SICAM');
    }

    if (!this.hasActaChecks) {
      missing.push('checks del acta');
    }

    if (!this.hasActaSeals) {
      missing.push('sellos del acta');
    }

    if (this.hasActaSeals && !this.allActaSealsHavePhotos) {
      missing.push('fotos de todos los sellos');
    }

    if (
      Number(current?.processStatus) === CalibrationProcessStatus.Corrected &&
      !this.hasCorrectionEvent
    ) {
      missing.push('evento de corrección');
    }

    return missing;
  }

  private hasValidDate(value: string | null | undefined): boolean {
    if (!value) return false;

    return !value.startsWith('0001-01-01') &&
      !value.startsWith('0001-1-1');
  }
}