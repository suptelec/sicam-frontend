import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type StatusChipTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './status-chip.html',
  styleUrl: './status-chip.scss'
})
export class StatusChipComponent {
  label = input.required<string>();
  tone = input<StatusChipTone>('neutral');
  icon = input<string | null>(null);
  compact = input<boolean>(false);
}