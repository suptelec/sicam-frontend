import { Component, OnInit, inject, signal } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationPlansService } from '../../data-access/calibration-plans.service';
import {
  CalibrationPlan,
  CalibrationPlanStatus,
  CalibrationPlanStatusLabels,
  CenaceAnnualPlanValidationResponse
} from '../../domain/calibration-plan.model';

import { CalibrationPlanDrawerComponent } from '../../ui/calibration-plan-drawer/calibration-plan-drawer';
import { CalibrationPlanValidationDrawerComponent } from '../../ui/calibration-plan-validation-drawer/calibration-plan-validation-drawer';

@Component({
  selector: 'app-calibration-plans-list',
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
    CalibrationPlanDrawerComponent,
    CalibrationPlanValidationDrawerComponent
  ],
  templateUrl: './calibration-plans-list.html',
  styleUrl: './calibration-plans-list.scss'
})
export class CalibrationPlansListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly service = inject(CalibrationPlansService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly CalibrationPlanStatus = CalibrationPlanStatus;

  dataSource = new MatTableDataSource<CalibrationPlan>([]);

  displayedColumns = [
    'name',
    'year',
    'range',
    'items',
    'planStatus',
    'publishedAt',
    'actions'
  ];

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  searchTerm = '';
  isLoading = signal(false);
  drawerOpen = signal(false);
  validationDrawerOpen = signal(false);
  validationResult = signal<CenaceAnnualPlanValidationResponse | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: this.odata.searchInFields(
        ['Name', 'Description'],
        this.searchTerm
      ),
      orderBy: 'Year desc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar los planes.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar los planes.');
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
 
  onViewDetail(plan: CalibrationPlan): void {
    this.router.navigate(['/calibration-plans', plan.id]);
 }

  onCreateClicked(): void {
    this.drawerOpen.set(true);
  }

  onDrawerClosed(): void {
    this.drawerOpen.set(false);
  }

  onPlanCreated(): void {
    this.drawerOpen.set(false);
    this.pageIndex = 0;
    this.load();
  }

  onGenerateItems(plan: CalibrationPlan): void {
    this.confirmDialog.confirm({
      title: 'Generar ítems del plan',
      message: `Se generarán ítems para el plan ${plan.year} usando los certificados históricos. ¿Deseas continuar?`,
      confirmText: 'Generar',
      cancelText: 'Cancelar',
      type: 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.service.generateItems(plan.id).subscribe({
        next: response => {
          if (!response.succeed || !response.result) {
            this.toast.error(response.message ?? 'No se pudieron generar los ítems.');
            return;
          }

          this.toast.success(
            `Ítems generados: ${response.result.generatedItemsCount}. Omitidos: ${response.result.skippedExistingItemsCount}.`
          );

          this.load();
        },
        error: () => {
          this.toast.error('Error al generar los ítems del plan.');
        }
      });
    });
  }

  onValidate(plan: CalibrationPlan): void {
  this.service.validateAnnualPlan(plan.id).subscribe({
    next: response => {
      if (!response.succeed || !response.result) {
        this.toast.error(response.message ?? 'No se pudo validar el plan.');
        return;
      }

      this.validationResult.set(response.result);
      this.validationDrawerOpen.set(true);
    },
    error: () => {
      this.toast.error('Error al validar el plan anual.');
    }
  });
}

onValidationDrawerClosed(): void {
  this.validationDrawerOpen.set(false);
  this.validationResult.set(null);
}

onExportValidationResult(): void {
  const result = this.validationResult();

  if (!result) return;

  this.service.exportCenaceAnnualPlan(
    result.calibrationPlanId,
    result.planYear
  );
}

  onExport(plan: CalibrationPlan): void {
    this.service.exportCenaceAnnualPlan(plan.id, plan.year);
  }

  onPublish(plan: CalibrationPlan): void {
    this.confirmDialog.confirm({
      title: 'Publicar plan anual',
      message: `Al publicar el plan ${plan.year}, los PMSE podrán ver sus ítems y trabajar sobre ellos. ¿Deseas continuar?`,
      confirmText: 'Publicar',
      cancelText: 'Cancelar',
      type: 'warning'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.service.publish(plan.id).subscribe({
        next: response => {
          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo publicar el plan.');
            return;
          }

          this.toast.success('Plan publicado correctamente.');
          this.load();
        },
        error: () => {
          this.toast.error('Error al publicar el plan.');
        }
      });
    });
  }

  canEdit(plan: CalibrationPlan): boolean {
    return plan.planStatus === CalibrationPlanStatus.Draft;
  }

  getPlanStatusLabel(status: CalibrationPlanStatus): string {
    return CalibrationPlanStatusLabels[status] ?? '—';
  }

  getPlanStatusTone(status: CalibrationPlanStatus): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (status) {
      case CalibrationPlanStatus.Draft:
        return 'warning';

      case CalibrationPlanStatus.Published:
        return 'primary';

      case CalibrationPlanStatus.InProgress:
        return 'info';

      case CalibrationPlanStatus.Closed:
        return 'success';

      case CalibrationPlanStatus.ForceClosed:
        return 'danger';

      default:
        return 'neutral';
    }
  }
}