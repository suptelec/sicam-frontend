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
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule
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

  @Output() valueChanged = new EventEmitter<string | null>();

  value: Date | null = null;
  disabled = false;

  get minDate(): Date | null {
  return this.parseDate(this.min);
}

get maxDate(): Date | null {
  return this.parseDate(this.max);
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
  this.value = value;

  const formattedValue = this.formatDate(value);

  this.onChange(formattedValue);
  this.onTouched();
  this.valueChanged.emit(formattedValue);
}

  markAsTouched(): void {
    this.onTouched();
  }

  private parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const parts = value.split('-');

    if (parts.length !== 3) return null;

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
  }

  private formatDate(value: Date | null): string | null {
    if (!value || Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}