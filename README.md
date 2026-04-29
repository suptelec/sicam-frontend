# Template Frontend Angular — Guía de uso

Template genérico para aplicaciones Angular 21 con autenticación OIDC + PKCE, diseño institucional oscuro y arquitectura DDD.

---

## Stack

| Tecnología | Versión | Propósito |
|---|---|---|
| Angular | 21 | Framework principal |
| Angular Material | 21 | Componentes UI |
| angular-oauth2-oidc | latest | Autenticación OIDC + PKCE |
| @microsoft/signalr | latest | Notificaciones en tiempo real |
| angular-odata | latest | Queries OData al API |
| zone.js | latest | Change detection |

---

## Estructura

```
src/
├── app/
│   ├── core/                          ← singleton, carga una sola vez
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── callback.component.ts   ← procesa redirect OIDC
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts           ← protege rutas autenticadas
│   │   │   │   └── permission.guard.ts     ← protege rutas por permiso
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts     ← inyecta Bearer token en requests
│   │   │   └── services/
│   │   │       └── auth.service.ts         ← maneja OIDC, login, logout, currentUser
│   │   ├── interceptors/
│   │   │   ├── error.interceptor.ts        ← maneja errores HTTP globalmente
│   │   │   └── loading.interceptor.ts      ← activa/desactiva spinner global
│   │   ├── models/
│   │   │   └── current-user.model.ts       ← interfaz del usuario autenticado
│   │   └── services/
│   │       ├── confirm-dialog.service.ts   ← abre modales de confirmación
│   │       ├── loading.service.ts          ← controla el spinner global
│   │       └── toast.service.ts            ← muestra notificaciones
│   ├── layout/                        ← shell de la app
│   │   ├── navbar/                    ← topbar con usuario, breadcrumb, logout
│   │   ├── sidebar/                   ← menú lateral con items configurables
│   │   └── shell/                     ← contenedor principal post-login
│   ├── shared/                        ← reutilizable sin lógica de negocio
│   │   ├── components/
│   │   │   ├── confirm-dialog/        ← modal de confirmación (danger/warning/info)
│   │   │   ├── spinner/               ← overlay de carga global
│   │   │   └── toast/                 ← notificaciones top-right
│   │   ├── directives/
│   │   │   └── has-permission.directive.ts ← oculta elementos sin permiso
│   │   └── models/
│   │       ├── api-response.model.ts  ← ResultDto, PaginatedResultDto, AppMessageType
│   │       ├── date-range.model.ts    ← DateRangeRequest
│   │       └── pagination.model.ts    ← PaginationRequest
│   ├── features/                      ← TODO: dominios del proyecto
│   ├── app.config.ts                  ← providers globales
│   ├── app.routes.ts                  ← routing principal
│   └── app.ts                         ← componente raíz
├── environments/
│   ├── environment.ts                 ← desarrollo
│   └── environment.production.ts     ← producción
└── styles/
    ├── _variables.scss                ← design tokens CSS
    └── styles.scss                    ← estilos globales + Material overrides
```

---

## Configuración inicial

### 1. Variables de entorno

Actualiza `src/environments/environment.ts` con los valores del proyecto:

```typescript
export const environment = {
  production: false,
  apiUrl: '/api',
  identityUrl: '/identity',
  oidc: {
    issuer: 'https://localhost:{IDENTITY_PORT}/',
    redirectUri: 'http://localhost:4200/auth/callback',
    postLogoutRedirectUri: 'http://localhost:4200/auth/logout',
    clientId: '{CLIENT_ID}',
    scope: 'openid profile {API_SCOPE}',
    requireHttps: false
  }
};
```

### 2. Proxy

Actualiza `proxy.conf.json` con los puertos del proyecto:

```json
{
  "/identity": {
    "target": "https://localhost:{IDENTITY_PORT}",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": { "^/identity": "" }
  },
  "/api": {
    "target": "https://localhost:{API_PORT}",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": { "^/api": "" }
  }
}
```

### 3. Design tokens

Personaliza los colores en `src/styles/_variables.scss`:

```scss
:root {
  --color-primary:        #1a6eb5;  ← color principal
  --color-primary-dark:   #002855;  ← fondo del sidebar
  --bg-base:              #0d1117;  ← fondo general
  --bg-surface:           #111827;  ← fondo del sidebar/topbar
  // ...resto de variables
}
```

---

## Correr el proyecto

```bash
ng serve --proxy-config proxy.conf.json
```

---

## Autenticación OIDC + PKCE

El template usa `angular-oauth2-oidc` con Authorization Code Flow + PKCE. El flujo completo es:

```
1. Usuario accede a cualquier ruta protegida
2. AuthGuard detecta que no hay token → llama authService.login()
3. Angular redirige al Identity Server (login page)
4. Usuario se autentica con usuario/contraseña
5. Identity redirige a /auth/callback con el code
6. CallbackComponent detecta que está autenticado → navega a /
7. ShellComponent carga con el usuario autenticado
```

### Leer el usuario autenticado

```typescript
import { AuthService } from './core/auth/services/auth.service';
import { inject } from '@angular/core';

const authService = inject(AuthService);

// Signal reactivo
authService.currentUser() // → CurrentUser | null
authService.isAuthenticated() // → boolean
authService.getAccessToken() // → string
```

### Agregar propiedades al CurrentUser

Edita `src/app/core/models/current-user.model.ts`:

```typescript
export interface CurrentUser {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  // Agregar propiedades del proyecto:
  // companyId?: string;
  // roles?: string[];
  // permissions?: string[];
}
```

