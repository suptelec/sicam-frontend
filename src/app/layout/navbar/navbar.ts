import { Component, output } from '@angular/core';
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {
  toggleSidebar = output<void>();

  constructor(public authService: AuthService) {}

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  logout() {
    this.authService.logout();
  }
}