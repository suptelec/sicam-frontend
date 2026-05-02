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

import { getEntityStatusChip } from '../../../../shared/utils/status-chip.util';
import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';

import { MetersService } from '../../data-access/meters.service';
import {
  EntityStatus,
  InstallationType,
  InstallationTypeLabels,
  Meter,
  MeterRequirementType,
  MeterRequirementTypeLabels
} from '../../domain/meter.model';

import { MeterDrawerComponent } from '../../ui/meter-drawer/meter-drawer';
import { MeterDetailDrawerComponent } from '../../ui/meter-detail-drawer/meter-detail-drawer';

@Component({
  selector: 'app-meters-list',
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
    MeterDrawerComponent,
    MeterDetailDrawerComponent
  ],
  templateUrl: './meters-list.html',
  styleUrl: './meters-list.scss'
})
export class MetersListComponent implements OnInit {
  private readonly service = inject(MetersService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly getEntityStatusChip = getEntityStatusChip;
  readonly EntityStatus = EntityStatus;

  dataSource = new MatTableDataSource<Meter>([]);

  displayedColumns = [
    'code',
    'company',
    'serial',
    'installation',
    'measurementPoint',
    'role',
    'nextCalibrationDate',
    'status',
    'actions'
  ];

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  searchTerm = '';
  isLoading = signal(false);

  drawerOpen = signal(false);
  selectedMeterId = signal<number | null>(null);

  detailDrawerOpen = signal(false);
  selectedDetailMeterId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: this.odata.searchInFields(
        [
          'Code',
          'Serial',
          'TplCode',
          'CenaceCode',
          'PmseCompanyName',
          'MeasurementPointCode',
          'MeasurementPointWbCode',
          'BorderPointCode',
          'InstallationName'
        ],
        this.searchTerm
      ),
      orderBy: 'CreatedAt desc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar los medidores.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar los medidores.');
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

  onCreateClicked(): void {
    this.selectedMeterId.set(null);
    this.drawerOpen.set(true);
  }

  onEditClicked(meter: Meter): void {
    this.selectedMeterId.set(meter.id);
    this.drawerOpen.set(true);
  }

  onViewClicked(meter: Meter): void {
    this.selectedDetailMeterId.set(meter.id);
    this.detailDrawerOpen.set(true);
  }

  onMeterCreated(): void {
    this.drawerOpen.set(false);
    this.selectedMeterId.set(null);
    this.pageIndex = 0;
    this.load();
  }

  onMeterUpdated(): void {
    this.drawerOpen.set(false);
    this.selectedMeterId.set(null);
    this.load();
  }

  onDrawerClosed(): void {
    this.drawerOpen.set(false);
    this.selectedMeterId.set(null);
  }

  onDetailDrawerClosed(): void {
    this.detailDrawerOpen.set(false);
    this.selectedDetailMeterId.set(null);
  }

  onToggleStatus(meter: Meter): void {
    const action = meter.status === EntityStatus.Active
      ? 'inactivar'
      : 'activar';

    this.confirmDialog.confirm({
      title: `${this.capitalize(action)} medidor`,
      message: `¿Deseas ${action} el medidor "${meter.code}"?`,
      confirmText: this.capitalize(action),
      cancelText: 'Cancelar',
      type: meter.status === EntityStatus.Active ? 'warning' : 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.service.toggleStatus(meter.id).subscribe({
        next: response => {
          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo cambiar el estado.');
            return;
          }

          this.toast.success('Estado actualizado correctamente.');
          this.load();
        },
        error: () => {
          this.toast.error('Error al cambiar el estado del medidor.');
        }
      });
    });
  }

  getInstallationTypeLabel(value?: InstallationType | null): string {
    return value ? InstallationTypeLabels[value] : '—';
  }

  getRequirementTypeLabel(value?: MeterRequirementType | null): string {
    return value ? MeterRequirementTypeLabels[value] : '—';
  }

  getRoleLabel(meter: Meter): string {
    return meter.isPrincipal ? 'Principal' : 'Respaldo';
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}