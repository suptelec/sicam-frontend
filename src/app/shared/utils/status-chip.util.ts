import { StatusChipTone } from '../components/status-chip/status-chip';

export interface StatusChipViewModel {
  label: string;
  tone: StatusChipTone;
  icon?: string;
}

export function getEntityStatusChip(status: number): StatusChipViewModel {
  switch (status) {
    case 1:
      return {
        label: 'Activo',
        tone: 'success',
        icon: 'check_circle'
      };

    case 2:
      return {
        label: 'Inactivo',
        tone: 'danger',
        icon: 'block'
      };

    default:
      return {
        label: 'Desconocido',
        tone: 'neutral',
        icon: 'help'
      };
  }
}