Y en `auth.service.ts` mapea los claims del token:

```typescript
 private loadCurrentUser(): void {
    const claims = this.oauthService.getIdentityClaims() as any;
    
    // Intentar leer del access token si id_token no tiene los claims
    const accessToken = this.oauthService.getAccessToken();
    let tokenClaims: any = claims;
    
    if (accessToken && !claims?.['name']) {
      try {
        const payload = accessToken.split('.')[1];
        tokenClaims = JSON.parse(atob(payload));
      } catch (e) {
        tokenClaims = claims;
      }
    }

    if (!tokenClaims) return;

   this._currentUser.set({
      id:       tokenClaims[AuthClaims.sub],
      userName: tokenClaims[AuthClaims.sub],
      email:    tokenClaims[AuthClaims.email] ?? tokenClaims['email'],
      fullName: tokenClaims[AuthClaims.name] ?? tokenClaims[AuthClaims.sub],
    });
  }
```

---

## Sidebar — configurar items por rol

En `sidebar.ts` reemplaza el array `items` con los del proyecto:

```typescript
items: SidebarItem[] = [
  { label: 'Dashboard',  route: '/dashboard',  icon: 'dashboard', section: 'Principal' },
  { label: 'Mi módulo',  route: '/modulo',     icon: 'list',      section: 'Gestión'  },
];
```

Para items dinámicos por rol:

```typescript
get items(): SidebarItem[] {
  const user = this.authService.currentUser();
  if (!user) return [];

  // CENACE ve todo, PMSE ve solo sus módulos
  if (user.role === 'CENACE') return this.cenaceItems;
  return this.pmseItems;
}
```

Los iconos disponibles: `dashboard`, `plan`, `clock`, `signal`, `check`, `user`, `list`, `settings`. Para agregar nuevos, añade el SVG en `getIcon()`.

---

## Agregar una feature (dominio)

Cada feature sigue la estructura DDD:

```
features/
└── calibration/
    ├── domain/
    │   ├── calibration.model.ts     ← interfaces del dominio
    │   └── calibration.enum.ts      ← enums del dominio
    ├── data-access/
    │   └── calibration.service.ts   ← llamadas HTTP al API
    ├── ui/                          ← dumb components (@Input/@Output)
    │   ├── calibration-table/
    │   └── calibration-form/
    ├── pages/                       ← smart components (orquestan todo)
    │   ├── calibration-list/
    │   └── calibration-detail/
    └── calibration.routes.ts
```

Registra la ruta en `app.routes.ts`:

```typescript
{
  path: 'calibration',
  loadChildren: () =>
    import('./features/calibration/calibration.routes')
      .then(m => m.CALIBRATION_ROUTES)
}
```

---

## Servicios globales

### ToastService

```typescript
const toast = inject(ToastService);

toast.success('Operación completada');
toast.error('Error al guardar');
toast.warning('Certificado por vencer');
toast.info('Nueva actualización disponible');
toast.success('Mensaje personalizado', 6000); // duración en ms
```

### ConfirmDialogService

```typescript
const confirm = inject(ConfirmDialogService);

// Eliminar
confirm.delete('¿Eliminar proceso?', 'Esta acción no se puede deshacer.')
  .subscribe(result => {
    if (result) { /* proceder con eliminación */ }
  });

// Personalizado
confirm.confirm({
  title: '¿Confirmar cambio?',
  message: 'Se modificará el estado del medidor.',
  confirmText: 'Sí, cambiar',
  cancelText: 'No',
  type: 'warning'
}).subscribe(result => { ... });
```

### LoadingService

```typescript
const loading = inject(LoadingService);

// Manual
loading.show();
loading.hide();

// Automático — cualquier request HTTP activa el spinner
// Para saltar el spinner en un request específico:
this.http.get('/api/data', {
  headers: { 'X-Skip-Spinner': 'true' }
});
```

### HasPermissionDirective

```html
<!-- Muestra solo si tiene el permiso -->
<button *hasPermission="'calibration.delete'">Eliminar</button>

<!-- Múltiples permisos -->
<div *hasPermission="['calibration.read', 'calibration.write']">
  Contenido protegido
</div>
```

> **TODO:** Implementar la lógica real de permisos en `has-permission.directive.ts` según los claims del token del proyecto.

---

## Modelos compartidos

### ResultDto — respuesta del API

```typescript
import { ResultDto, PaginatedResultDto, AppMessageType } from '../shared/models/api-response.model';

// En un data-access service:
getCalibrations(): Observable<PaginatedResultDto<CalibrationDto>> {
  return this.http.get<PaginatedResultDto<CalibrationDto>>('/api/calibrations');
}

// En un componente:
this.calibrationService.getCalibrations().subscribe(result => {
  if (result.succeed) {
    this.items = result.data ?? [];
  } else {
    this.toast.error(result.message ?? 'Error al cargar');
  }
});
```

---

## TODOs al usar este template

- [ ] Actualizar `environment.ts` con URLs del proyecto
- [ ] Actualizar `proxy.conf.json` con puertos del proyecto
- [ ] Personalizar colores en `_variables.scss`
- [ ] Agregar propiedades del proyecto en `CurrentUser`
- [ ] Mapear claims del token en `auth.service.ts`
- [ ] Implementar lógica de permisos en `has-permission.directive.ts`
- [ ] Configurar items del sidebar por rol en `sidebar.ts`
- [ ] Agregar features del proyecto en `features/`
- [ ] Registrar rutas en `app.routes.ts`