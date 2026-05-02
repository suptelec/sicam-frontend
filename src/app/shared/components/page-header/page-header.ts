import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss'
})
export class PageHeaderComponent {
  eyebrow = input<string>('Administración');
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