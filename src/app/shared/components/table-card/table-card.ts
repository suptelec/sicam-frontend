import { Component, input, output } from '@angular/core';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmptyStateComponent } from '../empty-state/empty-state';

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    EmptyStateComponent
  ],
  templateUrl: './table-card.html',
  styleUrl: './table-card.scss'
})
export class TableCardComponent {
  loading = input<boolean>(false);
  empty = input<boolean>(false);

  loadingText = input<string>('Cargando información...');

  emptyIcon = input<string>('info');
  emptyTitle = input<string>('No hay registros');
  emptyDescription = input<string | null>(null);
  emptyActionText = input<string | null>(null);
  emptyActionIcon = input<string>('add');
  showEmptyAction = input<boolean>(true);

  emptyActionClicked = output<void>();

  onEmptyActionClick(): void {
    this.emptyActionClicked.emit();
  }
}