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

import { MeterCalibrationCertificatesService } from '../../data-access/meter-calibration-certificates.service';
import {
  CalibrationCertificateSource,
  CalibrationCertificateSourceLabels,
  CalibrationResult,
  CalibrationResultLabels,
  EntityStatus,
  MeterCalibrationCertificate
} from '../../domain/meter-calibration-certificate.model';

import { MeterCalibrationCertificateDrawerComponent } from '../../ui/meter-calibration-certificate-drawer/meter-calibration-certificate-drawer';

@Component({
  selector: 'app-meter-calibration-certificates-list',
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
    MeterCalibrationCertificateDrawerComponent
  ],
  templateUrl: './meter-calibration-certificates-list.html',
  styleUrl: './meter-calibration-certificates-list.scss'
})
export class MeterCalibrationCertificatesListComponent implements OnInit {
  private readonly service = inject(MeterCalibrationCertificatesService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly EntityStatus = EntityStatus;
  readonly getEntityStatusChip = getEntityStatusChip;

  dataSource = new MatTableDataSource<MeterCalibrationCertificate>([]);

  displayedColumns = [
    'certificateNumber',
    'meter',
    'pmse',
    'laboratory',
    'dates',
    'result',
    'source',
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
        [
          'CertificateNumber',
          'SecondaryCertificateNumber',
          'MeterCode',
          'MeterSerial',
          'PmseCompanyName',
          'AccreditedLaboratoryName'
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
          this.toast.error(response.message ?? 'Error al cargar los certificados.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar los certificados.');
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
    this.drawerOpen.set(true);
  }

  onDrawerClosed(): void {
    this.drawerOpen.set(false);
  }

  onCertificateCreated(): void {
    this.drawerOpen.set(false);
    this.toast.success('Certificado registrado correctamente.');
    this.pageIndex = 0;
    this.load();
  }

  onToggleStatus(certificate: MeterCalibrationCertificate): void {
    const action = certificate.status === EntityStatus.Active
      ? 'inactivar'
      : 'activar';

    this.confirmDialog.confirm({
      title: `${this.capitalize(action)} certificado`,
      message: `¿Deseas ${action} el certificado "${certificate.certificateNumber}"?`,
      confirmText: this.capitalize(action),
      cancelText: 'Cancelar',
      type: certificate.status === EntityStatus.Active ? 'warning' : 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.service.toggleStatus(certificate.id).subscribe({
        next: response => {
          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo cambiar el estado.');
            return;
          }

          this.toast.success('Estado actualizado correctamente.');
          this.load();
        },
        error: () => {
          this.toast.error('Error al cambiar el estado del certificado.');
        }
      });
    });
  }

  getResultLabel(result: CalibrationResult): string {
    return CalibrationResultLabels[result] ?? '—';
  }

  getSourceLabel(source: CalibrationCertificateSource): string {
    return CalibrationCertificateSourceLabels[source] ?? '—';
  }

  getResultTone(result: CalibrationResult): 'success' | 'danger' {
    return result === CalibrationResult.Approved ? 'success' : 'danger';
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}