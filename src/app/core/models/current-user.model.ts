export interface CurrentUser {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  // TODO: agregar propiedades específicas del proyecto
  // ejemplo: companyId, roles, permissions
}