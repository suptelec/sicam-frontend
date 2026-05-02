import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationPlansService } from '../../data-access/calibration-plans.service';
import { CalibrationPlanItemsService } from '../../data-access/calibration-plan-items.service';

import {
  CalibrationPlan,
  CalibrationPlanItem,
  CalibrationPlanItemStatus,
  CalibrationPlanItemStatusLabels,
  CalibrationPlanStatus,
  CalibrationPlanStatusLabels,
  CenaceAnnualPlanValidationResponse
} from '../../domain/calibration-plan.model';

import { CalibrationPlanValidationDrawerComponent } from '../../ui/calibration-plan-validation-drawer/calibration-plan-validation-drawer';

@Component({
  selector: 'app-calibration-plan-detail',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    StatusChipComponent,
    TableCardComponent,
    DrawerShellComponent,
    CalibrationPlanValidationDrawerComponent
  ],
  templateUrl: './calibration-plan-detail.html',
  styleUrl: './calibration-plan-detail.scss'
})
export class CalibrationPlanDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly plansService = inject(CalibrationPlansService);
  private readonly itemsService = inject(CalibrationPlanItemsService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly CalibrationPlanStatus = CalibrationPlanStatus;

  plan = signal<CalibrationPlan | null>(null);
  isLoadingPlan = signal(false);
  isLoadingItems = signal(false);

  validationDrawerOpen = signal(false);
  validationResult = signal<CenaceAnnualPlanValidationResponse | null>(null);

  dataSource = new MatTableDataSource<CalibrationPlanItem>([]);

  displayedColumns = [
    'meter',
    'pmse',
    'certificate',
    'plannedRange',
    'scheduledDate',
    'itemStatus',
    'actions'
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.toast.error('No se recibió el identificador del plan.');
      this.router.navigate(['/calibration-plans']);
      return;
    }

    this.loadPlan(id);
    this.loadItems(id);
  }

  get planId(): number {
    return this.plan()?.id ?? Number(this.route.snapshot.paramMap.get('id'));
  }

  get canGenerateItems(): boolean {
    return this.plan()?.planStatus === CalibrationPlanStatus.Draft;
  }

  get canPublish(): boolean {
    return this.plan()?.planStatus === CalibrationPlanStatus.Draft;
  }

  loadPlan(id: number): void {
    this.isLoadingPlan.set(true);

    this.plansService.getById(id).subscribe({
      next: response => {
        this.isLoadingPlan.set(false);

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo cargar el plan.');
          this.router.navigate(['/calibration-plans']);
          return;
        }

        this.plan.set(response.result);
      },
      error: () => {
        this.isLoadingPlan.set(false);
        this.toast.error('Error al cargar el plan.');
        this.router.navigate(['/calibration-plans']);
      }
    });
  }

  loadItems(planId: number): void {
    this.isLoadingItems.set(true);

    this.itemsService.getAll({
      page: 1,
      take: 500,
      filter: `CalibrationPlanId eq ${planId}`,
      orderBy: 'PmseCompanyName asc, MeterCode asc'
    }).subscribe({
      next: response => {
        this.isLoadingItems.set(false);

        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
        } else {
          this.toast.error(response.message ?? 'No se pudieron cargar los ítems.');
        }
      },
      error: () => {
        this.isLoadingItems.set(false);
        this.toast.error('Error al cargar los ítems del plan.');
      }
    });
  }

  refresh(): void {
    this.loadPlan(this.planId);
    this.loadItems(this.planId);
  }

  back(): void {
    this.router.navigate(['/calibration-plans']);
  }

  onGenerateItems(): void {
    const currentPlan = this.plan();

    if (!currentPlan) return;

    this.confirmDialog.confirm({
      title: 'Generar ítems del plan',
      message: `Se generarán ítems para el plan ${currentPlan.year} usando los certificados históricos. ¿Deseas continuar?`,
      confirmText: 'Generar',
      cancelText: 'Cancelar',
      type: 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.plansService.generateItems(currentPlan.id).subscribe({
        next: response => {
          if (!response.succeed || !response.result) {
            this.toast.error(response.message ?? 'No se pudieron generar los ítems.');
            return;
          }

          this.toast.success(
            `Ítems generados: ${response.result.generatedItemsCount}. Omitidos: ${response.result.skippedExistingItemsCount}.`
          );

          this.refresh();
        },
        error: () => {
          this.toast.error('Error al generar los ítems del plan.');
        }
      });
    });
  }

  onValidate(): void {
    const currentPlan = this.plan();

    if (!currentPlan) return;

    this.plansService.validateAnnualPlan(currentPlan.id).subscribe({
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

  onExport(): void {
    const currentPlan = this.plan();

    if (!currentPlan) return;

    this.plansService.exportCenaceAnnualPlan(currentPlan.id, currentPlan.year);
  }

  onPublish(): void {
    const currentPlan = this.plan();

    if (!currentPlan) return;

    this.confirmDialog.confirm({
      title: 'Publicar plan anual',
      message: `Al publicar el plan ${currentPlan.year}, los PMSE podrán ver sus ítems. ¿Deseas continuar?`,
      confirmText: 'Publicar',
      cancelText: 'Cancelar',
      type: 'warning'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.plansService.publish(currentPlan.id).subscribe({
        next: response => {
          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo publicar el plan.');
            return;
          }

          this.toast.success('Plan publicado correctamente.');
          this.refresh();
        },
        error: () => {
          this.toast.error('Error al publicar el plan.');
        }
      });
    });
  }

  onValidationDrawerClosed(): void {
    this.validationDrawerOpen.set(false);
    this.validationResult.set(null);
  }

  onExportValidationResult(): void {
    const result = this.validationResult();

    if (!result) return;

    this.plansService.exportCenaceAnnualPlan(
      result.calibrationPlanId,
      result.planYear
    );
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

  getItemStatusLabel(status: CalibrationPlanItemStatus): string {
    return CalibrationPlanItemStatusLabels[status] ?? '—';
  }

  getItemStatusTone(status: CalibrationPlanItemStatus): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (status) {
      case CalibrationPlanItemStatus.Pending:
        return 'warning';

      case CalibrationPlanItemStatus.ScheduledByPmse:
        return 'info';

      case CalibrationPlanItemStatus.Authorized:
        return 'primary';

      case CalibrationPlanItemStatus.Approved:
      

      case CalibrationPlanItemStatus.Rejected:
        return 'danger';

      default:
        return 'neutral';
    }
  }
}