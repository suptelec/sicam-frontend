import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-search-toolbar',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './search-toolbar.html',
  styleUrl: './search-toolbar.scss'
})
export class SearchToolbarComponent {
  value = input<string>('');
  placeholder = input<string>('Buscar...');
  loading = input<boolean>(false);

  showRefresh = input<boolean>(true);
  refreshText = input<string>('Actualizar');

  valueChange = output<string>();
  search = output<string>();
  refresh = output<void>();
  cleared = output<void>();

  onValueChange(value: string): void {
    this.valueChange.emit(value);
  }

  onSearch(): void {
    this.search.emit(this.value().trim());
  }

  onClear(): void {
    this.valueChange.emit('');
    this.cleared.emit();
    this.search.emit('');
  }

  onRefresh(): void {
    this.refresh.emit();
  }
}