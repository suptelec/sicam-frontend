import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SystemSettingsService } from '../../../system-settings/data-access/system-settings.service';
import { RegulatoryRulesSettings } from '../../../system-settings/domain/system-settings.model';

import {
  CalibrationInstallationCondition,
  CalibrationProcess,
  CalibrationProcessStatus
} from '../../../my-calibration-items/domain/calibration-process.model';

type DeadlineTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

@Component({
  selector: 'app-certificate-delivery-deadline-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './certificate-delivery-deadline-panel.html',
  styleUrl: './certificate-delivery-deadline-panel.scss'
})
export class CertificateDeliveryDeadlinePanelComponent implements OnInit {
  process = input<CalibrationProcess | null>(null);

  private readonly settingsService = inject(SystemSettingsService);

  isLoading = signal(false);
  settings = signal<RegulatoryRulesSettings | null>(null);

  readonly isRuleEnabled = computed(() =>
    !!this.settings()?.enforceCertificateDeliveryDays
  );

  readonly configuredDays = computed(() => {
    const current = this.process();
    const rules = this.settings();

    if (!current || !rules) {
      return null;
    }

    return current.installationCondition === CalibrationInstallationCondition.NewInstallation
      ? rules.certificateDeliveryDaysNewInstallation
      : rules.certificateDeliveryDaysInOperation;
  });

  readonly deadlineDate = computed(() => {
    const current = this.process();
    const days = this.configuredDays();

    if (!current?.executionDate || days === null) {
      return null;
    }

    return this.addDays(current.executionDate, days);
  });

  readonly evaluationDate = computed(() => {
    const current = this.process();

    if (current?.submittedAt) {
      return this.extractDate(current.submittedAt);
    }

    return this.todayIsoDate();
  });

  readonly differenceDays = computed(() => {
    const deadline = this.deadlineDate();
    const evaluation = this.evaluationDate();

    if (!deadline || !evaluation) {
      return null;
    }

    return this.diffDays(evaluation, deadline);
  });

  readonly conditionLabel = computed(() => {
    const current = this.process();

    if (!current) {
      return '—';
    }

    return current.installationCondition === CalibrationInstallationCondition.NewInstallation
      ? 'Nueva instalación'
      : 'Instalación en operación';
  });

  readonly statusTone = computed<DeadlineTone>(() => {
    const current = this.process();

    if (!current) {
      return 'neutral';
    }

    if (!this.isRuleEnabled()) {
      return 'neutral';
    }

    const difference = this.differenceDays();

    if (difference === null) {
      return 'neutral';
    }

    if (this.wasSubmitted()) {
      return difference <= 0 ? 'success' : 'danger';
    }

    if (difference <= 0) {
      return 'success';
    }

    return 'danger';
  });

  readonly statusIcon = computed(() => {
    switch (this.statusTone()) {
      case 'success':
        return 'check_circle';

      case 'danger':
        return 'warning';

      case 'warning':
        return 'schedule';

      case 'info':
        return 'info';

      default:
        return 'rule';
    }
  });

  readonly statusLabel = computed(() => {
    const current = this.process();

    if (!current) {
      return 'Sin información';
    }

    if (!this.isRuleEnabled()) {
      return 'Control de plazo inactivo';
    }

    const difference = this.differenceDays();

    if (difference === null) {
      return 'Plazo no calculado';
    }

    if (this.wasSubmitted()) {
      return difference <= 0
        ? 'Entregado dentro del plazo'
        : 'Entregado fuera del plazo';
    }

    return difference <= 0
      ? 'Dentro del plazo para entregar'
      : 'Fuera del plazo para entregar';
  });

  readonly detailText = computed(() => {
    const current = this.process();
    const days = this.configuredDays();
    const deadline = this.deadlineDate();
    const difference = this.differenceDays();

    if (!current) {
      return 'No se pudo cargar la información del proceso.';
    }

    if (!this.isRuleEnabled()) {
      return 'El control de plazo de entrega del certificado está desactivado en la configuración del sistema.';
    }

    if (!current.executionDate || days === null || !deadline || difference === null) {
      return 'No se cuenta con información suficiente para calcular el plazo de entrega.';
    }

    if (this.wasSubmitted()) {
      if (difference <= 0) {
        const beforeDays = Math.abs(difference);

        return beforeDays === 0
          ? 'El proceso fue enviado a revisión el mismo día del vencimiento del plazo.'
          : `El proceso fue enviado a revisión ${beforeDays} día(s) antes del vencimiento del plazo.`;
      }

      return `El proceso fue enviado a revisión ${difference} día(s) después del vencimiento del plazo.`;
    }

    if (difference <= 0) {
      const remaining = Math.abs(difference);

      return remaining === 0
        ? 'El plazo de entrega vence hoy. Completa la información y envía el proceso a revisión.'
        : `Aún quedan ${remaining} día(s) para entregar el certificado dentro del plazo.`;
    }

    return `El plazo de entrega venció hace ${difference} día(s). El sistema puede bloquear el envío si esta regla está activa.`;
  });

  readonly submittedLabel = computed(() => {
    const current = this.process();

    if (!current?.submittedAt) {
      return 'Aún no enviado';
    }

    return this.formatDisplayDate(this.extractDate(current.submittedAt));
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  get toneClass(): string {
    return `deadline-panel--${this.statusTone()}`;
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const normalized = this.extractDate(value);
    const date = new Date(`${normalized}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  private loadSettings(): void {
    this.isLoading.set(true);

    this.settingsService.getRegulatoryRules().subscribe({
      next: response => {
        this.isLoading.set(false);

        if (response.succeed && response.result) {
          this.settings.set(response.result);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private wasSubmitted(): boolean {
    const current = this.process();

    if (!current) {
      return false;
    }

    return !!current.submittedAt ||
      current.processStatus === CalibrationProcessStatus.Submitted ||
      current.processStatus === CalibrationProcessStatus.Approved ||
      current.processStatus === CalibrationProcessStatus.Rejected;
  }

  private addDays(value: string, days: number): string {
    const date = new Date(`${this.extractDate(value)}T00:00:00`);
    date.setDate(date.getDate() + days);

    return this.toIsoDate(date);
  }

  private diffDays(first: string, second: string): number {
    const firstDate = new Date(`${this.extractDate(first)}T00:00:00`);
    const secondDate = new Date(`${this.extractDate(second)}T00:00:00`);

    const diff = firstDate.getTime() - secondDate.getTime();

    return Math.round(diff / 86_400_000);
  }

  private extractDate(value: string): string {
    return value.substring(0, 10);
  }

  private todayIsoDate(): string {
    return this.toIsoDate(new Date());
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}