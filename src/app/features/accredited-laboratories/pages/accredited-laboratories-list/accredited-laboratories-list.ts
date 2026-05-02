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

  readonly getEntityStatusChip = getEntityStatusChip;
  readonly EntityStatus = EntityStatus;

  dataSource = new MatTableDataSource<AccreditedLaboratory>([]);
  displayedColumns = [
    'name',
    'accreditationCode',
    'contactEmail',
    'phone',
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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: this.odata.searchInFields(
        ['Name', 'AccreditationCode', 'ContactEmail'],
        this.searchTerm
      ),
      orderBy: 'CreatedAt desc'
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

  onLaboratoryCreated(): void {
    this.drawerOpen.set(false);
    this.toast.success('Laboratorio acreditado creado correctamente.');
    this.pageIndex = 0;
    this.load();
  }

  onToggleStatus(laboratory: AccreditedLaboratory): void {
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
}