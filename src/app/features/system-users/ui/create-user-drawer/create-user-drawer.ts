import { Component, output, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SystemUsersService } from '../../data-access/system-users.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PmseCompaniesService } from '../../../pmse-companies/data-access/pmse-companies.service';
import { PmseCompany } from '../../../pmse-companies/domain/pmse-company.model';
import { UserType } from '../../../../core/models/current-user.model';
import { PermissionValue, PermissionLabels } from '../../domain/system-user.enum';

import { ODataQueryBuilder } from '../../../../core/http/odata-query-builder.service';

@Component({
  selector: 'app-create-user-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-user-drawer.html',
  styleUrl: './create-user-drawer.scss'
})
export class CreateUserDrawerComponent {
  created = output<void>();
  closed  = output<void>();

  private fb      = inject(FormBuilder);
  private service = inject(SystemUsersService);
  private toast   = inject(ToastService);
  private companiesService = inject(PmseCompaniesService);
  private readonly odata = inject(ODataQueryBuilder);

  isLoading = signal(false);
  companies = signal<PmseCompany[]>([]);

  UserType = UserType;
  PermissionValue = PermissionValue;
  PermissionLabels = PermissionLabels;

  permissionValues = [
    PermissionValue.None,
    PermissionValue.Read,
    PermissionValue.Write,
    PermissionValue.All
  ];

  selectedType = signal<UserType | null>(null);
  hidePassword = signal(true);

  baseForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    name: ['', Validators.required],
    lastName: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone: [''],
    position: [''],
  });

  cenacePermissions = this.fb.group({
    calibrationPlanPermission: [PermissionValue.None],
    calibrationProcessPermission: [PermissionValue.None],
    telemeteringPermission: [PermissionValue.None],
    auditPermission: [PermissionValue.None],
    companyPermission: [PermissionValue.None],
    systemUserPermission: [PermissionValue.None],
    reportPermission: [PermissionValue.None],
  });

  pmsePermissions = this.fb.group({
    calibrationProcessPermission: [PermissionValue.None],
    systemUserPermission: [PermissionValue.None],
    reportPermission: [PermissionValue.None],
  });

  pmseOperatorPermissions = this.fb.group({
    calibrationProcessPermission: [PermissionValue.None],
    telemeteringPermission: [PermissionValue.None],
    reportPermission: [PermissionValue.None],
  });

  pmseCompanyForm = this.fb.group({
    pmseCompanyId: [null as number | null, Validators.required]
  });

  onTypeChange(type: UserType): void {
    this.selectedType.set(type);

    if (type === UserType.PmseAdmin) {
      this.loadCompanies();
    }
  }

  private loadCompanies(): void {
    this.companiesService.getAll({
      page: 1,
      take: 100,
      orderBy: 'Name asc'
    }).subscribe({
      next: res => {
        if (res.succeed) {
          this.companies.set(res.result ?? []);
        }
      }
    });
  }

  onSubmit(): void {
    const type = this.selectedType();

    if (!type) {
      this.toast.error('Selecciona el tipo de usuario');
      return;
    }

    this.baseForm.markAllAsTouched();

    if (this.baseForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    const base = this.baseForm.value;

    if (type === UserType.CenaceStaff) {
      const perms = this.cenacePermissions.value;

      this.service.createCenaceUser({ ...base, ...perms } as any).subscribe({
        next: res => this.handleResult(res),
        error: () => this.handleError()
      });

      return;
    }

    if (type === UserType.PmseAdmin) {
      this.pmseCompanyForm.markAllAsTouched();

      if (this.pmseCompanyForm.invalid) {
        this.isLoading.set(false);
        return;
      }

      const perms = this.pmsePermissions.value;
      const company = this.pmseCompanyForm.value;

      this.service.createPmseAdmin({ ...base, ...perms, ...company } as any).subscribe({
        next: res => this.handleResult(res),
        error: () => this.handleError()
      });

      return;
    }

    if (type === UserType.PmseOperator) {
      const perms = this.pmseOperatorPermissions.value;

      this.service.createPmseOperator({ ...base, ...perms } as any).subscribe({
        next: res => this.handleResult(res),
        error: () => this.handleError()
      });
    }
  }

  private handleResult(res: any): void {
    if (res.succeed) {
      this.created.emit();
    } else {
      this.toast.error(res.message ?? 'Error al crear el usuario');
    }

    this.isLoading.set(false);
  }

  private handleError(): void {
    this.toast.error('Error al crear el usuario');
    this.isLoading.set(false);
  }
}