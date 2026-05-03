import { Component, OnInit, inject, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

import { getEntityStatusChip } from '../../../../shared/utils/status-chip.util';

import { PmseLaboratoriesService } from '../../data-access/pmse-laboratories.service';
import {
  EntityStatus,
  PmseLaboratory
} from '../../domain/pmse-laboratory.model';

import { PmseLaboratoryDrawerComponent } from '../../ui/pmse-laboratory-drawer/pmse-laboratory-drawer';

@Component({
  selector: 'app-pmse-laboratories-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    MatTooltipModule,
    PageHeaderComponent,
    SearchToolbarComponent,
    TableCardComponent,
    StatusChipComponent,
    DrawerShellComponent,
    PmseLaboratoryDrawerComponent
  ],
  templateUrl: './pmse-laboratories-list.html',
  styleUrl: './pmse-laboratories-list.scss'
})
export class PmseLaboratoriesListComponent implements OnInit {
  private readonly service = inject(PmseLaboratoriesService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly userScope = inject(UserScopeService);

  readonly getEntityStatusChip = getEntityStatusChip;
  readonly EntityStatus = EntityStatus;

  dataSource = new MatTableDataSource<PmseLaboratory>([]);

  displayedColumns: string[] = [
    'name',
    'pmseCompany',
    'accreditationCode',
    'contactEmail',
    'phone',
    'contractNumber',
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
    if (this.userScope.isPmseUser()) {
      this.displayedColumns = [
        'name',
        'accreditationCode',
        'contactEmail',
        'phone',
        'contractNumber',
        'status',
        'actions'
      ];
    }

    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    const searchFilter = this.odata.searchInFields(
    [
        'AccreditedLaboratoryName',
        'AccreditationCode',
        'ContractNumber',
        'PmseCompanyName'
    ],
    this.searchTerm
    );

    const pmseFilter = this.userScope.getPmseFilter('PmseCompanyId');

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: this.odata.and(searchFilter, pmseFilter),
      orderBy: 'CreatedAt desc'
    }).subscribe({
      next: response => {
        this.isLoading.set(false);

        if (!response.succeed) {
          this.dataSource.data = [];
          this.totalRecords = 0;
          this.toast.error(response.message ?? 'Error al cargar los laboratorios contratados.');
          return;
        }

        this.dataSource.data = response.result ?? [];
        this.totalRecords = response.totalRecords ?? 0;
      },
      error: () => {
        this.isLoading.set(false);
        this.dataSource.data = [];
        this.totalRecords = 0;
        this.toast.error('Error al cargar los laboratorios contratados.');
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

  onCreated(): void {
    this.drawerOpen.set(false);
    this.pageIndex = 0;
    this.load();
  }

  onToggleStatus(laboratory: PmseLaboratory): void {
    const action = laboratory.status === EntityStatus.Active
      ? 'inactivar'
      : 'activar';

    this.confirmDialog.confirm({
      title: `${action[0].toUpperCase()}${action.substring(1)} laboratorio`,
      message: `¿Deseas ${action} el laboratorio "${laboratory.accreditedLaboratoryName ?? '—'}"?`,
      confirmText: action[0].toUpperCase() + action.substring(1),
      cancelText: 'Cancelar',
      type: laboratory.status === EntityStatus.Active ? 'warning' : 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.service.toggleStatus(laboratory.id).subscribe({
        next: response => {
          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo actualizar el estado.');
            return;
          }

          this.toast.success('Estado actualizado correctamente.');
          this.load();
        },
        error: () => {
          this.toast.error('Error al actualizar el estado del laboratorio.');
        }
      });
    });
  }
}