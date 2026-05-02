import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { UserType } from '../../../../core/models/current-user.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip';

interface DashboardCard {
  title: string;
  value: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    MatIconModule,
    PageHeaderComponent,
    StatusChipComponent
  ],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss'
})
export class DashboardHomeComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.currentUser;

  readonly cards: DashboardCard[] = [
    {
      title: 'Planes de calibración',
      value: '—',
      description: 'Planes anuales creados o publicados.',
      icon: 'event_note'
    },
    {
      title: 'Ítems pendientes',
      value: '—',
      description: 'Medidores pendientes de coordinación.',
      icon: 'pending_actions'
    },
    {
      title: 'En revisión',
      value: '—',
      description: 'Procesos enviados para revisión CENACE.',
      icon: 'fact_check'
    },
    {
      title: 'Aprobados',
      value: '—',
      description: 'Calibraciones aprobadas en el periodo.',
      icon: 'verified'
    }
  ];

  get roleLabel(): string {
    const userType = this.user()?.userType;

    switch (userType) {
      case UserType.CenaceStaff:
        return 'CENACE';

      case UserType.PmseAdmin:
        return 'Administrador PMSE';

      case UserType.PmseOperator:
        return 'Operador PMSE';

      case UserType.App:
        return 'Aplicación M2M';

      default:
        return 'Usuario';
    }
  }

  get welcomeDescription(): string {
    const userType = this.user()?.userType;

    if (userType === UserType.CenaceStaff) {
      return 'Panel inicial para la gestión del plan anual, revisión de cronogramas, autorizaciones y calibraciones.';
    }

    if (userType === UserType.PmseAdmin || userType === UserType.PmseOperator) {
      return 'Panel inicial para consultar tu planificación, cronogramas, autorizaciones y procesos de calibración.';
    }

    return 'Panel inicial de SICAM.';
  }
}