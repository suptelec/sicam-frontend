import { Component, OnInit, inject, signal } from '@angular/core';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';

import { ToastService } from '../../../../core/services/toast.service';
import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

import { DateChangeRequestsService } from '../../../my-calibration-items/data-access/date-change-requests.service';
import {
  CalibrationDateChangeRequest,
  CalibrationDateChangeRequestStatus
} from '../../../my-calibration-items/domain/date-change-request.model';

@Component({
  selector: 'app-my-date-change-requests-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    PageHeaderComponent,
    SearchToolbarComponent,
    TableCardComponent,
    StatusChipComponent
  ],
  templateUrl: './my-date-change-requests-list.html',
  styleUrl: './my-date-change-requests-list.scss'
})
export class MyDateChangeRequestsListComponent implements OnInit {
  private readonly service = inject(DateChangeRequestsService);
  private readonly toast = inject(ToastService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly userScope = inject(UserScopeService);

  readonly CalibrationDateChangeRequestStatus = CalibrationDateChangeRequestStatus;

  dataSource = new MatTableDataSource<CalibrationDateChangeRequest>([]);

  displayedColumns = [
    'item',
    'currentRange',
    'requestedRange',
    'reason',
    'requestStatus',
    'review'
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

  get pmseCompanyName(): string {
    return this.userScope.pmseCompanyName() ?? 'tu empresa';
  }

  load(): void {
    this.isLoading.set(true);

    const searchFilter = this.odata.searchInFields(
      [
        'PmseCompanyName',
        'Reason',
        'ReviewNotes'
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
          this.toast.error(response.message ?? 'Error al cargar las solicitudes.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar las solicitudes.');
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

  getStatusLabel(status: CalibrationDateChangeRequestStatus): string {
    switch (Number(status)) {
      case CalibrationDateChangeRequestStatus.Pending:
        return 'Pendiente';

      case CalibrationDateChangeRequestStatus.Approved:
        return 'Aprobada';

      case CalibrationDateChangeRequestStatus.Rejected:
        return 'Rechazada';

      default:
        return '—';
    }
  }

  getStatusTone(
    status: CalibrationDateChangeRequestStatus
  ): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (Number(status)) {
      case CalibrationDateChangeRequestStatus.Pending:
        return 'warning';

      case CalibrationDateChangeRequestStatus.Approved:
        return 'success';

      case CalibrationDateChangeRequestStatus.Rejected:
        return 'danger';

      default:
        return 'neutral';
    }
  }

  getStatusIcon(status: CalibrationDateChangeRequestStatus): string {
    switch (Number(status)) {
      case CalibrationDateChangeRequestStatus.Pending:
        return 'hourglass_top';

      case CalibrationDateChangeRequestStatus.Approved:
        return 'check_circle';

      case CalibrationDateChangeRequestStatus.Rejected:
        return 'cancel';

      default:
        return 'info';
    }
  }
}