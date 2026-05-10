import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  forwardRef
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ],
  templateUrl: './searchable-select.html',
  styleUrl: './searchable-select.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ]
})
export class SearchableSelectComponent implements OnInit, OnChanges, OnDestroy, ControlValueAccessor {
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Buscar...';
  @Input() emptyLabel = 'Todas las opciones';
  @Input() noResultsText = 'No se encontraron resultados';
  @Input() prefixIcon = 'search';

  @Input() options: unknown[] = [];
  @Input() displayKey = 'name';
  @Input() valueKey: string | null = 'id';
  @Input() searchKeys: string[] = [];

  @Input() allowEmpty = true;
  @Input() required = false;
  @Input() showLabel = true;
  @Input() compact = false;


  @Output() selectedChange = new EventEmitter<unknown | null>();

  searchControl = new FormControl<unknown>('');

  filteredOptions: unknown[] = [];
  selectedOption: unknown | null = null;

  private value: unknown | null = null;
  private disabled = false;
  private suppressTyping = false;
  private subscription?: Subscription;

  private onChange: (value: unknown | null) => void = () => {};
  protected onTouched: () => void = () => {};

  ngOnInit(): void {
    this.filteredOptions = [...this.options];

    this.subscription = this.searchControl.valueChanges.subscribe(value => {
      this.filteredOptions = this.filterOptions(value);

      if (this.suppressTyping) {
        return;
      }

      if (!this.selectedOption) {
        return;
      }

      const typedText = this.getTextFromControlValue(value);
      const selectedLabel = this.getDisplayValue(this.selectedOption);

      if (typedText !== selectedLabel) {
        this.clearSelectionValueOnly();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.filteredOptions = this.filterOptions(this.searchControl.value);
      this.syncSelectedOptionFromValue();
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  writeValue(value: unknown | null): void {
    this.value = value;
    this.syncSelectedOptionFromValue();
  }

  registerOnChange(fn: (value: unknown | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;

    if (isDisabled) {
      this.searchControl.disable({ emitEvent: false });
    } else {
      this.searchControl.enable({ emitEvent: false });
    }
  }

  get isDisabled(): boolean {
    return this.disabled;
  }

  get showClearButton(): boolean {
    const text = this.getTextFromControlValue(this.searchControl.value);

    return !!text || !!this.selectedOption || this.value !== null;
  }

  displayAutocompleteValue = (value: unknown): string => {
    if (!value) return '';

    if (typeof value === 'string') {
      return value;
    }

    return this.getDisplayValue(value);
  };

  selectOption(option: unknown | null): void {
    if (this.disabled) {
      return;
    }

    if (option === null) {
      this.clear();
      return;
    }

    this.selectedOption = option;
    this.value = this.getOptionValue(option);

    this.suppressTyping = true;
    this.searchControl.setValue(this.getDisplayValue(option), { emitEvent: true });
    this.suppressTyping = false;

    this.onChange(this.value);
    this.onTouched();
    this.selectedChange.emit(option);
  }

  clear(event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.disabled) {
      return;
    }

    this.value = null;
    this.selectedOption = null;

    this.suppressTyping = true;
    this.searchControl.setValue('', { emitEvent: true });
    this.suppressTyping = false;

    this.filteredOptions = [...this.options];

    this.onChange(null);
    this.onTouched();
    this.selectedChange.emit(null);
  }

  onInputFocus(): void {
    this.filteredOptions = this.filterOptions(this.searchControl.value);
  }

  private clearSelectionValueOnly(): void {
    this.value = null;
    this.selectedOption = null;

    this.onChange(null);
    this.selectedChange.emit(null);
  }

  private syncSelectedOptionFromValue(): void {
    const option = this.findOptionByValue(this.value);

    this.selectedOption = option;

    this.suppressTyping = true;
    this.searchControl.setValue(option ? this.getDisplayValue(option) : '', { emitEvent: true });
    this.suppressTyping = false;

    this.filteredOptions = this.filterOptions(this.searchControl.value);
  }

  private findOptionByValue(value: unknown | null): unknown | null {
    if (value === null || value === undefined) {
      return null;
    }

    return this.options.find(option => this.areValuesEqual(this.getOptionValue(option), value)) ?? null;
  }

  private filterOptions(value: unknown): unknown[] {
    const search = this.normalize(this.getTextFromControlValue(value));

    if (!search) {
      return [...this.options];
    }

    const keys = this.searchKeys.length > 0
      ? this.searchKeys
      : [this.displayKey];

    return this.options.filter(option => {
      const searchableText = keys
        .map(key => this.getPropertyValue(option, key))
        .filter(text => text !== null && text !== undefined)
        .map(text => this.normalize(String(text)))
        .join(' ');

      return searchableText.includes(search);
    });
  }

  getOptionValue(option: unknown): unknown {
    if (!this.valueKey) {
      return option;
    }

    return this.getPropertyValue(option, this.valueKey);
  }

  getDisplayValue(option: unknown): string {
    const value = this.getPropertyValue(option, this.displayKey);

    return value === null || value === undefined
      ? ''
      : String(value);
  }

  private getTextFromControlValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object') {
      return this.getDisplayValue(value);
    }

    return '';
  }

  private getPropertyValue(source: unknown, path: string): unknown {
    if (!source || typeof source !== 'object') {
      return null;
    }

    return path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return null;
      }

      return (current as Record<string, unknown>)[key];
    }, source);
  }

  private areValuesEqual(left: unknown, right: unknown): boolean {
    return String(left ?? '') === String(right ?? '');
  }

  private normalize(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}