import { Router } from '@angular/router';

import { Component, OnInit, inject, signal } from '@angular/core';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';

import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

import { CalibrationScheduleSubmissionsService } from '../../../my-calibration-items/data-access/calibration-schedule-submissions.service';
import {
  CalibrationScheduleSubmission,
  CalibrationScheduleSubmissionStatus
} from '../../../my-calibration-items/domain/calibration-schedule-submission.model';
import { CreateScheduleSubmissionDrawerComponent } from '../../ui/create-schedule-submission-drawer/create-schedule-submission-drawer';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

@Component({
  selector: 'app-my-schedule-submissions-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    PageHeaderComponent,
    SearchToolbarComponent,
    TableCardComponent,
    StatusChipComponent,
    DrawerShellComponent,
    CreateScheduleSubmissionDrawerComponent
  ],
  templateUrl: './my-schedule-submissions-list.html',
  styleUrl: './my-schedule-submissions-list.scss'
})
export class MyScheduleSubmissionsListComponent implements OnInit {
  private readonly service = inject(CalibrationScheduleSubmissionsService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly userScope = inject(UserScopeService);
  private readonly router = inject(Router);

  createDrawerOpen = signal(false);

  readonly CalibrationScheduleSubmissionStatus = CalibrationScheduleSubmissionStatus;

  dataSource = new MatTableDataSource<CalibrationScheduleSubmission>([]);

  displayedColumns = [
    'plan',
    'itemsCount',
    'excelDocument',
    'officialDocument',
    'submissionStatus',
    'submittedAt',
    'review',
    'actions'
  ];

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  searchTerm = '';
  isLoading = signal(false);
  generatingDocumentId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  get pmseCompanyName(): string {
    return this.userScope.pmseCompanyName() ?? 'tu empresa';
  }

  load(): void {
    this.isLoading.set(true);

    const searchFilter = this.odata.searchInFields(
      [
        'PlanName',
        'PmseCompanyName',
        'SubmittedBy',
        'ReviewedBy'
      ],
      this.searchTerm
    );

    const pmseFilter = this.userScope.getPmseFilter('PmseCompanyId');

    const filter = [searchFilter, pmseFilter]
      .filter(Boolean)
      .map(value => `(${value})`)
      .join(' and ');

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: filter || undefined,
      orderBy: 'CreatedAt desc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar cronogramas.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar cronogramas.');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  getExcelUrl(row: CalibrationScheduleSubmission): string | null {
    const value = row.documentUrl?.trim();
    return value || null;
  }

  getOfficializationDocumentUrl(row: CalibrationScheduleSubmission): string | null {
    const value = row.officializationDocumentUrl?.trim();
    return value || null;
  }

  canSubmit(row: CalibrationScheduleSubmission): boolean {
    return Number(row.submissionStatus) === CalibrationScheduleSubmissionStatus.Draft &&
      (row.itemsCount ?? 0) > 0 &&
      !!this.getExcelUrl(row) &&
      !!this.getOfficializationDocumentUrl(row);
  }

  canGenerateExcel(row: CalibrationScheduleSubmission): boolean {
    return Number(row.submissionStatus) === CalibrationScheduleSubmissionStatus.Draft &&
      (row.itemsCount ?? 0) > 0;
  }

  onCreateClicked(): void {
    this.createDrawerOpen.set(true);
  }

  onCreateDrawerClosed(): void {
    this.createDrawerOpen.set(false);
  }

  onScheduleCreated(): void {
    this.createDrawerOpen.set(false);
    this.pageIndex = 0;
    this.load();
  }

  onGenerateOfficialDocument(row: CalibrationScheduleSubmission): void {
    if (!this.canGenerateExcel(row)) {
      this.toast.warning('El cronograma debe estar en borrador y tener al menos un ítem.');
      return;
    }

    this.confirmDialog.confirm({
      title: row.documentUrl ? 'Regenerar Excel oficial' : 'Generar Excel oficial',
      message: row.documentUrl
        ? 'Se generará nuevamente el Excel oficial del cronograma. ¿Deseas continuar?'
        : 'Se generará el Excel oficial del cronograma con los ítems agregados. ¿Deseas continuar?',
      confirmText: row.documentUrl ? 'Regenerar' : 'Generar',
      cancelText: 'Cancelar',
      type: 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.generatingDocumentId.set(row.id);

      this.service.generateOfficialDocument(row.id).subscribe({
        next: response => {
          this.generatingDocumentId.set(null);

          if (!response.succeed || !response.result) {
            this.toast.error(response.message ?? 'No se pudo generar el Excel oficial.');
            return;
          }

          this.toast.success('Excel oficial generado correctamente.');
          this.load();
        },
        error: () => {
          this.generatingDocumentId.set(null);
          this.toast.error('Error al generar el Excel oficial.');
        }
      });
    });
  }

  onSubmit(row: CalibrationScheduleSubmission): void {
    if (!this.canSubmit(row)) {
      this.toast.warning('El cronograma debe estar en borrador, tener ítems, Excel oficial y documento oficial.');
      return;
    }

    this.confirmDialog.confirm({
      title: 'Enviar cronograma a CENACE',
      message: `Se enviará el cronograma del plan ${row.planYear} para revisión. Luego no podrás editarlo. ¿Deseas continuar?`,
      confirmText: 'Enviar',
      cancelText: 'Cancelar',
      type: 'warning'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.service.submit(row.id).subscribe({
        next: response => {
          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo enviar el cronograma.');
            return;
          }

          this.toast.success('Cronograma enviado a CENACE.');
          this.load();
        },
        error: () => {
          this.toast.error('Error al enviar el cronograma.');
        }
      });
    });
  }

  onViewDetail(row: CalibrationScheduleSubmission): void {
    this.router.navigate(['/my-schedule-submissions', row.id]);
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

      case CalibrationScheduleSubmissionStatus.Cancelled:
        return 'Cancelado';

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

      case CalibrationScheduleSubmissionStatus.Cancelled:
        return 'neutral';

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

      case CalibrationScheduleSubmissionStatus.Cancelled:
        return 'block';

      default:
        return 'info';
    }
  }

  formatDateTimeMinute(value?: string | null): string {
    if (!value) {
      return '—';
    }

    const normalized = value.replace('T', ' ').trim();

    const match = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/.exec(normalized);

    if (match) {
      return `${match[1]} ${match[2]}:${match[3]}`;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    const year = parsed.getFullYear();
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    const hours = `${parsed.getHours()}`.padStart(2, '0');
    const minutes = `${parsed.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}