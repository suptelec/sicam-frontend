import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { StatusChipComponent, StatusChipTone } from '../../../../shared/components/status-chip/status-chip';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';

import { ToastService } from '../../../../core/services/toast.service';
import { ComplianceReportsService } from '../../data-access/compliance-reports.service';
import {
  CalibrationInstallationCondition,
  CalibrationPlanItemStatus,
  CalibrationProcessStatus,
  ComplianceReportResponse,
  ComplianceReportRow,
  ComplianceReportType,
  ComplianceStatus
} from '../../domain/compliance-report.model';

type ReportMode = 'monthly' | 'annual';

@Component({
  selector: 'app-compliance-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    MatTooltipModule,
    PageHeaderComponent,
    SearchToolbarComponent,
    StatusChipComponent,
    TableCardComponent
  ],
  templateUrl: './compliance-reports-page.html',
  styleUrl: './compliance-reports-page.scss'
})
export class ComplianceReportsPageComponent implements OnInit {
  private readonly service = inject(ComplianceReportsService);
  private readonly toast = inject(ToastService);

  @ViewChild(MatPaginator)
  set paginator(value: MatPaginator | undefined) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly ComplianceReportType = ComplianceReportType;
  readonly ComplianceStatus = ComplianceStatus;

  readonly months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  readonly displayedColumns = [
    'pmse',
    'meter',
    'planned',
    'execution',
    'certificate',
    'compliance',
    'process'
  ];

  mode: ReportMode = 'annual';
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  searchTerm = '';
  isLoading = signal(false);
  report = signal<ComplianceReportResponse | null>(null);

