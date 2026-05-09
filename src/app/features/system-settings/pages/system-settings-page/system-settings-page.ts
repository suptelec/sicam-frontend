import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToastService } from '../../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';

import { SystemSettingsService } from '../../data-access/system-settings.service';
import {
  RegulatoryReportSettings,
  RegulatoryRulesSettings,
  UpdateRegulatoryReportSettings,
  UpdateRegulatoryRulesSettings
} from '../../domain/system-settings.model';

@Component({
  selector: 'app-system-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PageHeaderComponent
  ],
  templateUrl: './system-settings-page.html',
  styleUrl: './system-settings-page.scss'
})
export class SystemSettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SystemSettingsService);
  private readonly toast = inject(ToastService);

  readonly months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  readonly reportFormats = [
    { value: 'excel', label: 'Excel' },
    { value: 'pdf', label: 'PDF' }
  ];

  isLoading = signal(false);
  isSavingRules = signal(false);
  isSavingReports = signal(false);

  lastRulesLoaded = signal<RegulatoryRulesSettings | null>(null);
  lastReportsLoaded = signal<RegulatoryReportSettings | null>(null);

  readonly hasData = computed(() =>
    this.lastRulesLoaded() !== null && this.lastReportsLoaded() !== null
  );

  readonly rulesForm = this.fb.nonNullable.group({
    enforceScheduleSubmissionLeadDays: [false],
    enforceCertificateDeliveryDays: [false],
    scheduleSubmissionLeadDays: [
      8,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(365)
      ]
    ],
    certificateDeliveryDaysNewInstallation: [
      4,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(365)
      ]
    ],
    certificateDeliveryDaysInOperation: [
      10,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(365)
      ]
    ]
  });

  readonly reportsForm = this.fb.nonNullable.group({
    monthlyComplianceReportEnabled: [false],
    annualComplianceReportEnabled: [false],
    arcernnrToRecipientsText: [
      '',
      [
        Validators.maxLength(2000)
      ]
    ],
    arcernnrCcRecipientsText: [
      '',
      [
        Validators.maxLength(2000)
      ]
    ],
    monthlyReportDay: [
      10,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(28)
      ]
    ],
    monthlyReportHour: [
      '09:00',
      [
        Validators.required
      ]
    ],
    annualReportMonth: [
      10,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(12)
      ]
    ],
    annualReportDay: [
      30,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(31)
      ]
    ],
    annualReportHour: [
      '09:00',
      [
        Validators.required
      ]
    ],
    reportFormat: [
      'excel',
      [
        Validators.required
      ]
    ]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    forkJoin({
      rules: this.service.getRegulatoryRules(),
      reports: this.service.getRegulatoryReports()
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: response => {
          if (!response.rules.succeed || !response.rules.result) {
            this.toast.error(
              response.rules.message ??
                'No se pudo cargar la configuración de reglas regulatorias.'
            );
            return;
          }

          if (!response.reports.succeed || !response.reports.result) {
            this.toast.error(
              response.reports.message ??
                'No se pudo cargar la configuración de reportes regulatorios.'
            );
            return;
          }

          this.patchRules(response.rules.result);
          this.patchReports(response.reports.result);

          this.lastRulesLoaded.set(response.rules.result);
          this.lastReportsLoaded.set(response.reports.result);
        },
        error: error => {
          const message =
            error?.error?.message ??
            'Error al cargar la configuración regulatoria.';

          this.toast.error(message);
        }
      });
  }

  saveRules(): void {
    if (this.rulesForm.invalid) {
      this.rulesForm.markAllAsTouched();
      this.toast.warning('Revisa los valores de reglas regulatorias.');
      return;
    }

    const dto: UpdateRegulatoryRulesSettings = this.rulesForm.getRawValue();

    if (
      dto.certificateDeliveryDaysNewInstallation >
      dto.certificateDeliveryDaysInOperation
    ) {
      this.toast.warning(
        'El plazo de nuevas instalaciones no debería ser mayor al plazo de instalaciones en operación.'
      );
      return;
    }

    this.isSavingRules.set(true);

    this.service.updateRegulatoryRules(dto)
      .pipe(finalize(() => this.isSavingRules.set(false)))
      .subscribe({
        next: result => {
          if (!result.succeed) {
            this.toast.error(
              result.message ??
                'No se pudo guardar la configuración de reglas regulatorias.'
            );
            return;
          }

          this.toast.success('Reglas regulatorias actualizadas.');
          this.lastRulesLoaded.set(dto);
        },
        error: error => {
          const message =
            error?.error?.message ??
            'Error al guardar las reglas regulatorias.';

          this.toast.error(message);
        }
      });
  }

  saveReports(): void {
    if (this.reportsForm.invalid) {
      this.reportsForm.markAllAsTouched();
      this.toast.warning('Revisa los valores de reportes regulatorios.');
      return;
    }

    const raw = this.reportsForm.getRawValue();

    const toRecipients = this.parseRecipients(raw.arcernnrToRecipientsText);
    const ccRecipients = this.parseRecipients(raw.arcernnrCcRecipientsText);

    if (
      (raw.monthlyComplianceReportEnabled ||
        raw.annualComplianceReportEnabled) &&
      toRecipients.length === 0
    ) {
      this.toast.warning(
        'Configura al menos un destinatario principal si el envío automático está activo.'
      );
      return;
    }

    const dto: UpdateRegulatoryReportSettings = {
      monthlyComplianceReportEnabled: raw.monthlyComplianceReportEnabled,
      annualComplianceReportEnabled: raw.annualComplianceReportEnabled,
      arcernnrToRecipients: toRecipients,
      arcernnrCcRecipients: ccRecipients,
      monthlyReportDay: Number(raw.monthlyReportDay),
      monthlyReportHour: this.toBackendTime(raw.monthlyReportHour),
      annualReportMonth: Number(raw.annualReportMonth),
      annualReportDay: Number(raw.annualReportDay),
      annualReportHour: this.toBackendTime(raw.annualReportHour),
      reportFormat: raw.reportFormat
    };

    this.isSavingReports.set(true);

    this.service.updateRegulatoryReports(dto)
      .pipe(finalize(() => this.isSavingReports.set(false)))
      .subscribe({
        next: result => {
          if (!result.succeed) {
            this.toast.error(
              result.message ??
                'No se pudo guardar la configuración de reportes regulatorios.'
            );
            return;
          }

          this.toast.success('Configuración de reportes actualizada.');
          this.lastReportsLoaded.set({
            ...dto,
            monthlyReportHour: dto.monthlyReportHour,
            annualReportHour: dto.annualReportHour
          });
        },
        error: error => {
          const message =
            error?.error?.message ??
            'Error al guardar la configuración de reportes regulatorios.';

          this.toast.error(message);
        }
      });
  }

  resetRules(): void {
    const rules = this.lastRulesLoaded();

    if (!rules) {
      this.patchRules({
        enforceScheduleSubmissionLeadDays: false,
        enforceCertificateDeliveryDays: false,
        scheduleSubmissionLeadDays: 8,
        certificateDeliveryDaysNewInstallation: 4,
        certificateDeliveryDaysInOperation: 10
      });

      return;
    }

    this.patchRules(rules);
  }

  resetReports(): void {
    const reports = this.lastReportsLoaded();

    if (!reports) {
      this.patchReports({
        monthlyComplianceReportEnabled: false,
        annualComplianceReportEnabled: false,
        arcernnrToRecipients: [],
        arcernnrCcRecipients: [],
        monthlyReportDay: 10,
        monthlyReportHour: '09:00:00',
        annualReportMonth: 10,
        annualReportDay: 30,
        annualReportHour: '09:00:00',
        reportFormat: 'excel'
      });

      return;
    }

    this.patchReports(reports);
  }

