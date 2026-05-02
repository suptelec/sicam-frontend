import { UserType } from '../../../core/models/current-user.model';
import { StatusChipViewModel } from '../../../shared/utils/status-chip.util';

export function getUserTypeChip(type: UserType): StatusChipViewModel {
  switch (type) {
    case UserType.CenaceStaff:
      return {
        label: 'CENACE',
        tone: 'primary',
        icon: 'admin_panel_settings'
      };

    case UserType.PmseAdmin:
      return {
        label: 'Admin PMSE',
        tone: 'info',
        icon: 'business_center'
      };

    case UserType.PmseOperator:
      return {
        label: 'Operador PMSE',
        tone: 'warning',
        icon: 'engineering'
      };

    case UserType.App:
      return {
        label: 'Aplicación',
        tone: 'neutral',
        icon: 'api'
      };

    default:
      return {
        label: 'Desconocido',
        tone: 'neutral',
        icon: 'help'
      };
  }
}