  dataSource = new MatTableDataSource<ComplianceReportRow>([]);
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];

  readonly summary = computed(() => this.report()?.summary ?? null);
  readonly pmseSummaries = computed(() => this.report()?.pmseSummaries ?? []);

  ngOnInit(): void {
    this.configureFilter();
    this.load();
  }

  load(): void {
    if (!this.validateFilters()) {
      return;
    }

    this.isLoading.set(true);

    const request$ = this.mode === 'monthly'
      ? this.service.getMonthly(this.year, this.month)
      : this.service.getAnnual(this.year);

    request$.subscribe({
      next: response => {
        this.isLoading.set(false);

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo cargar el reporte regulatorio.');
          return;
        }

        this.report.set(response.result);
        this.dataSource.data = response.result.rows ?? [];
        this.applyFilter(this.searchTerm);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar el reporte regulatorio.');
      }
    });
  }

  exportExcel(): void {
    if (!this.validateFilters()) {
      return;
    }

    if (this.mode === 'monthly') {
      this.service.exportMonthly(this.year, this.month);
      return;
    }

    this.service.exportAnnual(this.year);
  }

  onModeChange(mode: ReportMode): void {
    this.mode = mode;
    this.load();
  }

  onSearch(): void {
    this.applyFilter(this.searchTerm);
  }

  onSearchValueChange(value: string): void {
    this.searchTerm = value;
    this.applyFilter(value);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
  }

  get reportTitle(): string {
    if (this.mode === 'monthly') {
      const monthLabel = this.months.find(x => x.value === this.month)?.label ?? this.month;
      return `Reporte mensual ${monthLabel} ${this.year}`;
    }

    return `Reporte anual ${this.year}`;
  }

  get rangeLabel(): string {
    const current = this.report();

    if (!current) {
      return 'Sin reporte cargado';
    }

    return `${this.formatDate(current.from)} - ${this.formatDate(current.to)}`;
  }

  get generatedAtLabel(): string {
    const current = this.report();

    if (!current?.generatedAt) {
      return '—';
    }

    return new Date(current.generatedAt).toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get certificateRuleLabel(): string {
    const current = this.report();

    if (!current) {
      return '—';
    }

    if (!current.enforceCertificateDeliveryDays) {
      return 'Validación de plazo desactivada';
    }

    return `Nueva instalación: ${current.certificateDeliveryDaysNewInstallation} días · En operación: ${current.certificateDeliveryDaysInOperation} días`;
  }

  getComplianceTone(status: ComplianceStatus): StatusChipTone {
    switch (status) {
      case ComplianceStatus.OnTime:
        return 'success';

      case ComplianceStatus.Late:
        return 'warning';

      case ComplianceStatus.NotCompleted:
        return 'danger';

      case ComplianceStatus.PendingReview:
        return 'info';

      case ComplianceStatus.NotEvaluated:
        return 'neutral';

      case ComplianceStatus.NotDue:
        return 'primary';

      default:
        return 'neutral';
    }
  }

  getComplianceIcon(status: ComplianceStatus): string {
    switch (status) {
      case ComplianceStatus.OnTime:
        return 'check_circle';

      case ComplianceStatus.Late:
        return 'schedule';

      case ComplianceStatus.NotCompleted:
        return 'cancel';

      case ComplianceStatus.PendingReview:
        return 'hourglass_top';

      case ComplianceStatus.NotEvaluated:
        return 'remove_circle';

      case ComplianceStatus.NotDue:
        return 'event_available';

      default:
        return 'help';
    }
  }

  getInstallationConditionLabel(value: CalibrationInstallationCondition): string {
    switch (value) {
      case CalibrationInstallationCondition.InOperation:
        return 'En operación';

      case CalibrationInstallationCondition.NewInstallation:
        return 'Nueva instalación';

      default:
        return '—';
    }
  }

  getPlanItemStatusLabel(value: CalibrationPlanItemStatus): string {
    switch (value) {
      case CalibrationPlanItemStatus.Pending:
        return 'Pendiente';

      case CalibrationPlanItemStatus.DateChangeRequested:
        return 'Cambio solicitado';

      case CalibrationPlanItemStatus.ScheduledByPmse:
        return 'Cronogramado';

      case CalibrationPlanItemStatus.ScheduleApproved:
        return 'Cronograma aprobado';

      case CalibrationPlanItemStatus.AuthorizationRequested:
        return 'Autorización solicitada';

      case CalibrationPlanItemStatus.Authorized:
        return 'Autorizado';

      case CalibrationPlanItemStatus.InProcess:
        return 'En proceso';

      case CalibrationPlanItemStatus.InReview:
        return 'En revisión';

      case CalibrationPlanItemStatus.Approved:
        return 'Aprobado';

      case CalibrationPlanItemStatus.Rejected:
        return 'Rechazado';

      case CalibrationPlanItemStatus.Expired:
        return 'Vencido';

      default:
        return '—';
    }
  }

  getProcessStatusLabel(value?: CalibrationProcessStatus | null): string {
    switch (value) {
      case CalibrationProcessStatus.Draft:
        return 'Borrador';

      case CalibrationProcessStatus.InProcess:
        return 'En proceso';

      case CalibrationProcessStatus.Submitted:
        return 'Enviado a revisión';

      case CalibrationProcessStatus.Approved:
        return 'Aprobado';

      case CalibrationProcessStatus.Rejected:
        return 'Rechazado';

      case CalibrationProcessStatus.Corrected:
        return 'Corregido';

      default:
        return 'Sin proceso';
    }
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }

    const date = new Date(`${value}T00:00:00`);

    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return '—';
    }

    return new Date(value).toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private configureFilter(): void {
    this.dataSource.filterPredicate = (
      row: ComplianceReportRow,
      filter: string
    ) => {
      const term = filter.trim().toLowerCase();

      if (!term) {
        return true;
      }

      const searchable = [
        row.pmseCompanyName,
        row.meterCode,
        row.meterSerial,
        row.meterCenaceCode,
        row.meterTplCode,
        row.complianceStatusLabel,
        row.complianceDetail,
        row.certificateNumber,
        row.laboratoryName
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    };
  }

  private applyFilter(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  private validateFilters(): boolean {
    if (!this.year || this.year < 2000 || this.year > 2100) {
      this.toast.warning('Ingresa un año válido.');
      return false;
    }

    if (this.mode === 'monthly' && (!this.month || this.month < 1 || this.month > 12)) {
      this.toast.warning('Selecciona un mes válido.');
      return false;
    }

    return true;
  }
}