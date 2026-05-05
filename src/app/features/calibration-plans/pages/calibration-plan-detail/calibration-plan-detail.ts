import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select';

import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';

import { CalibrationPlansService } from '../../data-access/calibration-plans.service';
import { CalibrationPlanItemsService } from '../../data-access/calibration-plan-items.service';

import { PmseCompaniesService } from '../../../pmse-companies/data-access/pmse-companies.service';
import { PmseCompany } from '../../../pmse-companies/domain/pmse-company.model';

import {
  CalibrationPlan,
  CalibrationPlanItem,
  CalibrationPlanItemStatus,
  CalibrationPlanItemStatusLabels,
  CalibrationPlanStatus,
  CalibrationPlanStatusLabels,
  CenaceAnnualPlanValidationResponse,
  UpdateCalibrationPlanItemPlannedRangeRequest
} from '../../domain/calibration-plan.model';

import { CalibrationPlanValidationDrawerComponent } from '../../ui/calibration-plan-validation-drawer/calibration-plan-validation-drawer';
import { CalibrationPlanItemRangeDrawerComponent } from '../../ui/calibration-plan-item-range-drawer/calibration-plan-item-range-drawer';

@Component({
  selector: 'app-calibration-plan-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    PageHeaderComponent,
    StatusChipComponent,
    TableCardComponent,
    DrawerShellComponent,
    SearchableSelectComponent,
    CalibrationPlanValidationDrawerComponent,
    CalibrationPlanItemRangeDrawerComponent
  ],
  templateUrl: './calibration-plan-detail.html',
  styleUrl: './calibration-plan-detail.scss'
})
export class CalibrationPlanDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly plansService = inject(CalibrationPlansService);
  private readonly itemsService = inject(CalibrationPlanItemsService);
  private readonly pmseCompaniesService = inject(PmseCompaniesService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  private readonly subscriptions = new Subscription();

  readonly CalibrationPlanStatus = CalibrationPlanStatus;

  plan = signal<CalibrationPlan | null>(null);
  isLoadingPlan = signal(false);
  isLoadingItems = signal(false);

  pmseCompanies = signal<PmseCompany[]>([]);
  selectedPmseCompanyId = signal<number | null>(null);
  pmseCompanyIdControl = new FormControl<number | null>(null);

  plannedRangeStart = signal<Date | null>(null);
  plannedRangeEnd = signal<Date | null>(null);

  validationDrawerOpen = signal(false);
  validationResult = signal<CenaceAnnualPlanValidationResponse | null>(null);

  rangeDrawerOpen = signal(false);
  rangeDrawerItems = signal<CalibrationPlanItem[]>([]);
  isSavingRange = signal(false);

  dataSource = new MatTableDataSource<CalibrationPlanItem>([]);
  selection = new SelectionModel<CalibrationPlanItem>(true, []);

  totalRecords = 0;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50, 100];

  displayedColumns = [
    'select',
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

    this.subscriptions.add(
      this.pmseCompanyIdControl.valueChanges.subscribe(pmseCompanyId => {
        this.selectedPmseCompanyId.set(pmseCompanyId);
        this.resetPaginationAndLoad();
      })
    );

    this.loadPlan(id);
    this.loadPmseCompanies();
    this.loadItems(id);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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

  get canEditPlannedRange(): boolean {
    return this.plan()?.planStatus === CalibrationPlanStatus.Draft;
  }

  get selectedItemsCount(): number {
    return this.selection.selected.length;
  }

  get hasPlannedRangeFilter(): boolean {
    return !!this.plannedRangeStart() || !!this.plannedRangeEnd();
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

        this.toast.error(response.message ?? 'No se pudieron cargar las empresas PMSE.');
      },
      error: () => {
        this.toast.error('Error al cargar las empresas PMSE.');
      }
    });
  }

  loadItems(planId: number): void {
    this.isLoadingItems.set(true);
    this.selection.clear();

    this.itemsService.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: this.buildItemsFilter(planId),
      orderBy: 'PmseCompanyName asc, MeterCode asc'
    }).subscribe({
      next: response => {
        this.isLoadingItems.set(false);

        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
          return;
        }

        this.dataSource.data = [];
        this.totalRecords = 0;
        this.toast.error(response.message ?? 'No se pudieron cargar los ítems.');
      },
      error: () => {
        this.isLoadingItems.set(false);
        this.dataSource.data = [];
        this.totalRecords = 0;
        this.toast.error('Error al cargar los ítems del plan.');
      }
    });
  }

  private buildItemsFilter(planId: number): string {
    const filters = [`CalibrationPlanId eq ${planId}`];

    const pmseCompanyId = this.selectedPmseCompanyId();

    if (pmseCompanyId) {
      filters.push(`PmseCompanyId eq ${pmseCompanyId}`);
    }

    const plannedStart = this.plannedRangeStart();
    const plannedEnd = this.plannedRangeEnd();

    if (plannedStart) {
      filters.push(`PlannedStartDate ge ${this.formatDateForOData(plannedStart)}`);
    }

    if (plannedEnd) {
      filters.push(`PlannedEndDate le ${this.formatDateForOData(plannedEnd)}`);
    }

    return filters.join(' and ');
  }

  onPlannedRangeStartChange(value: Date | null): void {
    this.plannedRangeStart.set(value);
    this.resetPaginationAndLoad();
  }

  onPlannedRangeEndChange(value: Date | null): void {
    this.plannedRangeEnd.set(value);
    this.resetPaginationAndLoad();
  }

  clearPlannedRangeFilter(event?: MouseEvent): void {
    event?.stopPropagation();

    if (!this.hasPlannedRangeFilter) return;

    this.plannedRangeStart.set(null);
    this.plannedRangeEnd.set(null);
    this.resetPaginationAndLoad();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadItems(this.planId);
  }

  refresh(): void {
    this.loadPlan(this.planId);
    this.loadItems(this.planId);
  }

  back(): void {
    this.router.navigate(['/calibration-plans']);
  }

  isAllSelected(): boolean {
    const rows = this.dataSource.data;

    return rows.length > 0 && this.selection.selected.length === rows.length;
  }

  isPartiallySelected(): boolean {
    return this.selection.selected.length > 0 && !this.isAllSelected();
  }

  masterToggle(): void {
    if (!this.canEditPlannedRange) return;

    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  toggleRowSelection(row: CalibrationPlanItem): void {
    if (!this.canEditPlannedRange) return;

    this.selection.toggle(row);
  }

  onEditSelectedRanges(): void {
    if (!this.canEditPlannedRange) {
      this.toast.warning('Solo se puede editar el rango planificado cuando el plan está en borrador.');
      return;
    }

    const selectedItems = this.selection.selected;

    if (selectedItems.length === 0) {
      this.toast.warning('Selecciona al menos un ítem del plan.');
      return;
    }

    this.openRangeDrawer(selectedItems);
  }

  onEditRange(row: CalibrationPlanItem): void {
    if (!this.canEditPlannedRange) {
      this.toast.warning('Solo se puede editar el rango planificado cuando el plan está en borrador.');
      return;
    }

    this.openRangeDrawer([row]);
  }

  onRangeDrawerClosed(): void {
    if (this.isSavingRange()) return;

    this.rangeDrawerOpen.set(false);
    this.rangeDrawerItems.set([]);
  }

  onRangeSaved(dto: UpdateCalibrationPlanItemPlannedRangeRequest): void {
    const items = this.rangeDrawerItems();

    if (items.length === 0 || this.isSavingRange()) return;

    this.isSavingRange.set(true);

    const requests = items.map(item =>
      this.itemsService.updatePlannedRange(item.id, dto)
    );

    forkJoin(requests).subscribe({
      next: responses => {
        this.isSavingRange.set(false);

        const hasError = responses.some(response => !response.succeed);

        if (hasError) {
          this.toast.error('Algunos ítems no pudieron actualizarse.');
          return;
        }

        const message = items.length === 1
          ? 'Rango planificado actualizado correctamente.'
          : `Rango planificado actualizado en ${items.length} ítems.`;

        this.toast.success(message);

        this.rangeDrawerOpen.set(false);
        this.rangeDrawerItems.set([]);
        this.selection.clear();
        this.refresh();
      },
      error: () => {
        this.isSavingRange.set(false);
        this.toast.error('Error al actualizar el rango planificado.');
      }
    });
  }

  private openRangeDrawer(items: CalibrationPlanItem[]): void {
    this.rangeDrawerItems.set(items);
    this.rangeDrawerOpen.set(true);
  }

  onGenerateItems(): void {
    const currentPlan = this.plan();

    if (!currentPlan) return;

    this.confirmDialog.confirm({
      title: 'Sincronizar ítems del plan',
      message: `Se sincronizarán los ítems del plan ${currentPlan.year} usando los certificados históricos. Los ítems existentes se conservarán y se completarán los faltantes. ¿Deseas continuar?`,
      confirmText: 'Sincronizar',
      cancelText: 'Cancelar',
      type: 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.plansService.generateItems(currentPlan.id).subscribe({
        next: response => {
          if (!response.succeed || !response.result) {
            this.toast.error(response.message ?? 'No se pudieron sincronizar los ítems.');
            return;
          }

          this.toast.success(
            `Sincronización completada. Nuevos ítems: ${response.result.generatedItemsCount}. Ya existentes: ${response.result.skippedExistingItemsCount}.`
          );

          this.refresh();
        },
        error: () => {
          this.toast.error('Error al sincronizar los ítems del plan.');
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
        return 'success';

      case CalibrationPlanItemStatus.Rejected:
        return 'danger';

      default:
        return 'neutral';
    }
  }

  private resetPaginationAndLoad(): void {
    this.pageIndex = 0;
    this.loadItems(this.planId);
  }

  private formatDateForOData(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}