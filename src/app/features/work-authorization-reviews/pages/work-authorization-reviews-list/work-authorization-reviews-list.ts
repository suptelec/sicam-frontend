import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ToastService } from '../../../../core/services/toast.service';

import { PmseCompaniesService } from '../../../pmse-companies/data-access/pmse-companies.service';
import { PmseCompany } from '../../../pmse-companies/domain/pmse-company.model';

import { WorkAuthorizationsService } from '../../../my-calibration-items/data-access/work-authorizations.service';
import {
  CalibrationWorkAuthorization,
  CalibrationWorkAuthorizationStatus
} from '../../../my-calibration-items/domain/work-authorization.model';

import { AuthorizationMeterSnapshotDrawerComponent } from '../../ui/authorization-meter-snapshot-drawer/authorization-meter-snapshot-drawer';

@Component({
  selector: 'app-work-authorization-reviews-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatTooltipModule,
    PageHeaderComponent,
    SearchToolbarComponent,
    TableCardComponent,
    StatusChipComponent,
    SearchableSelectComponent,
    DrawerShellComponent,
    AuthorizationMeterSnapshotDrawerComponent
  ],
  templateUrl: './work-authorization-reviews-list.html',
  styleUrl: './work-authorization-reviews-list.scss'
})
export class WorkAuthorizationReviewsListComponent implements OnInit, OnDestroy {
  private readonly service = inject(WorkAuthorizationsService);
  private readonly pmseCompaniesService = inject(PmseCompaniesService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);

  private readonly subscriptions = new Subscription();

  readonly CalibrationWorkAuthorizationStatus = CalibrationWorkAuthorizationStatus;

  dataSource = new MatTableDataSource<CalibrationWorkAuthorization>([]);

  displayedColumns = [
    'item',
    'pmse',
    'workWindow',
    'document',
    'authorizationStatus',
    'actions'
  ];

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  searchTerm = '';

  isLoading = signal(false);
  pmseCompanies = signal<PmseCompany[]>([]);

  selectedPmseCompanyId = signal<number | null>(null);
  pmseCompanyIdControl = new FormControl<number | null>(null);

  requestedWorkDateStart = signal<Date | null>(null);
  requestedWorkDateEnd = signal<Date | null>(null);

  drawerOpen = signal(false);
  selectedAuthorization = signal<CalibrationWorkAuthorization | null>(null);

