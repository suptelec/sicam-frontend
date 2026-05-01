import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { PmseCompaniesService } from '../../data-access/pmse-companies.service';
import { PmseCompanyDrawerComponent } from '../../ui/pmse-company-drawer/pmse-company-drawer';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PmseCompany } from '../../domain/pmse-company.model';
import { EcuadorRegion, EcuadorRegionLabels, EntityStatus, PmseType, PmseTypeLabels } from '../../domain/pmse-company.enum';

@Component({
  selector: 'app-pmse-companies-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule,
    PmseCompanyDrawerComponent
  ],
  templateUrl: './pmse-companies-list.html',
  styleUrl: './pmse-companies-list.scss'
})
export class PmseCompaniesListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private service        = inject(PmseCompaniesService);
  private confirmDialog  = inject(ConfirmDialogService);
  private toast          = inject(ToastService);

  dataSource    = new MatTableDataSource<PmseCompany>([]);
  displayedColumns = ['name', 'externalCode', 'ruc', 'type', 'region', 'status', 'actions'];

  totalRecords  = 0;
  pageSize      = 10;
  pageIndex     = 0;
  pageSizeOptions = [10, 20, 50];
  searchTerm    = '';
  isLoading     = signal(false);
  drawerOpen    = signal(false);

  PmseTypeLabels     = PmseTypeLabels;
  EcuadorRegionLabels = EcuadorRegionLabels;
  EntityStatus       = EntityStatus;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    const filter = this.buildFilter();

    this.service.getAll(this.pageIndex + 1, this.pageSize, {
      filter,
      orderby: 'Id desc'
    }).subscribe({
      next: res => {
        if (res.succeed) {
          this.dataSource.data = res.result ?? [];
          this.totalRecords = res.totalRecords ?? 0;
        } else {
          this.toast.error(res.message ?? 'Error al cargar las empresas');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar las empresas');
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
    this.pageSize  = event.pageSize;
    this.load();
  }

  onToggleStatus(company: PmseCompany): void {
    const action  = company.status === EntityStatus.Active ? 'inactivar' : 'activar';
    const type    = company.status === EntityStatus.Active ? 'warning' : 'info';

    this.confirmDialog.confirm({
      title:       `¿${action.charAt(0).toUpperCase() + action.slice(1)} empresa?`,
      message:     `La empresa ${company.name} será ${action === 'inactivar' ? 'desactivada' : 'activada'}.`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      cancelText:  'Cancelar',
      type
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.service.toggleStatus(company.id).subscribe({
        next: res => {
          if (res.succeed) {
            this.toast.success(`Empresa ${action === 'inactivar' ? 'inactivada' : 'activada'} correctamente`);
            this.load();
          } else {
            this.toast.error(res.message ?? 'Error al cambiar el estado');
          }
        },
        error: () => this.toast.error('Error al cambiar el estado')
      });
    });
  }

  getTypeLabel(type: any): string {
    return PmseTypeLabels[type as PmseType] ?? type;
  }

  getRegionLabel(region: any): string {
    return EcuadorRegionLabels[region as EcuadorRegion] ?? region;
  }

  onCompanyCreated(): void {
    this.drawerOpen.set(false);
    this.toast.success('Empresa creada correctamente');
    this.load();
  }

  private buildFilter(): string | undefined {
    const value = this.searchTerm.trim().toLowerCase().replace(/'/g, "''");

    if (!value) {
      return undefined;
    }

    return [
      `contains(tolower(Name),'${value}')`,
      `contains(tolower(Ruc),'${value}')`,
      `contains(tolower(ExternalCode),'${value}')`
    ].join(' or ');
  }
}