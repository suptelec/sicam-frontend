import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss'
})
export class EmptyStateComponent {
  icon = input<string>('info');
  title = input.required<string>();
  description = input<string | null>(null);

  actionText = input<string | null>(null);
  actionIcon = input<string>('add');
  showAction = input<boolean>(true);

  actionClicked = output<void>();

  onActionClick(): void {
    this.actionClicked.emit();
  }
}