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
    'document',
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

      default:
        return 'info';
    }
  }
}