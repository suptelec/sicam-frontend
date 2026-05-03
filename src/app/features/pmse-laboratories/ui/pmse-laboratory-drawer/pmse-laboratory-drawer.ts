import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';

import { ToastService } from '../../../../core/services/toast.service';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';

import { PmseCompaniesService } from '../../../pmse-companies/data-access/pmse-companies.service';
import { PmseCompany } from '../../../pmse-companies/domain/pmse-company.model';

import { PmseLaboratoriesService } from '../../data-access/pmse-laboratories.service';
import {
  CreatePmseLaboratoryRequest,
  PmseLaboratory
} from '../../domain/pmse-laboratory.model';

@Component({
  selector: 'app-pmse-laboratory-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    DrawerActionsComponent
  ],
  templateUrl: './pmse-laboratory-drawer.html',
  styleUrl: './pmse-laboratory-drawer.scss'
})
export class PmseLaboratoryDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PmseLaboratoriesService);
  private readonly companiesService = inject(PmseCompaniesService);
  private readonly userScope = inject(UserScopeService);
  private readonly toast = inject(ToastService);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<PmseLaboratory>();

  loading = false;
  loadingCompanies = signal(false);
  companies = signal<PmseCompany[]>([]);

  readonly form = this.fb.group({
    pmseCompanyId: [null as number | null],

    name: ['', [Validators.required, Validators.maxLength(200)]],
    accreditationCode: ['', [Validators.required, Validators.maxLength(100)]],
    scope: ['', [Validators.maxLength(500)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(180)]],
    phone: ['', [Validators.maxLength(50)]],
    address: ['', [Validators.maxLength(300)]],

    contractNumber: ['', [Validators.maxLength(100)]],
    contractDocumentUrl: ['', [Validators.maxLength(1000)]],
    notes: ['', [Validators.maxLength(1000)]]
  });

  constructor() {
    this.configurePmseField();
    this.loadCompaniesIfNeeded();
  }

  get isPmseUser(): boolean {
    return this.userScope.isPmseUser();
  }

  get saveDisabled(): boolean {
    return this.loading || this.loadingCompanies() || this.form.invalid;
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const pmseCompanyId = this.resolvePmseCompanyId();

    if (!pmseCompanyId) {
      this.toast.error('No se pudo resolver la empresa PMSE.');
      return;
    }

    const raw = this.form.getRawValue();

    const dto: CreatePmseLaboratoryRequest = {
      pmseCompanyId,

      name: this.normalizeRequired(raw.name),
      accreditationCode: this.normalizeRequired(raw.accreditationCode),
      scope: this.normalize(raw.scope),
      contactEmail: this.normalize(raw.contactEmail),
      phone: this.normalize(raw.phone),
      address: this.normalize(raw.address),

      contractNumber: this.normalize(raw.contractNumber),
      contractDocumentUrl: this.normalize(raw.contractDocumentUrl),
      notes: this.normalize(raw.notes)
    };

    this.loading = true;

    this.service.create(dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo crear el laboratorio contratado.');
          return;
        }

        this.toast.success('Laboratorio contratado creado correctamente.');
        this.created.emit(response.result);
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al crear el laboratorio contratado.');
      }
    });
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  getCompanyLabel(company: PmseCompany): string {
    return `${company.name} - ${company.externalCode}`;
  }

  private configurePmseField(): void {
    if (this.isPmseUser) {
      const pmseCompanyId = this.userScope.pmseCompanyId();

      this.form.controls.pmseCompanyId.setValue(pmseCompanyId);
      this.form.controls.pmseCompanyId.disable();

      return;
    }

    this.form.controls.pmseCompanyId.addValidators(Validators.required);
    this.form.controls.pmseCompanyId.updateValueAndValidity();
  }

  private loadCompaniesIfNeeded(): void {
    if (this.isPmseUser) return;

    this.loadingCompanies.set(true);

    this.companiesService.getAll({
      page: 1,
      take: 300,
      filter: 'Status eq 1',
      orderBy: 'Name asc'
    }).subscribe({
      next: response => {
        this.loadingCompanies.set(false);

        if (response.succeed) {
          this.companies.set(response.result ?? []);
          return;
        }

        this.toast.warning(response.message ?? 'No se pudieron cargar las empresas PMSE.');
      },
      error: () => {
        this.loadingCompanies.set(false);
        this.toast.warning('No se pudieron cargar las empresas PMSE.');
      }
    });
  }

  private resolvePmseCompanyId(): number | null {
    if (this.isPmseUser) {
      return this.userScope.pmseCompanyId();
    }

    const raw = this.form.getRawValue();

    return raw.pmseCompanyId ? Number(raw.pmseCompanyId) : null;
  }

  private reset(): void {
    this.form.reset({
      pmseCompanyId: this.isPmseUser ? this.userScope.pmseCompanyId() : null,

      name: '',
      accreditationCode: '',
      scope: '',
      contactEmail: '',
      phone: '',
      address: '',

      contractNumber: '',
      contractDocumentUrl: '',
      notes: ''
    });

    if (this.isPmseUser) {
      this.form.controls.pmseCompanyId.disable();
    }

    this.loading = false;
  }

  private normalize(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();

    return normalized ? normalized : null;
  }

  private normalizeRequired(value: unknown): string {
    return typeof value === 'string'
      ? value.trim()
      : '';
  }
}