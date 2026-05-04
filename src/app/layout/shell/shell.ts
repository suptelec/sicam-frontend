import { Component, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterOutlet
} from '@angular/router';
import { filter } from 'rxjs';

import { NavbarComponent } from '../navbar/navbar';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss'
})
export class ShellComponent {
  private readonly router = inject(Router);

  sidebarCollapsed = signal(false);
  pageTitle = signal('Dashboard');

  constructor() {
    this.updatePageTitle(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.updatePageTitle(event.urlAfterRedirects);
      });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(value => !value);
  }

  private updatePageTitle(url: string): void {
    const path = url
      .split('?')[0]
      .split('#')[0]
      .replace(/^\/+/, '');

    const firstSegment = path.split('/')[0] || 'dashboard';

    const titles: Record<string, string> = {
      dashboard: 'Dashboard',

      'calibration-plans': 'Plan Anual',
      'my-calibration-items': 'Mis procesos',
      'my-date-change-requests': 'Cambios de rango',
      'my-schedule-submissions': 'Mis cronogramas',
      'schedule-submission-reviews': 'Cronogramas recibidos',
      'work-authorization-reviews': 'Autorizaciones recibidas',
      'my-calibration-processes': 'Mis procesos de calibración',
      'calibration-process-reviews': 'Procesos en revisión',

      'pmse-companies': 'Empresas PMSE',
      'external-clients': 'Clientes M2M',
      'accredited-laboratories': 'Laboratorios',
      'pmse-laboratories': 'Mis laboratorios',
      meters: 'Medidores',
      'meter-calibration-certificates': 'Certificados',
      'system-users': 'Usuarios',

      telemedicion: 'Telemedición',
      auditorias: 'Auditorías',
      reportes: 'Reportes',
      configuracion: 'Configuración',
      procesos: 'Procesos',
      forbidden: 'Acceso denegado'
    };

    this.pageTitle.set(titles[firstSegment] ?? 'SICAM');
  }
}