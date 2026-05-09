import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

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

import { CalibrationScheduleSubmissionsService } from '../../../my-calibration-items/data-access/calibration-schedule-submissions.service';
import {
  CalibrationScheduleSubmission,
  CalibrationScheduleSubmissionStatus
} from '../../../my-calibration-items/domain/calibration-schedule-submission.model';

type ScheduleSubmissionExtended = CalibrationScheduleSubmission & {
  officializationDocumentUrl?: string | null;
  submittedByFullName?: string | null;
  submittedUserFullName?: string | null;
  submittedByName?: string | null;
  submittedByDisplayName?: string | null;
};

@Component({
  selector: 'app-schedule-submission-reviews-list',
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
    StatusChipComponent
  ],
  templateUrl: './schedule-submission-reviews-list.html',
  styleUrl: './schedule-submission-reviews-list.scss'
})
export class ScheduleSubmissionReviewsListComponent implements OnInit {
  private readonly service = inject(CalibrationScheduleSubmissionsService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly CalibrationScheduleSubmissionStatus = CalibrationScheduleSubmissionStatus;

  dataSource = new MatTableDataSource<CalibrationScheduleSubmission>([]);

  displayedColumns = [
    'plan',
    'pmse',
    'itemsCount',
    'excelDocument',
    'officialDocument',
    'submissionStatus',
    'submittedAt',
    'actions'
  ];

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  searchTerm = '';
  isLoading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    const searchFilter = this.odata.searchInFields(
      [
        'PlanName',
        'PmseCompanyName',
        'SubmittedBy'
      ],
      this.searchTerm
    );

    const submittedFilter = `SubmissionStatus eq ${CalibrationScheduleSubmissionStatus.Submitted}`;

    const filter = [submittedFilter, searchFilter]
      .filter(Boolean)
      .map(value => `(${value})`)
      .join(' and ');

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter,
      orderBy: 'SubmittedAt desc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar cronogramas enviados.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar cronogramas enviados.');
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

  onViewDetail(row: CalibrationScheduleSubmission): void {
    this.router.navigate(['/schedule-submission-reviews', row.id]);
  }

  getExcelUrl(row: CalibrationScheduleSubmission): string | null {
    const value = row.documentUrl?.trim();
    return value || null;
  }

  getOfficializationDocumentUrl(row: CalibrationScheduleSubmission): string | null {
    const extended = row as ScheduleSubmissionExtended;
    const value = extended.officializationDocumentUrl?.trim();
    return value || null;
  }

  formatSubmittedAt(value?: string | null): string {
    const normalized = value?.trim();

    if (!normalized) {
      return '—';
    }

    const [date, rawTime] = normalized.replace('T', ' ').split(' ');
    const time = this.formatTime(rawTime);

    if (!date) {
      return '—';
    }

    return time
      ? `${date} ${time}`
      : date;
  }

  getSubmittedByDisplayName(row: CalibrationScheduleSubmission): string | null {
    const extended = row as ScheduleSubmissionExtended;

    const fullName =
      extended.submittedByFullName ??
      extended.submittedUserFullName ??
      extended.submittedByName ??
      extended.submittedByDisplayName ??
      null;

    return this.normalizeText(fullName);
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

  private formatTime(value?: string | null): string | null {
    const normalized = value?.trim();

    if (!normalized) {
      return null;
    }

    const match = normalized.match(/^(\d{1,2}):(\d{2})/);

    if (!match) {
      return null;
    }

    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  private normalizeText(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized || null;
  }
}