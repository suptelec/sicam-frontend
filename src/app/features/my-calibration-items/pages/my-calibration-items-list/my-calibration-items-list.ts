import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select';

import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

import { CalibrationPlanItemsService } from '../../../calibration-plans/data-access/calibration-plan-items.service';
import {
  CalibrationPlanItem,
  CalibrationPlanItemStatus,
  CalibrationPlanItemStatusLabels
} from '../../../calibration-plans/domain/calibration-plan.model';

import { MetersService } from '../../../meters/data-access/meters.service';
import {
  EntityStatus as MeterEntityStatus,
  Meter
} from '../../../meters/domain/meter.model';

import { ScheduleProposalDrawerComponent } from '../../ui/schedule-proposal-drawer/schedule-proposal-drawer';
import { DateChangeRequestDrawerComponent } from '../../ui/date-change-request-drawer/date-change-request-drawer';
import { WorkAuthorizationDrawerComponent } from '../../ui/work-authorization-drawer/work-authorization-drawer';
import { StartCalibrationProcessDrawerComponent } from '../../ui/start-calibration-process-drawer/start-calibration-process-drawer';
import { CalibrationProcessesService } from '../../data-access/calibration-processes.service';

type BulkActionType = 'schedule' | 'authorization';

@Component({
  selector: 'app-my-calibration-items-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatCheckboxModule,
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
    DrawerShellComponent,
    SearchableSelectComponent,
    ScheduleProposalDrawerComponent,
    DateChangeRequestDrawerComponent,
    WorkAuthorizationDrawerComponent,
    StartCalibrationProcessDrawerComponent
  ],
  templateUrl: './my-calibration-items-list.html',
  styleUrl: './my-calibration-items-list.scss'
})
export class MyCalibrationItemsListComponent implements OnInit, OnDestroy {
  private readonly service = inject(CalibrationPlanItemsService);
  private readonly metersService = inject(MetersService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly userScope = inject(UserScopeService);
  private readonly router = inject(Router);
  private readonly processesService = inject(CalibrationProcessesService);

  private readonly subscriptions = new Subscription();

  readonly CalibrationPlanItemStatus = CalibrationPlanItemStatus;

  dataSource = new MatTableDataSource<CalibrationPlanItem>([]);
  selection = new SelectionModel<CalibrationPlanItem>(true, []);

  displayedColumns = [
    'select',
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

  meterOptions = signal<Meter[]>([]);
  selectedMeterId = signal<number | null>(null);
  meterIdControl = new FormControl<number | null>(null);

  plannedRangeStart = signal<Date | null>(null);
  plannedRangeEnd = signal<Date | null>(null);

  scheduleDrawerOpen = signal(false);
  selectedScheduleItems = signal<CalibrationPlanItem[]>([]);

  dateChangeDrawerOpen = signal(false);
  selectedDateChangeItem = signal<CalibrationPlanItem | null>(null);

  workAuthorizationDrawerOpen = signal(false);
  selectedWorkAuthorizationItems = signal<CalibrationPlanItem[]>([]);

  startProcessDrawerOpen = signal(false);
  selectedStartProcessItem = signal<CalibrationPlanItem | null>(null);

  ngOnInit(): void {
    this.subscriptions.add(
      this.meterIdControl.valueChanges.subscribe(meterId => {
        this.selectedMeterId.set(meterId);
        this.resetPaginationAndLoad();
      })
    );

    this.loadMeters();
    this.load();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get pmseCompanyName(): string {
    return this.userScope.pmseCompanyName() ?? 'tu empresa';
  }

  get selectedItemsCount(): number {
    return this.selection.selected.length;
  }

  get hasAnySelection(): boolean {
    return this.selectedItemsCount > 0;
  }

  get hasMultipleSelection(): boolean {
    return this.selectedItemsCount > 1;
  }

  get hasPlannedRangeFilter(): boolean {
    return !!this.plannedRangeStart() || !!this.plannedRangeEnd();
  }

  get selectedBulkAction(): BulkActionType | null {
    const selected = this.selection.selected;

    if (selected.length === 0) return null;

    if (selected.every(item => this.canAddToSchedule(item))) {
      return 'schedule';
    }

    if (selected.every(item => this.canRequestWorkAuthorization(item))) {
      return 'authorization';
    }

    return null;
  }

  get defaultBulkAction(): BulkActionType | null {
    if (this.dataSource.data.some(item => this.canAddToSchedule(item))) {
      return 'schedule';
    }

    if (this.dataSource.data.some(item => this.canRequestWorkAuthorization(item))) {
      return 'authorization';
    }

    return null;
  }

  get activeBulkAction(): BulkActionType | null {
    return this.selectedBulkAction ?? this.defaultBulkAction;
  }

  get selectableRows(): CalibrationPlanItem[] {
    const action = this.selectedBulkAction ?? this.defaultBulkAction;

    if (action === 'schedule') {
      return this.dataSource.data.filter(item => this.canAddToSchedule(item));
    }

    if (action === 'authorization') {
      return this.dataSource.data.filter(item => this.canRequestWorkAuthorization(item));
    }

    return this.dataSource.data.filter(item =>
      this.canAddToSchedule(item) ||
      this.canRequestWorkAuthorization(item)
    );
  }

  get bulkActionText(): string {
    return this.activeBulkAction === 'authorization'
      ? 'Solicitar autorización'
      : 'Proponer cronograma';
  }

  get bulkActionIcon(): string {
    if (this.selectedBulkAction === 'authorization') {
      return 'approval';
    }

    if (this.defaultBulkAction === 'authorization') {
      return 'approval';
    }

    return 'event_available';
  }

  get bulkActionDescription(): string {
    if (this.selectedItemsCount > 0) {
      if (this.selectedBulkAction === 'authorization') {
        return `${this.selectedItemsCount} ítem(s) seleccionado(s) para solicitar autorización de inicio.`;
      }

      return `${this.selectedItemsCount} ítem(s) seleccionado(s) para proponer cronograma.`;
    }

    return 'Selecciona ítems pendientes para cronograma o ítems con cronograma aprobado para autorización.';
  }

  load(): void {
    this.isLoading.set(true);
    this.selection.clear();

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter: this.buildFilter(),
      orderBy: 'PlannedStartDate asc, MeterCode asc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.dataSource.data = [];
          this.totalRecords = 0;
          this.toast.error(response.message ?? 'Error al cargar tus ítems del plan.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.dataSource.data = [];
        this.totalRecords = 0;
        this.toast.error('Error al cargar tus ítems del plan.');
        this.isLoading.set(false);
      }
    });
  }

  refresh(): void {
    this.loadMeters();
    this.load();
  }

  onSearch(): void {
    this.resetPaginationAndLoad();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
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

  canRequestDateChange(item: CalibrationPlanItem): boolean {
    return Number(item.itemStatus) === CalibrationPlanItemStatus.Pending;
  }

  canAddToSchedule(item: CalibrationPlanItem): boolean {
    return Number(item.itemStatus) === CalibrationPlanItemStatus.Pending;
  }

  canRequestWorkAuthorization(item: CalibrationPlanItem): boolean {
    return Number(item.itemStatus) === CalibrationPlanItemStatus.ScheduleApproved &&
      !!item.scheduledDate;
  }

  canStartCalibrationProcess(item: CalibrationPlanItem): boolean {
    return Number(item.itemStatus) === CalibrationPlanItemStatus.Authorized &&
      !!item.scheduledDate;
  }

  canSelectRow(item: CalibrationPlanItem): boolean {
    if (this.selection.isSelected(item)) {
      return true;
    }

    const selectedAction = this.selectedBulkAction;

    if (selectedAction === 'schedule') {
      return this.canAddToSchedule(item);
    }

    if (selectedAction === 'authorization') {
      return this.canRequestWorkAuthorization(item);
    }

    return this.canAddToSchedule(item) || this.canRequestWorkAuthorization(item);
  }

  canUseRowPrimaryAction(item: CalibrationPlanItem): boolean {
    if (!this.hasAnySelection) {
      return true;
    }

    return this.selection.isSelected(item);
  }

  getScheduleRowTooltip(item: CalibrationPlanItem): string {
    if (this.hasMultipleSelection && this.selection.isSelected(item)) {
      return `Agregar ${this.selectedItemsCount} ítems seleccionados al cronograma`;
    }

    if (this.hasAnySelection && !this.selection.isSelected(item)) {
      return 'Acción bloqueada mientras hay otros ítems seleccionados';
    }

    return 'Agregar a cronograma';
  }

  getWorkAuthorizationRowTooltip(item: CalibrationPlanItem): string {
    if (this.hasMultipleSelection && this.selection.isSelected(item)) {
      return `Solicitar autorización para ${this.selectedItemsCount} ítems seleccionados`;
    }

    if (this.hasAnySelection && !this.selection.isSelected(item)) {
      return 'Acción bloqueada mientras hay otros ítems seleccionados';
    }

    return 'Solicitar autorización de inicio';
  }

  isAllSelected(): boolean {
    const rows = this.selectableRows;

    return rows.length > 0 && rows.every(row => this.selection.isSelected(row));
  }

  isPartiallySelected(): boolean {
    return this.selection.selected.length > 0 && !this.isAllSelected();
  }

  masterToggle(): void {
    const rows = this.selectableRows;

    if (rows.length === 0) return;

    if (this.isAllSelected()) {
      rows.forEach(row => this.selection.deselect(row));
      return;
    }

    this.selection.select(...rows);
  }

  toggleRowSelection(row: CalibrationPlanItem): void {
    if (!this.canSelectRow(row)) return;

    const selectedAction = this.selectedBulkAction;

    if (!this.selection.isSelected(row) && selectedAction === 'schedule' && !this.canAddToSchedule(row)) {
      this.toast.warning('No puedes mezclar ítems pendientes con ítems de otra etapa.');
      return;
    }

    if (!this.selection.isSelected(row) && selectedAction === 'authorization' && !this.canRequestWorkAuthorization(row)) {
      this.toast.warning('No puedes mezclar ítems con cronograma aprobado con ítems de otra etapa.');
      return;
    }

    this.selection.toggle(row);
  }

  onBulkActionClicked(): void {
    const action = this.selectedBulkAction;

    if (!action || this.selectedItemsCount === 0) {
      this.toast.warning('Selecciona al menos un ítem accionable.');
      return;
    }

    if (action === 'schedule') {
      this.onScheduleSelectedClicked();
      return;
    }

    this.onWorkAuthorizationSelectedClicked();
  }

  onDateChangeClicked(item: CalibrationPlanItem): void {
    if (!this.canRequestDateChange(item)) {
      this.toast.warning('Solo puedes solicitar cambio de rango para ítems pendientes.');
      return;
    }

    if (this.hasAnySelection && !this.selection.isSelected(item)) {
      this.toast.warning('Limpia la selección actual antes de accionar un ítem diferente.');
      return;
    }

    if (this.hasMultipleSelection) {
      this.toast.warning('El cambio de rango se solicita por ítem individual.');
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

  onScheduleRowActionClicked(item: CalibrationPlanItem): void {
    if (this.hasMultipleSelection && this.selection.isSelected(item)) {
      this.onScheduleSelectedClicked();
      return;
    }

    if (this.hasAnySelection && !this.selection.isSelected(item)) {
      this.toast.warning('Limpia la selección actual antes de accionar un ítem diferente.');
      return;
    }

    this.onScheduleClicked(item);
  }

  onScheduleClicked(item: CalibrationPlanItem): void {
    if (!this.canAddToSchedule(item)) {
      this.toast.warning('Solo puedes agregar a cronograma ítems pendientes.');
      return;
    }

    this.openScheduleDrawer([item]);
  }

  onScheduleSelectedClicked(): void {
    const selectedItems = this.selection.selected;

    if (selectedItems.length === 0) {
      this.toast.warning('Selecciona al menos un ítem pendiente.');
      return;
    }

    if (!selectedItems.every(item => this.canAddToSchedule(item))) {
      this.toast.warning('Solo puedes proponer cronograma para ítems pendientes.');
      return;
    }

    const planIds = new Set(selectedItems.map(item => item.calibrationPlanId));

    if (planIds.size > 1) {
      this.toast.warning('Selecciona ítems del mismo plan anual para proponer un cronograma.');
      return;
    }

    this.openScheduleDrawer(selectedItems);
  }

  onScheduleDrawerClosed(): void {
    this.scheduleDrawerOpen.set(false);
    this.selectedScheduleItems.set([]);
  }

  onScheduleSubmitted(): void {
    this.scheduleDrawerOpen.set(false);
    this.selectedScheduleItems.set([]);
    this.selection.clear();
    this.load();
  }

  onWorkAuthorizationRowActionClicked(item: CalibrationPlanItem): void {
    if (this.hasMultipleSelection && this.selection.isSelected(item)) {
      this.onWorkAuthorizationSelectedClicked();
      return;
    }

    if (this.hasAnySelection && !this.selection.isSelected(item)) {
      this.toast.warning('Limpia la selección actual antes de accionar un ítem diferente.');
      return;
    }

    this.onWorkAuthorizationClicked(item);
  }

  onWorkAuthorizationClicked(item: CalibrationPlanItem): void {
    if (!this.canRequestWorkAuthorization(item)) {
      this.toast.warning('Solo puedes solicitar autorización cuando el cronograma está aprobado y existe fecha programada.');
      return;
    }

    this.openWorkAuthorizationDrawer([item]);
  }

  onWorkAuthorizationSelectedClicked(): void {
    const selectedItems = this.selection.selected;

    if (selectedItems.length === 0) {
      this.toast.warning('Selecciona al menos un ítem con cronograma aprobado.');
      return;
    }

    if (!selectedItems.every(item => this.canRequestWorkAuthorization(item))) {
      this.toast.warning('Solo puedes solicitar autorización para ítems con cronograma aprobado.');
      return;
    }

    const scheduledDates = new Set(selectedItems.map(item => item.scheduledDate));

    if (scheduledDates.size > 1) {
      this.toast.warning('Selecciona ítems con la misma fecha aprobada para solicitar autorización en lote.');
      return;
    }

    this.openWorkAuthorizationDrawer(selectedItems);
  }

  onWorkAuthorizationDrawerClosed(): void {
    this.workAuthorizationDrawerOpen.set(false);
    this.selectedWorkAuthorizationItems.set([]);
  }

  onWorkAuthorizationCreated(): void {
    this.workAuthorizationDrawerOpen.set(false);
    this.selectedWorkAuthorizationItems.set([]);
    this.selection.clear();
    this.load();
  }

  onStartProcessClicked(item: CalibrationPlanItem): void {
    if (!this.canStartCalibrationProcess(item)) {
      this.toast.warning('Solo puedes iniciar calibración cuando el ítem está autorizado.');
      return;
    }

    if (this.hasAnySelection && !this.selection.isSelected(item)) {
      this.toast.warning('Limpia la selección actual antes de accionar un ítem diferente.');
      return;
    }

    if (this.hasMultipleSelection) {
      this.toast.warning('El proceso de calibración se inicia por ítem individual.');
      return;
    }

    this.selectedStartProcessItem.set(item);
    this.startProcessDrawerOpen.set(true);
  }

  onStartProcessDrawerClosed(): void {
    this.startProcessDrawerOpen.set(false);
    this.selectedStartProcessItem.set(null);
  }

  onProcessCreated(processId: number): void {
    this.startProcessDrawerOpen.set(false);
    this.selectedStartProcessItem.set(null);
    this.load();

    this.router.navigate(['/my-calibration-processes', processId]);
  }

  onContinueProcessClicked(item: CalibrationPlanItem): void {
    if (this.hasAnySelection && !this.selection.isSelected(item)) {
      this.toast.warning('Limpia la selección actual antes de accionar un ítem diferente.');
      return;
    }

    this.processesService.findActiveByPlanItem(item.id).subscribe({
      next: process => {
        if (!process) {
          this.toast.warning('No se encontró un proceso activo para este ítem.');
          return;
        }

        this.router.navigate(['/my-calibration-processes', process.id]);
      },
      error: () => {
        this.toast.error('Error al buscar el proceso de calibración.');
      }
    });
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

  private openScheduleDrawer(items: CalibrationPlanItem[]): void {
    this.selectedScheduleItems.set(items);
    this.scheduleDrawerOpen.set(true);
  }

  private openWorkAuthorizationDrawer(items: CalibrationPlanItem[]): void {
    this.selectedWorkAuthorizationItems.set(items);
    this.workAuthorizationDrawerOpen.set(true);
  }

  private loadMeters(): void {
    const pmseFilter = this.userScope.getPmseFilter('PmseCompanyId');

    this.metersService.getAll({
      page: 1,
      take: 1000,
      filter: this.odata.and(
        pmseFilter,
        this.odata.eqNumber('Status', MeterEntityStatus.Active)
      ),
      orderBy: 'Code asc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.meterOptions.set(response.result ?? []);
          return;
        }

        this.toast.warning(response.message ?? 'No se pudieron cargar los medidores.');
      },
      error: () => {
        this.toast.warning('No se pudieron cargar los medidores.');
      }
    });
  }

  private buildFilter(): string | undefined {
    const pmseFilter = this.userScope.getPmseFilter('PmseCompanyId');

    const searchFilter = this.odata.searchInFields(
      [
        'MeterCode',
        'MeterSerial',
        'CertificateNumber',
        'SuggestedLaboratoryName'
      ],
      this.searchTerm
    );

    const meterId = this.selectedMeterId();

    const meterFilter = meterId
      ? this.odata.eqNumber('MeterId', meterId)
      : undefined;

    const plannedStart = this.plannedRangeStart();
    const plannedEnd = this.plannedRangeEnd();

    const plannedStartFilter = plannedStart
      ? `PlannedStartDate ge ${this.formatDateForOData(plannedStart)}`
      : undefined;

    const plannedEndFilter = plannedEnd
      ? `PlannedEndDate le ${this.formatDateForOData(plannedEnd)}`
      : undefined;

    return this.odata.and(
      pmseFilter,
      searchFilter,
      meterFilter,
      plannedStartFilter,
      plannedEndFilter
    );
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