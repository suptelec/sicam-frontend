export enum PermissionValue {
  None   = 0,
  Read   = 1,
  Write  = 2,
  Delete = 4,
  All    = 7
}

export const PermissionLabels: Record<PermissionValue, string> = {
  [PermissionValue.None]:   'Sin acceso',
  [PermissionValue.Read]:   'Solo lectura',
  [PermissionValue.Write]:  'Lectura y escritura',
  [PermissionValue.Delete]: 'Lectura, escritura y eliminación',
  [PermissionValue.All]:    'Acceso completo'
};