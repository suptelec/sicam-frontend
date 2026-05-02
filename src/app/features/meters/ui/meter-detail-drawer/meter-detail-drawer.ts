import { Component, EventEmitter, OnInit, Output, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToastService } from '../../../../core/services/toast.service';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import { getEntityStatusChip } from '../../../../shared/utils/status-chip.util';

import { MetersService } from '../../data-access/meters.service';
import {
  InstallationType,
  InstallationTypeLabels,
  Meter,
  MeterRequirementType,
  MeterRequirementTypeLabels
} from '../../domain/meter.model';

@Component({
  selector: 'app-meter-detail-drawer',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    StatusChipComponent
  ],
  templateUrl: './meter-detail-drawer.html',
  styleUrl: './meter-detail-drawer.scss'
})
export class MeterDetailDrawerComponent implements OnInit {
  meterId = input<number | null>(null);

  @Output() closed = new EventEmitter<void>();

  private readonly service = inject(MetersService);
  private readonly toast = inject(ToastService);

  readonly getEntityStatusChip = getEntityStatusChip;

  loading = signal(false);
  meter = signal<Meter | null>(null);

  ngOnInit(): void {
    const id = this.meterId();

    if (!id) {
      this.toast.error('No se recibió el identificador del medidor.');
      this.closed.emit();
      return;
    }

    this.load(id);
  }

  close(): void {
    this.closed.emit();
  }

  getInstallationTypeLabel(value?: InstallationType | null): string {
    return value ? InstallationTypeLabels[value] : '—';
  }

  getRequirementTypeLabel(value?: MeterRequirementType | null): string {
    return value ? MeterRequirementTypeLabels[value] : '—';
  }

  getPrincipalLabel(meter: Meter): string {
    return meter.isPrincipal ? 'Principal' : 'Respaldo';
  }

  private load(id: number): void {
    this.loading.set(true);

    this.service.getById(id).subscribe({
      next: response => {
        this.loading.set(false);

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo cargar el detalle del medidor.');
          this.closed.emit();
          return;
        }

        this.meter.set(response.result);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Error al cargar el detalle del medidor.');
        this.closed.emit();
      }
    });
  }
}