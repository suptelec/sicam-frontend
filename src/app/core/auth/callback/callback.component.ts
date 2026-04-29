import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  template: `
    <div style="display:flex; justify-content:center; align-items:center; height:100vh;">
      <p>Autenticando...</p>
    </div>
  `
})
export class CallbackComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    } else {
      this.authService.login();
    }
  }
}