import { Component, OnInit, inject, signal } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';

import { getEntityStatusChip } from '../../../../shared/utils/status-chip.util';
import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

import { AccreditedLaboratoriesService } from '../../data-access/accredited-laboratories.service';
import {
  AccreditedLaboratory,
  EntityStatus
} from '../../domain/accredited-laboratory.model';

import { AccreditedLaboratoryDrawerComponent } from '../../ui/accredited-laboratory-drawer/accredited-laboratory-drawer';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

@Component({
  selector: 'app-accredited-laboratories-list',
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
    AccreditedLaboratoryDrawerComponent,
    DrawerShellComponent
  ],
  templateUrl: './accredited-laboratories-list.html',
  styleUrl: './accredited-laboratories-list.scss'
})
export class AccreditedLaboratoriesListComponent implements OnInit {
  private readonly service = inject(AccreditedLaboratoriesService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly userScope = inject(UserScopeService);

  readonly getEntityStatusChip = getEntityStatusChip;
  readonly EntityStatus = EntityStatus;

  readonly canManageLaboratories = this.userScope.isCenaceUser;
  readonly isPmseUser = this.userScope.isPmseUser;

  dataSource = new MatTableDataSource<AccreditedLaboratory>([]);

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  searchTerm = '';
  isLoading = signal(false);
  drawerOpen = signal(false);

  ngOnInit(): void {
    this.load();
  }

  get displayedColumns(): string[] {
    const columns = [
      'name',
      'accreditationCode',
      'contactEmail',
      'phone',
      'status'
    ];

    if (this.canManageLaboratories()) {
      columns.push('actions');
    }

    return columns;
  }

  get pageDescription(): string {
    if (this.canManageLaboratories()) {
      return 'Gestiona el catálogo global de laboratorios acreditados que los PMSE podrán escoger en sus cronogramas de calibración.';
    }

    return 'Consulta los laboratorios acreditados activos disponibles para seleccionar en los cronogramas de calibración.';
  }

  get emptyDescription(): string {
    if (this.canManageLaboratories()) {
      return 'Registra un laboratorio acreditado para que pueda ser usado en certificados, cronogramas y procesos de calibración.';
    }

    return 'CENACE aún no tiene laboratorios acreditados activos disponibles para selección.';
  }

  load(): void {
    this.isLoading.set(true);

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: this.buildFilter(),
      orderBy: this.canManageLaboratories()
        ? 'CreatedAt desc'
        : 'Name asc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar los laboratorios.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar los laboratorios.');
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
    if (!this.canManageLaboratories()) {
      this.toast.warning('Solo CENACE puede crear laboratorios acreditados.');
      return;
    }

    this.drawerOpen.set(true);
  }

  onLaboratoryCreated(): void {
    this.drawerOpen.set(false);
    this.toast.success('Laboratorio acreditado creado correctamente.');
    this.pageIndex = 0;
    this.load();
  }

  onToggleStatus(laboratory: AccreditedLaboratory): void {
    if (!this.canManageLaboratories()) {
      this.toast.warning('Solo CENACE puede activar o inactivar laboratorios.');
      return;
    }

    const action = laboratory.status === EntityStatus.Active
      ? 'inactivar'
      : 'activar';

    this.confirmDialog.confirm({
      title: `${action[0].toUpperCase()}${action.substring(1)} laboratorio`,
      message: `¿Deseas ${action} el laboratorio "${laboratory.name}"?`,
      confirmText: action[0].toUpperCase() + action.substring(1),
      cancelText: 'Cancelar',
      type: laboratory.status === EntityStatus.Active ? 'warning' : 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.service.toggleStatus(laboratory.id).subscribe({
        next: response => {
          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo cambiar el estado.');
            return;
          }

          this.toast.success('Estado actualizado correctamente.');
          this.load();
        },
        error: () => {
          this.toast.error('Error al cambiar el estado del laboratorio.');
        }
      });
    });
  }

  private buildFilter(): string | undefined {
    const searchFilter = this.odata.searchInFields(
      ['Name', 'AccreditationCode', 'ContactEmail'],
      this.searchTerm
    );

    const activeOnlyFilter = this.isPmseUser()
      ? this.odata.eqNumber('Status', EntityStatus.Active)
      : undefined;

    return this.odata.and(searchFilter, activeOnlyFilter);
  }
}