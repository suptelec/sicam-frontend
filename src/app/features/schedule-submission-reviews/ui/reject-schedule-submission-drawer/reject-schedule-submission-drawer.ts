import { Component, EventEmitter, Output, input, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { CalibrationScheduleSubmission } from '../../../my-calibration-items/domain/calibration-schedule-submission.model';

@Component({
  selector: 'app-reject-schedule-submission-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    DrawerActionsComponent
  ],
  templateUrl: './reject-schedule-submission-drawer.html',
  styleUrl: './reject-schedule-submission-drawer.scss'
})
export class RejectScheduleSubmissionDrawerComponent {
  submission = input<CalibrationScheduleSubmission | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<string>();

  private readonly fb = inject(FormBuilder);

  loading = false;

  readonly form = this.fb.group({
    rejectionReason: ['', [Validators.required, Validators.maxLength(1000)]]
  });

  get currentSubmission(): CalibrationScheduleSubmission | null {
    return this.submission();
  }

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid;
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const reason = this.form.controls.rejectionReason.value?.trim();

    if (!reason) {
      this.form.controls.rejectionReason.setErrors({ required: true });
      return;
    }

    this.loading = true;
    this.rejected.emit(reason);
  }

  close(): void {
    if (this.loading) return;

    this.reset();
    this.closed.emit();
  }

  reset(): void {
    this.loading = false;
    this.form.reset({
      rejectionReason: ''
    });
  }
}