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
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

import { CalibrationPlanItemsService } from '../../../calibration-plans/data-access/calibration-plan-items.service';
import {
  CalibrationPlanItem,
  CalibrationPlanItemStatus,
  CalibrationPlanItemStatusLabels
} from '../../../calibration-plans/domain/calibration-plan.model';

import { ScheduleProposalDrawerComponent } from '../../ui/schedule-proposal-drawer/schedule-proposal-drawer';
import { DateChangeRequestDrawerComponent } from '../../ui/date-change-request-drawer/date-change-request-drawer';
import { WorkAuthorizationDrawerComponent } from '../../ui/work-authorization-drawer/work-authorization-drawer';

@Component({
  selector: 'app-my-calibration-items-list',
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
    ScheduleProposalDrawerComponent,
    DateChangeRequestDrawerComponent,
    WorkAuthorizationDrawerComponent
  ],
  templateUrl: './my-calibration-items-list.html',
  styleUrl: './my-calibration-items-list.scss'
})
export class MyCalibrationItemsListComponent implements OnInit {
  private readonly service = inject(CalibrationPlanItemsService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly userScope = inject(UserScopeService);

  readonly CalibrationPlanItemStatus = CalibrationPlanItemStatus;

  workAuthorizationDrawerOpen = signal(false);
  selectedWorkAuthorizationItem = signal<CalibrationPlanItem | null>(null);
  dataSource = new MatTableDataSource<CalibrationPlanItem>([]);

  displayedColumns = [
    'meter',
    'certificate',
    'plannedRange',
    'scheduledDate',
    'itemStatus',
    'actions'
  ];

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  searchTerm = '';
  isLoading = signal(false);

  scheduleDrawerOpen = signal(false);
  selectedItem = signal<CalibrationPlanItem | null>(null);

  dateChangeDrawerOpen = signal(false);
  selectedDateChangeItem = signal<CalibrationPlanItem | null>(null);

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
        'MeterCode',
        'MeterSerial',
        'CertificateNumber',
        'PmseCompanyName'
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
      orderBy: 'PlannedStartDate asc, MeterCode asc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar tus ítems del plan.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar tus ítems del plan.');
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

  canRequestDateChange(item: CalibrationPlanItem): boolean {
    return Number(item.itemStatus) === CalibrationPlanItemStatus.Pending;
  }

  canAddToSchedule(item: CalibrationPlanItem): boolean {
    return Number(item.itemStatus) === CalibrationPlanItemStatus.Pending;
  }

  onDateChangeClicked(item: CalibrationPlanItem): void {
    if (!this.canRequestDateChange(item)) {
      this.toast.warning('Solo puedes solicitar cambio de rango para ítems pendientes.');
      return;
    }

    this.selectedDateChangeItem.set(item);
    this.dateChangeDrawerOpen.set(true);
  }

  onDateChangeDrawerClosed(): void {
    this.dateChangeDrawerOpen.set(false);
    this.selectedDateChangeItem.set(null);
  }

  onDateChangeCreated(): void {
    this.dateChangeDrawerOpen.set(false);
    this.selectedDateChangeItem.set(null);
    this.load();
  }

  onScheduleClicked(item: CalibrationPlanItem): void {
    if (!this.canAddToSchedule(item)) {
      this.toast.warning('Solo puedes agregar a cronograma ítems pendientes.');
      return;
    }

    this.selectedItem.set(item);
    this.scheduleDrawerOpen.set(true);
  }

  onScheduleDrawerClosed(): void {
    this.scheduleDrawerOpen.set(false);
    this.selectedItem.set(null);
  }

  onScheduleSubmitted(): void {
    this.scheduleDrawerOpen.set(false);
    this.selectedItem.set(null);
    this.load();
  }

canRequestWorkAuthorization(item: CalibrationPlanItem): boolean {
  return Number(item.itemStatus) === CalibrationPlanItemStatus.ScheduleApproved &&
    !!item.scheduledDate;
}

onWorkAuthorizationClicked(item: CalibrationPlanItem): void {
  if (!this.canRequestWorkAuthorization(item)) {
    this.toast.warning('Solo puedes solicitar autorización cuando el cronograma está aprobado y existe fecha programada.');
    return;
  }

  this.selectedWorkAuthorizationItem.set(item);
  this.workAuthorizationDrawerOpen.set(true);
}

onWorkAuthorizationDrawerClosed(): void {
  this.workAuthorizationDrawerOpen.set(false);
  this.selectedWorkAuthorizationItem.set(null);
}

onWorkAuthorizationCreated(): void {
  this.workAuthorizationDrawerOpen.set(false);
  this.selectedWorkAuthorizationItem.set(null);
  this.load();
}

  getItemStatusLabel(status: CalibrationPlanItemStatus): string {
    return CalibrationPlanItemStatusLabels[status] ?? '—';
  }

  getItemStatusTone(
    status: CalibrationPlanItemStatus
  ): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (Number(status)) {
      case CalibrationPlanItemStatus.Pending:
        return 'warning';

      case CalibrationPlanItemStatus.DateChangeRequested:
        return 'info';

      case CalibrationPlanItemStatus.ScheduledByPmse:
        return 'primary';

      case CalibrationPlanItemStatus.ScheduleApproved:
        return 'success';

      case CalibrationPlanItemStatus.AuthorizationRequested:
        return 'info';

      case CalibrationPlanItemStatus.Authorized:
        return 'primary';

      case CalibrationPlanItemStatus.InProcess:
      case CalibrationPlanItemStatus.InReview:
        return 'info';

      case CalibrationPlanItemStatus.Approved:
        return 'success';

      case CalibrationPlanItemStatus.Rejected:
      case CalibrationPlanItemStatus.Expired:
        return 'danger';

      default:
        return 'neutral';
    }
  }

  getItemStatusIcon(status: CalibrationPlanItemStatus): string {
    switch (Number(status)) {
      case CalibrationPlanItemStatus.Pending:
        return 'pending_actions';

      case CalibrationPlanItemStatus.DateChangeRequested:
        return 'date_range';

      case CalibrationPlanItemStatus.ScheduledByPmse:
        return 'send';

      case CalibrationPlanItemStatus.ScheduleApproved:
        return 'event_available';

      case CalibrationPlanItemStatus.AuthorizationRequested:
        return 'approval';

      case CalibrationPlanItemStatus.Authorized:
        return 'verified';

      case CalibrationPlanItemStatus.InProcess:
        return 'engineering';

      case CalibrationPlanItemStatus.InReview:
        return 'fact_check';

      case CalibrationPlanItemStatus.Approved:
        return 'check_circle';

      case CalibrationPlanItemStatus.Rejected:
        return 'cancel';

      case CalibrationPlanItemStatus.Expired:
        return 'event_busy';

      default:
        return 'flag';
    }
  }
}