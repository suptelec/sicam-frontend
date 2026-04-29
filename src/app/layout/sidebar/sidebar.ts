import { Component, input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/auth/services/auth.service';


export interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  section?: string | null;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  collapsed = input<boolean>(false);
  private authService = inject(AuthService);

  constructor(private sanitizer: DomSanitizer) {}

    get userInitials(): string {
      const name = this.authService.currentUser()?.fullName ?? 'U';
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    get userName(): string {
      return this.authService.currentUser()?.fullName ?? 'Usuario';
    }

    get userEmail(): string {
      return this.authService.currentUser()?.email ?? '';
    }

  items: SidebarItem[] = [
    { label: 'Dashboard',     route: '/dashboard',     icon: 'dashboard',  section: 'Principal'   },
    { label: 'Plan Anual',    route: '/plan',          icon: 'plan',       section: 'Calibración' },
    { label: 'Procesos',      route: '/procesos',      icon: 'clock',      section: null          },
    { label: 'Telemedición',  route: '/telemedicion',  icon: 'signal',     section: null          },
    { label: 'Auditorías',    route: '/auditorias',    icon: 'check',      section: null          },
    { label: 'PMSE',          route: '/pmse',          icon: 'user',       section: 'Gestión'     },
    { label: 'Reportes',      route: '/reportes',      icon: 'list',       section: null          },
    { label: 'Configuración', route: '/configuracion', icon: 'settings',   section: null          },
  ];

  getSection(index: number): string | null {
    if (index === 0) return this.items[0].section ?? null;
    const current = this.items[index].section;
    const prev = this.items[index - 1].section;
    if (current && current !== prev) return current;
    return null;
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
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[name] ?? icons['list']);
  }
}