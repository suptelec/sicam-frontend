import { Component, output, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';
import { UserType } from '../../../../core/models/current-user.model';

import { PmseCompaniesService } from '../../../pmse-companies/data-access/pmse-companies.service';
import { PmseCompany } from '../../../pmse-companies/domain/pmse-company.model';

import { SystemUsersService } from '../../data-access/system-users.service';
import { PermissionLabels, PermissionValue } from '../../domain/system-user.enum';

@Component({
  selector: 'app-create-user-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    DrawerActionsComponent
  ],
  templateUrl: './create-user-drawer.html',
  styleUrl: './create-user-drawer.scss'
})
export class CreateUserDrawerComponent {
  created = output<void>();
  closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SystemUsersService);
  private readonly toast = inject(ToastService);
  private readonly companiesService = inject(PmseCompaniesService);

  readonly isLoading = signal(false);
  readonly companies = signal<PmseCompany[]>([]);
  readonly selectedType = signal<UserType | null>(null);
  readonly hidePassword = signal(true);

  readonly UserType = UserType;
  readonly PermissionValue = PermissionValue;
  readonly PermissionLabels = PermissionLabels;

  readonly permissionValues = [
    PermissionValue.None,
    PermissionValue.Read,
    PermissionValue.Write,
    PermissionValue.All
  ];

  readonly baseForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    name: ['', Validators.required],
    lastName: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone: [''],
    position: ['']
  });

  readonly cenacePermissions = this.fb.nonNullable.group({
    calibrationPlanPermission: [PermissionValue.None],
    calibrationProcessPermission: [PermissionValue.None],
    telemeteringPermission: [PermissionValue.None],
    auditPermission: [PermissionValue.None],
    companyPermission: [PermissionValue.None],
    systemUserPermission: [PermissionValue.None],
    reportPermission: [PermissionValue.None]
  });

  readonly pmsePermissions = this.fb.nonNullable.group({
    calibrationProcessPermission: [PermissionValue.None],
    systemUserPermission: [PermissionValue.None],
    reportPermission: [PermissionValue.None]
  });

  readonly pmseOperatorPermissions = this.fb.nonNullable.group({
    calibrationProcessPermission: [PermissionValue.None],
    telemeteringPermission: [PermissionValue.None],
    reportPermission: [PermissionValue.None]
  });

  readonly pmseCompanyForm = this.fb.group({
    pmseCompanyId: [null as number | null, Validators.required]
  });

  get saveDisabled(): boolean {
    if (this.isLoading()) return true;
    if (!this.selectedType()) return true;
    if (this.baseForm.invalid) return true;

    if (this.selectedType() === UserType.CenaceStaff) {
      return this.cenacePermissions.invalid;
    }

    if (this.selectedType() === UserType.PmseAdmin) {
      return this.pmseCompanyForm.invalid || this.pmsePermissions.invalid;
    }

    if (this.selectedType() === UserType.PmseOperator) {
      return this.pmseOperatorPermissions.invalid;
    }

    return true;
  }

  onTypeChange(type: UserType): void {
    this.selectedType.set(type);

    if (type === UserType.PmseAdmin) {
      this.loadCompanies();
    }
  }

  onSubmit(): void {
    const type = this.selectedType();

    if (!type) {
      this.toast.error('Selecciona el tipo de usuario');
      return;
    }

    this.baseForm.markAllAsTouched();

    if (type === UserType.PmseAdmin) {
      this.pmseCompanyForm.markAllAsTouched();
    }

    if (this.saveDisabled) {
      return;
    }

    this.isLoading.set(true);

    const base = this.baseForm.getRawValue();

    if (type === UserType.CenaceStaff) {
      this.service.createCenaceUser({
        ...base,
        ...this.cenacePermissions.getRawValue()
      } as any).subscribe({
        next: response => this.handleResult(response),
        error: () => this.handleError()
      });

      return;
    }

    if (type === UserType.PmseAdmin) {
      this.service.createPmseAdmin({
        ...base,
        ...this.pmsePermissions.getRawValue(),
        ...this.pmseCompanyForm.getRawValue()
      } as any).subscribe({
        next: response => this.handleResult(response),
        error: () => this.handleError()
      });

      return;
    }

    if (type === UserType.PmseOperator) {
      this.service.createPmseOperator({
        ...base,
        ...this.pmseOperatorPermissions.getRawValue()
      } as any).subscribe({
        next: response => this.handleResult(response),
        error: () => this.handleError()
      });
    }
  }

  close(): void {
    if (this.isLoading()) return;

    this.reset();
    this.closed.emit();
  }

  private loadCompanies(): void {
    this.companiesService.getAll({
      page: 1,
      take: 100,
      orderBy: 'Name asc'
    }).subscribe({
      next: response => {
        if (response.succeed) {
          this.companies.set(response.result ?? []);
        }
      }
    });
  }

  private handleResult(response: any): void {
    this.isLoading.set(false);

    if (!response.succeed) {
      this.toast.error(response.message ?? 'Error al crear el usuario');
      return;
    }

    this.toast.success('Usuario creado correctamente');
    this.created.emit();
    this.reset();
  }

  private handleError(): void {
    this.isLoading.set(false);
    this.toast.error('Error al crear el usuario');
  }

  private reset(): void {
    this.selectedType.set(null);
    this.hidePassword.set(true);

    this.baseForm.reset({
      username: '',
      email: '',
      name: '',
      lastName: '',
      password: '',
      phone: '',
      position: ''
    });

    this.pmseCompanyForm.reset({
      pmseCompanyId: null
    });

    this.cenacePermissions.reset({
      calibrationPlanPermission: PermissionValue.None,
      calibrationProcessPermission: PermissionValue.None,
      telemeteringPermission: PermissionValue.None,
      auditPermission: PermissionValue.None,
      companyPermission: PermissionValue.None,
      systemUserPermission: PermissionValue.None,
      reportPermission: PermissionValue.None
    });

    this.pmsePermissions.reset({
      calibrationProcessPermission: PermissionValue.None,
      systemUserPermission: PermissionValue.None,
      reportPermission: PermissionValue.None
    });

    this.pmseOperatorPermissions.reset({
      calibrationProcessPermission: PermissionValue.None,
      telemeteringPermission: PermissionValue.None,
      reportPermission: PermissionValue.None
    });

    this.isLoading.set(false);
  }
}