  ngOnInit(): void {
    this.subscriptions.add(
      this.pmseCompanyIdControl.valueChanges.subscribe(pmseCompanyId => {
        this.selectedPmseCompanyId.set(pmseCompanyId);
        this.resetPaginationAndLoad();
      })
    );

    this.loadPmseCompanies();
    this.load();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get hasRequestedWorkDateFilter(): boolean {
    return !!this.requestedWorkDateStart() || !!this.requestedWorkDateEnd();
  }

  load(): void {
    this.isLoading.set(true);

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: this.buildFilter(),
      orderBy: 'RequestedWorkDate asc, CreatedAt desc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar autorizaciones.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar autorizaciones.');
        this.isLoading.set(false);
      }
    });
  }

  loadPmseCompanies(): void {
    this.pmseCompaniesService.getAll({
      page: 1,
      take: 1000,
      filter: 'Status eq 1',
      orderBy: 'Name asc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.pmseCompanies.set(response.result ?? []);
          return;
        }

        this.toast.warning(response.message ?? 'No se pudieron cargar las empresas PMSE.');
      },
      error: () => {
        this.toast.warning('No se pudieron cargar las empresas PMSE.');
      }
    });
  }

  onSearch(): void {
    this.resetPaginationAndLoad();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  onRequestedWorkDateStartChange(value: Date | null): void {
    this.requestedWorkDateStart.set(value);
    this.resetPaginationAndLoad();
  }

  onRequestedWorkDateEndChange(value: Date | null): void {
    this.requestedWorkDateEnd.set(value);
    this.resetPaginationAndLoad();
  }

  clearRequestedWorkDateFilter(event?: MouseEvent): void {
    event?.stopPropagation();

    if (!this.hasRequestedWorkDateFilter) return;

    this.requestedWorkDateStart.set(null);
    this.requestedWorkDateEnd.set(null);
    this.resetPaginationAndLoad();
  }

  refresh(): void {
    this.load();
  }

  onAuthorize(row: CalibrationWorkAuthorization): void {
    this.selectedAuthorization.set(row);
    this.drawerOpen.set(true);
  }

  onDrawerClosed(): void {
    this.drawerOpen.set(false);
    this.selectedAuthorization.set(null);
  }

  onAuthorized(): void {
    this.onDrawerClosed();
    this.load();
  }

  onReject(row: CalibrationWorkAuthorization): void {
    const reason = prompt('Motivo de rechazo');

    if (!reason?.trim()) {
      return;
    }

    this.service.reject(row.id, {
      rejectionReason: reason.trim()
    }).subscribe({
      next: response => {
        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo rechazar la solicitud.');
          return;
        }

        this.toast.success('Autorización rechazada correctamente.');
        this.load();
      },
      error: () => {
        this.toast.error('Error al rechazar la solicitud.');
      }
    });
  }

  getStatusLabel(status: CalibrationWorkAuthorizationStatus): string {
    switch (Number(status)) {
      case CalibrationWorkAuthorizationStatus.Requested:
        return 'Solicitada';

      case CalibrationWorkAuthorizationStatus.Authorized:
        return 'Autorizada';

      case CalibrationWorkAuthorizationStatus.Rejected:
        return 'Rechazada';

      case CalibrationWorkAuthorizationStatus.Cancelled:
        return 'Cancelada';

      default:
        return '—';
    }
  }

  getStatusTone(
    status: CalibrationWorkAuthorizationStatus
  ): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (Number(status)) {
      case CalibrationWorkAuthorizationStatus.Requested:
        return 'warning';

      case CalibrationWorkAuthorizationStatus.Authorized:
        return 'success';

      case CalibrationWorkAuthorizationStatus.Rejected:
        return 'danger';

      case CalibrationWorkAuthorizationStatus.Cancelled:
        return 'info';

      default:
        return 'neutral';
    }
  }

  getStatusIcon(status: CalibrationWorkAuthorizationStatus): string {
    switch (Number(status)) {
      case CalibrationWorkAuthorizationStatus.Requested:
        return 'approval';

      case CalibrationWorkAuthorizationStatus.Authorized:
        return 'verified';

      case CalibrationWorkAuthorizationStatus.Rejected:
        return 'block';

      case CalibrationWorkAuthorizationStatus.Cancelled:
        return 'cancel';

      default:
        return 'info';
    }
  }

  private buildFilter(): string {
    const filters = [
      `AuthorizationStatus eq ${CalibrationWorkAuthorizationStatus.Requested}`
    ];

    const searchFilter = this.odata.searchInFields(
      [
        'PmseCompanyName',
        'MeterCode',
        'MeterSerial',
      ],
      this.searchTerm
    );

    if (searchFilter) {
      filters.push(searchFilter);
    }

    const pmseCompanyId = this.selectedPmseCompanyId();

    if (pmseCompanyId) {
      filters.push(`PmseCompanyId eq ${pmseCompanyId}`);
    }

    const startDate = this.requestedWorkDateStart();
    const endDate = this.requestedWorkDateEnd();

    if (startDate) {
      filters.push(`RequestedWorkDate ge ${this.formatDateForOData(startDate)}`);
    }

    if (endDate) {
      filters.push(`RequestedWorkDate le ${this.formatDateForOData(endDate)}`);
    }

    return filters
      .filter(Boolean)
      .map(value => `(${value})`)
      .join(' and ');
  }

  private resetPaginationAndLoad(): void {
    this.pageIndex = 0;
    this.load();
  }

  private formatDateForOData(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}