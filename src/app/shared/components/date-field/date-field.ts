import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';

import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DATE_LOCALE,
  provideNativeDateAdapter
} from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule
  ],
  templateUrl: './date-field.html',
  styleUrl: './date-field.scss',
  providers: [
    provideNativeDateAdapter(),
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-EC'
    },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true
    }
  ]
})
export class DateFieldComponent implements ControlValueAccessor {
  @Input() label = 'Fecha';
  @Input() requiredMessage = 'La fecha es obligatoria.';
  @Input() hint: string | null = null;
  @Input() readonly = true;
  @Input() min: string | Date | null = null;
  @Input() max: string | Date | null = null;
  @Input() withTime = false;
  @Input() minuteStep = 1;

  @Output() valueChanged = new EventEmitter<string | null>();

  value: Date | null = null;
  disabled = false;

  get minDate(): Date | null {
    return this.parseDate(this.min);
  }

  get maxDate(): Date | null {
    return this.parseDate(this.max);
  }

  get timeValue(): string {
    if (!this.value || Number.isNaN(this.value.getTime())) {
      return '';
    }

    return `${this.formatNumber(this.value.getHours())}:${this.formatNumber(this.value.getMinutes())}`;
  }

  get timeStepInSeconds(): number {
    const safeStep = this.minuteStep > 0 && this.minuteStep <= 60
      ? this.minuteStep
      : 1;

    return safeStep * 60;
  }

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | Date | null | undefined): void {
    this.value = this.parseDate(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onDateChange(value: Date | null): void {
    if (!value) {
      this.updateValue(null);
      return;
    }

    const nextValue = new Date(value);

    if (this.withTime && this.value) {
      nextValue.setHours(this.value.getHours(), this.value.getMinutes(), 0, 0);
    } else {
      nextValue.setHours(0, 0, 0, 0);
    }

    this.updateValue(nextValue);
  }

  onTimeInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawTime = input.value;

    if (!rawTime || !this.value) return;

    const [hourValue, minuteValue] = rawTime.split(':');
    const hour = Number(hourValue);
    const minute = Number(minuteValue);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return;
    }

    const nextValue = new Date(this.value);
    nextValue.setHours(hour, minute, 0, 0);

    this.updateValue(nextValue);
  }

  markAsTouched(): void {
    this.onTouched();
  }

  formatNumber(value: number): string {
    return `${value}`.padStart(2, '0');
  }

  private updateValue(value: Date | null): void {
    this.value = value;

    const formattedValue = this.formatDate(value);

    this.onChange(formattedValue);
    this.onTouched();
    this.valueChanged.emit(formattedValue);
  }

  private parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/
    );

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4] ?? 0);
    const minute = Number(match[5] ?? 0);

    if (!year || !month || !day) return null;

    const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDate(value: Date | null): string | null {
    if (!value || Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getFullYear();
    const month = this.formatNumber(value.getMonth() + 1);
    const day = this.formatNumber(value.getDate());

    const datePart = `${year}-${month}-${day}`;

    if (!this.withTime) {
      return datePart;
    }

    const hour = this.formatNumber(value.getHours());
    const minute = this.formatNumber(value.getMinutes());

    return `${datePart}T${hour}:${minute}`;
  }
}