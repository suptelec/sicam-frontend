import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-drawer-shell',
  standalone: true,
  templateUrl: './drawer-shell.html',
  styleUrl: './drawer-shell.scss'
})
export class DrawerShellComponent {
  open = input<boolean>(false);
  closeOnBackdrop = input<boolean>(true);

  width = input<string>('540px');
  maxWidth = input<string>('100vw');

  closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (!this.closeOnBackdrop()) return;

    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open()) return;

    this.close();
  }
}