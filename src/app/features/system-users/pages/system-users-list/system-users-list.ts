import { NgClass } from '@angular/common';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { SystemUsersService } from '../../data-access/system-users.service';
import { CreateUserDrawerComponent } from '../../ui/create-user-drawer/create-user-drawer';
import { ToastService } from '../../../../core/services/toast.service';
import { SystemUser } from '../../domain/system-user.model';
import { UserType } from '../../../../core/models/current-user.model';

@Component({
  selector: 'app-system-users-list',
  standalone: true,
  imports: [
    NgClass,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule,
    CreateUserDrawerComponent
  ],
  templateUrl: './system-users-list.html',
  styleUrl: './system-users-list.scss'
})
export class SystemUsersListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private service = inject(SystemUsersService);
  private toast   = inject(ToastService);

  dataSource       = new MatTableDataSource<SystemUser>([]);
  displayedColumns = ['fullName', 'email', 'type', 'company', 'actions'];

  totalRecords    = 0;
  pageSize        = 10;
  pageIndex       = 0;
  pageSizeOptions = [10, 20, 50];
  searchTerm      = '';
  isLoading       = signal(false);
  drawerOpen      = signal(false);

  UserType = UserType;

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
          this.toast.error(res.message ?? 'Error al cargar los usuarios');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar los usuarios');
        this.isLoading.set(false);
      }
    });
  }

private buildFilter(): string | undefined {
  const value = this.searchTerm.trim().toLowerCase().replace(/'/g, "''");

  if (!value) {
    return undefined;
  }

  return [
    `contains(tolower(FullName),'${value}')`,
    `contains(tolower(Email),'${value}')`
  ].join(' or ');
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

  getUserTypeLabel(type: UserType): string {
    switch (type) {
      case UserType.CenaceStaff:  return 'CENACE';
      case UserType.PmseAdmin:    return 'Admin PMSE';
      case UserType.PmseOperator: return 'Operador PMSE';
      default: return 'Desconocido';
    }
  }

  getUserTypeBadgeClass(type: UserType): string {
    switch (type) {
      case UserType.CenaceStaff:  return 'badge-cenace';
      case UserType.PmseAdmin:    return 'badge-admin';
      case UserType.PmseOperator: return 'badge-operator';
      default: return '';
    }
  }

  onUserCreated(): void {
    this.drawerOpen.set(false);
    this.toast.success('Usuario creado correctamente');
    this.load();
  }
}