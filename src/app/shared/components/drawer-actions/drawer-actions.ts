import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-drawer-actions',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './drawer-actions.html',
  styleUrl: './drawer-actions.scss'
})
export class DrawerActionsComponent {
  loading = input<boolean>(false);
  disabled = input<boolean>(false);

  cancelText = input<string>('Cancelar');
  cancelIcon = input<string>('close');

  submitText = input<string>('Guardar');
  submitIcon = input<string>('save');

  submitType = input<'button' | 'submit'>('submit');

  cancelled = output<void>();
  submitted = output<void>();

  onCancel(): void {
    if (this.loading()) return;

    this.cancelled.emit();
  }

  onSubmit(): void {
    if (this.loading() || this.disabled()) return;

    this.submitted.emit();
  }
}