export enum PmseType {
  Generadora       = 1,
  Autogeneradora   = 2,
  Transmisora      = 3,
  Distribuidora    = 4,
  Comercializadora = 5,
  GranConsumidor   = 6
}

export enum EcuadorRegion {
  Costa   = 1,
  Sierra  = 2,
  Oriente = 3,
  Insular = 4
}

export enum EntityStatus {
  Active   = 1,
  Inactive = 2
}

export const PmseTypeLabels: Record<PmseType, string> = {
  [PmseType.Generadora]:       'Generadora',
  [PmseType.Autogeneradora]:   'Autogeneradora',
  [PmseType.Transmisora]:      'Transmisora',
  [PmseType.Distribuidora]:    'Distribuidora',
  [PmseType.Comercializadora]: 'Comercializadora',
  [PmseType.GranConsumidor]:   'Gran Consumidor'
};

export const EcuadorRegionLabels: Record<EcuadorRegion, string> = {
  [EcuadorRegion.Costa]:   'Costa',
  [EcuadorRegion.Sierra]:  'Sierra',
  [EcuadorRegion.Oriente]: 'Oriente',
  [EcuadorRegion.Insular]: 'Insular'
};