getControlError(
  formName: 'rules' | 'reports',
  controlName: string
): string | null {
  const control = formName === 'rules'
    ? this.rulesForm.get(controlName)
    : this.reportsForm.get(controlName);

  return this.buildControlError(control);
}

private buildControlError(
  control: AbstractControl | null
): string | null {
  if (!control || !control.touched || !control.errors) {
    return null;
  }

  if (control.errors['required']) {
    return 'Campo requerido';
  }

  if (control.errors['min']) {
    return `Valor mínimo: ${control.errors['min'].min}`;
  }

  if (control.errors['max']) {
    return `Valor máximo: ${control.errors['max'].max}`;
  }

  if (control.errors['maxlength']) {
    return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
  }

  return 'Valor inválido';
}

  private patchRules(settings: RegulatoryRulesSettings): void {
    this.rulesForm.reset({
      enforceScheduleSubmissionLeadDays:
        settings.enforceScheduleSubmissionLeadDays,
      enforceCertificateDeliveryDays:
        settings.enforceCertificateDeliveryDays,
      scheduleSubmissionLeadDays:
        settings.scheduleSubmissionLeadDays,
      certificateDeliveryDaysNewInstallation:
        settings.certificateDeliveryDaysNewInstallation,
      certificateDeliveryDaysInOperation:
        settings.certificateDeliveryDaysInOperation
    });
  }

  private patchReports(settings: RegulatoryReportSettings): void {
    this.reportsForm.reset({
      monthlyComplianceReportEnabled:
        settings.monthlyComplianceReportEnabled,
      annualComplianceReportEnabled:
        settings.annualComplianceReportEnabled,
      arcernnrToRecipientsText:
        (settings.arcernnrToRecipients ?? []).join('\n'),
      arcernnrCcRecipientsText:
        (settings.arcernnrCcRecipients ?? []).join('\n'),
      monthlyReportDay:
        settings.monthlyReportDay,
      monthlyReportHour:
        this.toTimeInput(settings.monthlyReportHour),
      annualReportMonth:
        settings.annualReportMonth,
      annualReportDay:
        settings.annualReportDay,
      annualReportHour:
        this.toTimeInput(settings.annualReportHour),
      reportFormat:
        settings.reportFormat ?? 'excel'
    });
  }

  private parseRecipients(value: string): string[] {
    return value
      .split(/[\n,;]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .filter((item, index, array) =>
        array.findIndex(x => x.toLowerCase() === item.toLowerCase()) === index
      );
  }

  private toTimeInput(value: string | null | undefined): string {
    if (!value) {
      return '09:00';
    }

    const normalized = value.trim();

    if (/^\d{2}:\d{2}$/.test(normalized)) {
      return normalized;
    }

    if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) {
      return normalized.substring(0, 5);
    }

    return '09:00';
  }

  private toBackendTime(value: string): string {
    const normalized = this.toTimeInput(value);

    return `${normalized}:00`;
  }
}