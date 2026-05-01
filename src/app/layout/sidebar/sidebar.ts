import { Component, input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/auth/services/auth.service';
import { UserPermissions, UserType } from '../../core/models/current-user.model';

export interface SidebarItem {
  label:       string;
  route:       string;
  icon:        string;
  section?:    string | null;
  permission?: keyof UserPermissions;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  collapsed  = input<boolean>(false);
  private authService = inject(AuthService);

  constructor(private sanitizer: DomSanitizer) {}

  get items(): SidebarItem[] {
    const userType    = this.authService.currentUser()?.userType;
    const permissions = this.authService.currentUser()?.permissions;

    let rawItems: SidebarItem[];
    switch (userType) {
      case UserType.CenaceStaff:   rawItems = this.cenaceItems;       break;
      case UserType.PmseAdmin:     rawItems = this.pmseAdminItems;    break;
      case UserType.PmseOperator:  rawItems = this.pmseOperatorItems; break;
      default: return [];
    }

    const filtered = rawItems.filter(item => {
      if (!item.permission) return true;
      const value = permissions?.[item.permission];
      return value !== undefined && value > 0;
    });

    const seenSections = new Set<string>();
    return filtered.map(item => {
      if (!item.section) return item;
      if (seenSections.has(item.section)) return { ...item, section: null };
      seenSections.add(item.section);
      return item;
    });
  }

  private get cenaceItems(): SidebarItem[] {
    return [
      { label: 'Dashboard',     route: '/dashboard',         icon: 'dashboard', section: 'Principal'    },
      { label: 'Plan Anual',    route: '/plan',              icon: 'plan',      section: 'Calibración',  permission: 'calibrationPlan'    },
      { label: 'Procesos',      route: '/procesos',          icon: 'clock',     section: null,           permission: 'calibrationProcess' },
      { label: 'Telemedición',  route: '/telemedicion',      icon: 'signal',    section: null,           permission: 'telemetering'       },
      { label: 'Auditorías',    route: '/auditorias',        icon: 'check',     section: null,           permission: 'audit'              },
      { label: 'Empresas PMSE', route: '/pmse-companies',    icon: 'building',  section: 'Administración',      permission: 'company'            },
      { label: 'Usuarios',      route: '/system-users',      icon: 'user',      section: null,           permission: 'systemUser'         },
      { label: 'Clientes M2M',  route: '/external-clients',  icon: 'api',       section: null            },
      { label: 'Reportes',      route: '/reportes',          icon: 'list',      section: null,           permission: 'report'             },
      { label: 'Configuración', route: '/configuracion',     icon: 'settings',  section: null            },
    ];
  }

  private get pmseAdminItems(): SidebarItem[] {
    return [
      { label: 'Dashboard',   route: '/dashboard',    icon: 'dashboard', section: 'Principal'   },
      { label: 'Plan Anual',  route: '/plan',         icon: 'plan',      section: 'Calibración', permission: 'calibrationPlan'    },
      { label: 'Procesos',    route: '/procesos',     icon: 'clock',     section: null,           permission: 'calibrationProcess' },
      { label: 'Usuarios',    route: '/system-users', icon: 'user',      section: 'Administración',      permission: 'systemUser'         },
      { label: 'Reportes',    route: '/reportes',     icon: 'list',      section: null,           permission: 'report'             },
    ];
  }

  private get pmseOperatorItems(): SidebarItem[] {
    return [
      { label: 'Dashboard',    route: '/dashboard',    icon: 'dashboard', section: 'Principal'   },
      { label: 'Plan Anual',   route: '/plan',         icon: 'plan',      section: 'Calibración', permission: 'calibrationPlan'    },
      { label: 'Procesos',     route: '/procesos',     icon: 'clock',     section: null,           permission: 'calibrationProcess' },
      { label: 'Telemedición', route: '/telemedicion', icon: 'signal',    section: null,           permission: 'telemetering'       },
      { label: 'Reportes',     route: '/reportes',     icon: 'list',      section: null,           permission: 'report'             },
    ];
  }

  getSection(index: number): string | null {
    return this.items[index]?.section ?? null;
  }

  getIcon(name: string): SafeHtml {
    const icons: Record<string, string> = {
      dashboard: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/></svg>`,
      plan:      `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      clock:     `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      signal:    `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 8h2m8 0h2M8 2v2m0 8v2M4.1 4.1l1.4 1.4m4.9 4.9 1.4 1.4M4.1 11.9l1.4-1.4M9.5 6.5l1.4-1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      check:     `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      user:      `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14s1-4 6-4 6 4 6 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      list:      `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      settings:  `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      building:  `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M5 13V8h2v5M9 13V8h2v5M2 6h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      api:       `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M6 8h2m0 0l2-2.5M8 8l2 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[name] ?? icons['list']);
  }

  get userInitials(): string {
    const name = this.authService.currentUser()?.fullName ?? 'U';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  get userName(): string {
    return this.authService.currentUser()?.fullName ?? 'Usuario';
  }

  get userEmail(): string {
    return this.authService.currentUser()?.email ?? '';
  }
}