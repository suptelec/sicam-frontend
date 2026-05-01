import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ExternalClientsService } from '../../data-access/external-clients.service';
import { EntityStatus, ExternalClient } from '../../domain/external-client.model';
import { CreateClientDrawerComponent } from '../../ui/create-client-drawer/create-client-drawer';

@Component({
  selector: 'app-external-clients-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    CreateClientDrawerComponent
  ],
  templateUrl: './external-clients-list.html',
  styleUrl: './external-clients-list.scss'
})
export class ExternalClientsListComponent implements OnInit {
  private readonly service = inject(ExternalClientsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly displayedColumns = [
    'displayName',
    'clientId',
    'contactEmail',
    'status',
    'actions'
  ];

  readonly EntityStatus = EntityStatus;

  clients: ExternalClient[] = [];
  loading = false;
  drawerOpen = false;

  pageIndex = 0;
  pageSize = 10;
  totalRecords = 0;

  ngOnInit(): void {
    this.load();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex = 0;
        this.load();
      });
  }

  load(): void {
    this.loading = true;

    const search = this.searchControl.value.trim();

    this.service
      .getAll(this.pageIndex + 1, this.pageSize, {
        filter: this.buildFilter(search),
        orderby: 'CreatedAt desc'
      })
      .subscribe({
        next: response => {
          this.loading = false;

          if (!response.succeed) {
            this.clients = [];
            this.totalRecords = 0;

            this.snackBar.open(
              response.message ?? 'No se pudo cargar la información.',
              'Cerrar',
              { duration: 4000 }
            );

            return;
          }

          this.clients = response.result ?? [];
          this.totalRecords = response.totalRecords ?? 0;
        },
        error: () => {
          this.loading = false;
          this.clients = [];
          this.totalRecords = 0;

          this.snackBar.open(
            'Ocurrió un error al cargar los clientes externos.',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  openDrawer(): void {
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }

  onClientCreated(): void {
    this.pageIndex = 0;
    this.load();
  }

  revoke(client: ExternalClient): void {
    const confirmed = window.confirm(
      `¿Deseas revocar el cliente externo "${client.displayName}"?\n\nEsta acción eliminará sus credenciales M2M.`
    );

    if (!confirmed) return;

    this.service.revoke(client.clientId).subscribe({
      next: response => {
        if (!response.succeed) {
          this.snackBar.open(
            response.message ?? 'No se pudo revocar el cliente externo.',
            'Cerrar',
            { duration: 4000 }
          );
          return;
        }

        this.snackBar.open(
          'Cliente externo revocado correctamente.',
          'Cerrar',
          { duration: 3500 }
        );

        this.load();
      },
      error: () => {
        this.snackBar.open(
          'Ocurrió un error al revocar el cliente externo.',
          'Cerrar',
          { duration: 4000 }
        );
      }
    });
  }

  copy(value: string): void {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      this.snackBar.open('Client ID copiado al portapapeles.', 'Cerrar', {
        duration: 2500
      });
    });
  }

  private buildFilter(search: string): string | undefined {
    if (!search) return undefined;

    const value = search.toLowerCase().replace(/'/g, "''");

    return [
      `contains(tolower(DisplayName),'${value}')`,
      `contains(tolower(ContactEmail),'${value}')`,
      `contains(tolower(ClientId),'${value}')`
    ].join(' or ');
  }
}