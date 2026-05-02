import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';
import {
  CenaceAnnualPlanValidationIssue,
  CenaceAnnualPlanValidationResponse
} from '../../domain/calibration-plan.model';

@Component({
  selector: 'app-calibration-plan-validation-drawer',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    StatusChipComponent
  ],
  templateUrl: './calibration-plan-validation-drawer.html',
  styleUrl: './calibration-plan-validation-drawer.scss'
})
export class CalibrationPlanValidationDrawerComponent {
  validation = input.required<CenaceAnnualPlanValidationResponse>();

  closed = output<void>();
  exportRequested = output<void>();

  close(): void {
    this.closed.emit();
  }

  export(): void {
    if (!this.validation().canExport) return;

    this.exportRequested.emit();
  }

  get errorIssues(): CenaceAnnualPlanValidationIssue[] {
    return this.validation().issues.filter(issue =>
      this.normalizeSeverity(issue.severity) === 'ERROR'
    );
  }

  get warningIssues(): CenaceAnnualPlanValidationIssue[] {
    return this.validation().issues.filter(issue =>
      this.normalizeSeverity(issue.severity) === 'WARNING'
    );
  }

  get otherIssues(): CenaceAnnualPlanValidationIssue[] {
    return this.validation().issues.filter(issue => {
      const severity = this.normalizeSeverity(issue.severity);

      return severity !== 'ERROR' && severity !== 'WARNING';
    });
  }

  get hasIssues(): boolean {
    return this.validation().issues.length > 0;
  }

  get canExportLabel(): string {
    return this.validation().canExport
      ? 'Exportable'
      : 'No exportable';
  }

  get canExportTone(): 'success' | 'danger' {
    return this.validation().canExport
      ? 'success'
      : 'danger';
  }

  getSeverityLabel(severity: string): string {
    const normalized = this.normalizeSeverity(severity);

    if (normalized === 'ERROR') return 'Error';
    if (normalized === 'WARNING') return 'Advertencia';

    return severity || 'Observación';
  }

  getSeverityIcon(severity: string): string {
    const normalized = this.normalizeSeverity(severity);

    if (normalized === 'ERROR') return 'error';
    if (normalized === 'WARNING') return 'warning';

    return 'info';
  }

  getSeverityClass(severity: string): string {
    const normalized = this.normalizeSeverity(severity);

    if (normalized === 'ERROR') return 'issue-card--error';
    if (normalized === 'WARNING') return 'issue-card--warning';

    return 'issue-card--info';
  }

  private normalizeSeverity(severity: string | null | undefined): string {
    return (severity ?? '').trim().toUpperCase();
  }
}