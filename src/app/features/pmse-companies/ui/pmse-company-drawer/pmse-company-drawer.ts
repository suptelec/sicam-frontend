import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Component, output, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PmseCompaniesService } from '../../data-access/pmse-companies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PmseType, EcuadorRegion, PmseTypeLabels, EcuadorRegionLabels } from '../../domain/pmse-company.enum';

@Component({
  selector: 'app-pmse-company-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './pmse-company-drawer.html',
  styleUrl: './pmse-company-drawer.scss'
})
export class PmseCompanyDrawerComponent {
  created = output<void>();
  closed  = output<void>();

  private fb      = inject(FormBuilder);
  private service = inject(PmseCompaniesService);
  private toast   = inject(ToastService);

  isLoading = signal(false);

  pmseTypes    = Object.values(PmseType).filter(v => typeof v === 'number') as PmseType[];
  regions      = Object.values(EcuadorRegion).filter(v => typeof v === 'number') as EcuadorRegion[];
  ecuadorProvinces = [
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

  PmseTypeLabels = PmseTypeLabels;
  EcuadorRegionLabels = EcuadorRegionLabels;

  form = this.fb.group({
    name:         ['', [Validators.required, Validators.maxLength(200)]],
    externalCode: ['', [Validators.required, Validators.maxLength(50)]],
    ruc:          ['', [Validators.required, Validators.minLength(13), Validators.maxLength(13)]],
    type:         [null as PmseType | null, Validators.required],
    region:       [null as EcuadorRegion | null, Validators.required],
    phone:        [''],
    email:        ['', Validators.email],
    address:      [''],
    province:     [''],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.service.create(this.form.value as any).subscribe({
      next: res => {
        if (res.succeed) {
          this.created.emit();
        } else {
          this.toast.error(res.message ?? 'Error al crear la empresa');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al crear la empresa');
        this.isLoading.set(false);
      }
    });
  }
}