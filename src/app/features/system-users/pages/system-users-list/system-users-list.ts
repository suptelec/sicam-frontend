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
import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';

import { SystemUser } from '../../domain/system-user.model';
import { getUserTypeChip } from '../../domain/system-user-chip.util';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { SearchToolbarComponent } from '../../../../shared/components/search-toolbar/search-toolbar';
import { TableCardComponent } from '../../../../shared/components/table-card/table-card';
import { DrawerShellComponent } from '../../../../shared/components/drawer-shell/drawer-shell';

@Component({
  selector: 'app-system-users-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule,
    CreateUserDrawerComponent,
    StatusChipComponent,
    PageHeaderComponent,
    SearchToolbarComponent,
    TableCardComponent,
    DrawerShellComponent
  ],
  templateUrl: './system-users-list.html',
  styleUrl: './system-users-list.scss'
})
export class SystemUsersListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private readonly service = inject(SystemUsersService);
  private readonly toast = inject(ToastService);
  private readonly odata = inject(ODataQueryBuilder);

  readonly getUserTypeChip = getUserTypeChip;

  dataSource = new MatTableDataSource<SystemUser>([]);
  displayedColumns = ['fullName', 'email', 'type', 'company', 'actions'];

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
        ['FullName', 'Email'],
        this.searchTerm
      ),
      orderBy: 'Id desc'
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

  onSearch(): void {
    this.pageIndex = 0;
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  onUserCreated(): void {
    this.drawerOpen.set(false);
    this.toast.success('Usuario creado correctamente');
    this.load();
  }
}