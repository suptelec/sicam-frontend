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

import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { WorkAuthorizationsService } from '../../../my-calibration-items/data-access/work-authorizations.service';
import {
  CalibrationWorkAuthorization,
  CalibrationWorkAuthorizationStatus
} from '../../../my-calibration-items/domain/work-authorization.model';

@Component({
  selector: 'app-work-authorization-reviews-list',
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
    StatusChipComponent
  ],
  templateUrl: './work-authorization-reviews-list.html',
  styleUrl: './work-authorization-reviews-list.scss'
})
export class WorkAuthorizationReviewsListComponent implements OnInit {
  private readonly service = inject(WorkAuthorizationsService);
  private readonly odata = inject(ODataQueryBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly CalibrationWorkAuthorizationStatus = CalibrationWorkAuthorizationStatus;

  dataSource = new MatTableDataSource<CalibrationWorkAuthorization>([]);

  displayedColumns = [
    'item',
    'pmse',
    'workWindow',
    'document',
    'authorizationStatus',
    'actions'
  ];

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  searchTerm = '';
  isLoading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    const searchFilter = this.odata.searchInFields(
      [
        'PmseCompanyName',
        'MeterCode',
        'MeterSerial',
        'RequestReason'
      ],
      this.searchTerm
    );

    const requestedFilter = `AuthorizationStatus eq ${CalibrationWorkAuthorizationStatus.Requested}`;

    const filter = [requestedFilter, searchFilter]
      .filter(Boolean)
      .map(value => `(${value})`)
      .join(' and ');

    this.service.getAll({
      page: this.pageIndex + 1,
      take: this.pageSize,
      filter,
      orderBy: 'CreatedAt desc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.dataSource.data = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        } else {
          this.toast.error(response.message ?? 'Error al cargar autorizaciones.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar autorizaciones.');
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

  onAuthorize(row: CalibrationWorkAuthorization): void {
    this.confirmDialog.confirm({
      title: 'Autorizar inicio de trabajos',
      message: `Se autorizará el inicio de trabajos para el medidor ${row.meterCode ?? row.calibrationPlanItemId}. ¿Deseas continuar?`,
      confirmText: 'Autorizar',
      cancelText: 'Cancelar',
      type: 'info'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.service.authorize(row.id, {
        authorizationMessage: 'Se autoriza el inicio de trabajos conforme al cronograma aprobado.',
        authorizationDocumentUrl: row.requestDocumentUrl
      }).subscribe({
        next: response => {
          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo autorizar la solicitud.');
            return;
          }

          this.toast.success('Autorización aprobada correctamente.');
          this.load();
        },
        error: () => {
          this.toast.error('Error al autorizar la solicitud.');
        }
      });
    });
  }

  onReject(row: CalibrationWorkAuthorization): void {
    const reason = prompt('Motivo de rechazo');

    if (!reason?.trim()) {
      return;
    }

    this.service.reject(row.id, {
      rejectionReason: reason.trim()
    }).subscribe({
      next: response => {
        if (!response.succeed) {
          this.toast.error(response.message ?? 'No se pudo rechazar la solicitud.');
          return;
        }

        this.toast.success('Autorización rechazada correctamente.');
        this.load();
      },
      error: () => {
        this.toast.error('Error al rechazar la solicitud.');
      }
    });
  }

  getStatusLabel(status: CalibrationWorkAuthorizationStatus): string {
    switch (Number(status)) {
      case CalibrationWorkAuthorizationStatus.Requested:
        return 'Solicitada';

      case CalibrationWorkAuthorizationStatus.Authorized:
        return 'Autorizada';

      case CalibrationWorkAuthorizationStatus.Rejected:
        return 'Rechazada';

      case CalibrationWorkAuthorizationStatus.Cancelled:
        return 'Cancelada';

      default:
        return '—';
    }
  }

  getStatusTone(
    status: CalibrationWorkAuthorizationStatus
  ): 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' {
    switch (Number(status)) {
      case CalibrationWorkAuthorizationStatus.Requested:
        return 'warning';

      case CalibrationWorkAuthorizationStatus.Authorized:
        return 'success';

      case CalibrationWorkAuthorizationStatus.Rejected:
        return 'danger';

      case CalibrationWorkAuthorizationStatus.Cancelled:
        return 'info';

      default:
        return 'neutral';
    }
  }

  getStatusIcon(status: CalibrationWorkAuthorizationStatus): string {
    switch (Number(status)) {
      case CalibrationWorkAuthorizationStatus.Requested:
        return 'approval';

      case CalibrationWorkAuthorizationStatus.Authorized:
        return 'verified';

      case CalibrationWorkAuthorizationStatus.Rejected:
        return 'block';

      case CalibrationWorkAuthorizationStatus.Cancelled:
        return 'cancel';

      default:
        return 'info';
    }
  }
}