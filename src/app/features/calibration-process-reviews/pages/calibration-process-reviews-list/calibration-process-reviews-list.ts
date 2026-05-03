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

import { ToastService } from '../../../../core/services/toast.service';
import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import {
  CalibrationProcess,
  CalibrationProcessStatus
} from '../../../my-calibration-items/domain/calibration-process.model';

@Component({
  selector: 'app-calibration-process-reviews-list',
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
  templateUrl: './calibration-process-reviews-list.html',
  styleUrl: './calibration-process-reviews-list.scss'
})
export class CalibrationProcessReviewsListComponent implements OnInit {
  private readonly service = inject(CalibrationProcessesService);
  private readonly toast = inject(ToastService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly router = inject(Router);

  readonly CalibrationProcessStatus = CalibrationProcessStatus;

  dataSource = new MatTableDataSource<CalibrationProcess>([]);

  displayedColumns = [
    'meter',
    'pmse',
    'certificate',
    'executionDate',
    'processStatus',
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

    const submittedFilter = `ProcessStatus eq ${CalibrationProcessStatus.Submitted}`;

    const searchFilter = this.odata.searchInFields(
      [
        'MeterCode',
        'MeterSerial',
        'PmseCompanyName',
        'CertificateNumber',
        'LaboratoryName'
      ],
      this.searchTerm
    );

    const filter = [submittedFilter, searchFilter]
      .filter(Boolean)
      .map(value => `(${value})`)
      .join(' and ');

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter,
      orderBy: 'CreatedAt desc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar procesos en revisión.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar procesos en revisión.');
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

  onViewDetail(row: CalibrationProcess): void {
    this.router.navigate(['/calibration-process-reviews', row.id]);
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
}