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

import { PmseCompaniesService } from '../../data-access/pmse-companies.service';
import {
  EcuadorRegion,
  EcuadorRegionLabels,
  PmseType,
  PmseTypeLabels
} from '../../domain/pmse-company.enum';

@Component({
  selector: 'app-pmse-company-drawer',
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
  templateUrl: './pmse-company-drawer.html',
  styleUrl: './pmse-company-drawer.scss'
})
export class PmseCompanyDrawerComponent {
  created = output<void>();
  closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PmseCompaniesService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);

  readonly pmseTypes = Object.values(PmseType)
    .filter(value => typeof value === 'number') as PmseType[];

  readonly regions = Object.values(EcuadorRegion)
    .filter(value => typeof value === 'number') as EcuadorRegion[];

  readonly ecuadorProvinces = [
    'Azuay',
    'Bolívar',
    'Cañar',
    'Carchi',
    'Chimborazo',
    'Cotopaxi',
    'El Oro',
    'Esmeraldas',
    'Galápagos',
    'Guayas',
    'Imbabura',
    'Loja',
    'Los Ríos',
    'Manabí',
    'Morona Santiago',
    'Napo',
    'Orellana',
    'Pastaza',
    'Pichincha',
    'Santa Elena',
    'Santo Domingo de los Tsáchilas',
    'Sucumbíos',
    'Tungurahua',
    'Zamora Chinchipe'
  ];

  readonly PmseTypeLabels = PmseTypeLabels;
  readonly EcuadorRegionLabels = EcuadorRegionLabels;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    externalCode: ['', [Validators.required, Validators.maxLength(50)]],
    ruc: ['', [Validators.required, Validators.minLength(13), Validators.maxLength(13)]],
    type: [null as PmseType | null, Validators.required],
    region: [null as EcuadorRegion | null, Validators.required],
    phone: [''],
    email: ['', Validators.email],
    address: [''],
    province: ['']
  });

  get saveDisabled(): boolean {
    return this.isLoading() || this.form.invalid;
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    this.service.create(this.form.getRawValue() as any).subscribe({
      next: response => {
        this.isLoading.set(false);

        if (!response.succeed) {
          this.toast.error(response.message ?? 'Error al crear la empresa');
          return;
        }

        this.toast.success('Empresa creada correctamente');
        this.created.emit();
        this.reset();
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al crear la empresa');
      }
    });
  }

  close(): void {
    if (this.isLoading()) return;

    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.form.reset({
      name: '',
      externalCode: '',
      ruc: '',
      type: null,
      region: null,
      phone: '',
      email: '',
      address: '',
      province: ''
    });

    this.isLoading.set(false);
  }
}