import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import mapboxgl from 'mapbox-gl';
import { Subscription } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { UserScopeService } from '../../../../core/auth/services/user-scope.service';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select';

import { MetersService } from '../../../meters/data-access/meters.service';
import { EntityStatus, Meter } from '../../../meters/domain/meter.model';

import { CalibrationPlansService } from '../../../calibration-plans/data-access/calibration-plans.service';
import { CalibrationPlanItemsService } from '../../../calibration-plans/data-access/calibration-plan-items.service';
import {
  CalibrationPlanItem,
  CalibrationPlanItemStatus
} from '../../../calibration-plans/domain/calibration-plan.model';

type MeterMapTone =
  | 'expired'
  | 'soon'
  | 'valid'
  | 'no-date'
  | 'inactive';

type PopupPlacement = 'top' | 'bottom';

interface MeterSearchOption {
  id: number;
  displayName: string;
  meter: Meter;
}

interface MeterMapMarkerRef {
  coordinates: [number, number];
  meters: Meter[];
  groupKey: string;
}

interface MeterMapPopup {
  left: number;
  top: number;
  placement: PopupPlacement;
  coordinates: [number, number];
  meters: Meter[];
}

interface MeterSummary {
  total: number;
  withCoordinates: number;
  withoutCoordinates: number;
  expired: number;
  soon: number;
  valid: number;
  noDate: number;
  inactive: number;
}

interface CompanyComplianceSummary {
  totalItems: number;
  eligibleItems: number;
  completedItems: number;
  notCompletedItems: number;
  futurePendingItems: number;
  completionRate: number;
}

interface PmseMapSummary extends MeterSummary, CompanyComplianceSummary {
  pmseCompanyId: number;
  pmseCompanyName: string;
}

@Component({
  selector: 'app-meter-map-card',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SearchableSelectComponent
  ],
  templateUrl: './meter-map-card.html',
  styleUrl: './meter-map-card.scss'
})
export class MeterMapCardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  private readonly metersService = inject(MetersService);
  private readonly plansService = inject(CalibrationPlansService);
  private readonly planItemsService = inject(CalibrationPlanItemsService);
  private readonly userScope = inject(UserScopeService);

  private readonly sourceId = 'sicam-meter-map-source';
  private readonly clusterLayerId = 'sicam-meter-map-clusters';
  private readonly clusterCountLayerId = 'sicam-meter-map-cluster-count';
  private readonly pointLayerId = 'sicam-meter-map-points';

  private map?: mapboxgl.Map;

  private metersSubscription?: Subscription;
  private plansSubscription?: Subscription;
  private planItemsSubscription?: Subscription;
  private meterFilterSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;

  private mapLayerEventsRegistered = false;

  private readonly meterGroupsByKey = new Map<string, Meter[]>();
  private readonly markersByMeterCode = new Map<string, MeterMapMarkerRef>();

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly allMeters = signal<Meter[]>([]);
  readonly complianceItems = signal<CalibrationPlanItem[]>([]);

  readonly selectedPmseCompanyId = signal<number | null>(null);
  readonly selectedMeterId = signal<number | null>(null);
  readonly selectedPopup = signal<MeterMapPopup | null>(null);

  readonly companyPanelSearch = signal('');
  readonly meterPanelSearch = signal('');

  readonly selectedMeterControl = new FormControl<number | null>(null);

  readonly isPmseUser = this.userScope.isPmseUser;
  readonly isCenaceUser = this.userScope.isCenaceUser;
  readonly pmseCompanyName = this.userScope.pmseCompanyName;

  readonly visibleMeters = computed(() => {
    const selectedCompanyId = this.selectedPmseCompanyId();

    if (this.isCenaceUser() && selectedCompanyId) {
      return this.allMeters().filter(meter => Number(meter.pmseCompanyId) === selectedCompanyId);
    }

    return this.allMeters();
  });

  readonly metersWithCoordinates = computed(() =>
    this.visibleMeters().filter(meter => this.hasValidCoordinates(meter))
  );

  readonly metersWithoutCoordinates = computed(() =>
    this.visibleMeters().filter(meter => !this.hasValidCoordinates(meter))
  );

  readonly selectedPmseCompanyName = computed(() => {
    const selectedId = this.selectedPmseCompanyId();

    if (!selectedId) {
      return null;
    }

    return this.companySummaries()
      .find(company => company.pmseCompanyId === selectedId)
      ?.pmseCompanyName ?? null;
  });

  readonly globalSummary = computed<MeterSummary>(() => {
    return this.buildMeterSummary(this.allMeters());
  });

  readonly visibleSummary = computed<MeterSummary>(() => {
    return this.buildMeterSummary(this.visibleMeters());
  });

  readonly globalComplianceSummary = computed<CompanyComplianceSummary>(() => {
    return this.buildComplianceSummary(this.complianceItems());
  });

  readonly companySummaries = computed<PmseMapSummary[]>(() => {
    const meterGroups = new Map<number, Meter[]>();
    const itemGroups = new Map<number, CalibrationPlanItem[]>();

    for (const meter of this.allMeters()) {
      const pmseCompanyId = Number(meter.pmseCompanyId);

      if (!Number.isFinite(pmseCompanyId) || pmseCompanyId <= 0) {
        continue;
      }

      if (!meterGroups.has(pmseCompanyId)) {
        meterGroups.set(pmseCompanyId, []);
      }

      meterGroups.get(pmseCompanyId)!.push(meter);
    }

    for (const item of this.complianceItems()) {
      const pmseCompanyId = Number(item.pmseCompanyId);

      if (!Number.isFinite(pmseCompanyId) || pmseCompanyId <= 0) {
        continue;
      }

      if (!itemGroups.has(pmseCompanyId)) {
        itemGroups.set(pmseCompanyId, []);
      }

      itemGroups.get(pmseCompanyId)!.push(item);
    }

    const companyIds = new Set<number>([
      ...meterGroups.keys(),
      ...itemGroups.keys()
    ]);

    return [...companyIds]
      .map(pmseCompanyId => {
        const meters = meterGroups.get(pmseCompanyId) ?? [];
        const items = itemGroups.get(pmseCompanyId) ?? [];

        return {
          pmseCompanyId,
          pmseCompanyName:
            meters[0]?.pmseCompanyName?.trim() ||
            items[0]?.pmseCompanyName?.trim() ||
            'PMSE sin nombre',
          ...this.buildMeterSummary(meters),
          ...this.buildComplianceSummary(items)
        };
      })
      .sort((a, b) => {
        if (b.notCompletedItems !== a.notCompletedItems) {
          return b.notCompletedItems - a.notCompletedItems;
        }

        if (b.futurePendingItems !== a.futurePendingItems) {
          return b.futurePendingItems - a.futurePendingItems;
        }

        return a.pmseCompanyName.localeCompare(b.pmseCompanyName);
      });
  });

  readonly filteredCompanySummaries = computed(() => {
    const term = this.companyPanelSearch().trim().toLowerCase();

    if (!term) {
      return this.companySummaries();
    }

    return this.companySummaries().filter(company =>
      company.pmseCompanyName.toLowerCase().includes(term)
    );
  });

  readonly meterSearchOptions = computed<MeterSearchOption[]>(() =>
    this.metersWithCoordinates().map(meter => ({
      id: meter.id,
      displayName: this.buildMeterDisplayName(meter),
      meter
    }))
  );

  readonly sidePanelMeters = computed(() => {
    const term = this.meterPanelSearch().trim().toLowerCase();

    const meters = [...this.visibleMeters()].sort((a, b) => {
      const toneA = this.getTonePriority(this.getMeterTone(a));
      const toneB = this.getTonePriority(this.getMeterTone(b));

      if (toneA !== toneB) {
        return toneA - toneB;
      }

      return a.code.localeCompare(b.code);
    });

    if (!term) {
      return meters;
    }

    return meters.filter(meter => {
      const searchable = [
        meter.code,
        meter.serial,
        meter.pmseCompanyName,
        meter.province,
        meter.sector
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  });

  ngOnInit(): void {
    this.meterFilterSubscription = this.selectedMeterControl.valueChanges
      .subscribe(value => {
        this.onMeterSelected(value);
      });
  }

  ngAfterViewInit(): void {
    if (!environment.mapboxToken || environment.mapboxToken.includes('REEMPLAZA')) {
      this.errorMessage.set('Configura el token público de Mapbox para visualizar el mapa.');
      return;
    }

    mapboxgl.accessToken = environment.mapboxToken;

    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-78.1834, -1.8312],
      zoom: 6.4
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    this.observeMapContainerResize();

    this.map.on('load', () => {
      this.map?.resize();
      this.ensureMapSourceAndLayers(this.createFeatureCollection([]));
      this.registerMapLayerEvents();
      this.loadMeters();
      this.loadComplianceItems();
    });

    this.map.on('move', () => this.repositionPopup());
    this.map.on('zoom', () => this.repositionPopup());
    this.map.on('dragstart', () => this.closePopup());
  }

  ngOnDestroy(): void {
    this.metersSubscription?.unsubscribe();
    this.plansSubscription?.unsubscribe();
    this.planItemsSubscription?.unsubscribe();
    this.meterFilterSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();

    this.clearSource();

    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  refresh(): void {
    this.loadMeters();
    this.loadComplianceItems();
  }

  onCompanyPanelSearch(value: string): void {
    this.companyPanelSearch.set(value);
  }

  onMeterPanelSearch(value: string): void {
    this.meterPanelSearch.set(value);
  }

  selectAllCompanies(): void {
    this.selectedPmseCompanyId.set(null);
    this.selectedMeterId.set(null);
    this.selectedMeterControl.setValue(null, { emitEvent: false });
    this.closePopup();
    this.renderVisibleMeters();
  }

  clearCompanyFilter(): void {
  this.selectAllCompanies();
}

  selectCompanyFromPanel(company: PmseMapSummary): void {
    this.selectedPmseCompanyId.set(company.pmseCompanyId);
    this.selectedMeterId.set(null);
    this.selectedMeterControl.setValue(null, { emitEvent: false });
    this.closePopup();
    this.renderVisibleMeters();
  }

  selectMeterFromPanel(meter: Meter): void {
    if (!this.hasValidCoordinates(meter)) {
      return;
    }

    this.selectedMeterId.set(meter.id);
    this.selectedMeterControl.setValue(meter.id, { emitEvent: false });
    this.focusMeter(meter, true);
  }

  onMeterSelected(value: unknown | null): void {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    const selected = this.meterSearchOptions().find(option => option.id === parsed);

    if (!selected) {
      return;
    }

    this.selectedMeterId.set(selected.meter.id);
    this.focusMeter(selected.meter, false);
  }

  clearMeterFilter(): void {
    this.selectedMeterControl.setValue(null);
    this.selectedMeterId.set(null);
    this.closePopup();
  }

  focusMeter(meter: Meter, openPopup = false): void {
    const markerRef = this.markersByMeterCode.get(meter.code);

    if (!markerRef || !this.map || !this.hasValidCoordinates(meter)) {
      return;
    }

    this.map.flyTo({
      center: markerRef.coordinates,
      zoom: 15,
      speed: 2,
      curve: 1.35,
      essential: true
    });

    if (openPopup) {
      this.openOverlayPopup(markerRef.coordinates, markerRef.meters);
    }
  }

  closePopup(): void {
    this.selectedPopup.set(null);
  }

  canFocusMeter(meter: Meter): boolean {
    return this.hasValidCoordinates(meter);
  }

  isCompanySelected(company: PmseMapSummary): boolean {
    return this.selectedPmseCompanyId() === company.pmseCompanyId;
  }

  isMeterSelected(meter: Meter): boolean {
    return this.selectedMeterId() === meter.id;
  }

  formatDateForView(value?: string | null): string {
    return this.formatDate(value);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  getScopeText(): string {
    if (this.isPmseUser()) {
      return `Mostrando medidores de ${this.pmseCompanyName() ?? 'tu empresa PMSE'}.`;
    }

    if (this.isCenaceUser()) {
      const selectedName = this.selectedPmseCompanyName();

      if (selectedName) {
        return `Mostrando medidores de la empresa PMSE ${selectedName}.`;
      }

      return 'Mostrando medidores registrados por todas las empresas PMSE.';
    }

    return 'Mostrando medidores disponibles según tu perfil.';
  }

  getMeterTone(meter: Meter): MeterMapTone {
    if (meter.status !== EntityStatus.Active) {
      return 'inactive';
    }

    if (!meter.nextCalibrationDate) {
      return 'no-date';
    }

    const today = this.startOfDay(new Date());
    const nextCalibrationDate = this.startOfDay(new Date(meter.nextCalibrationDate));

    if (Number.isNaN(nextCalibrationDate.getTime())) {
      return 'no-date';
    }

    if (nextCalibrationDate < today) {
      return 'expired';
    }

    const limit = new Date(today);
    limit.setDate(limit.getDate() + 90);

    if (nextCalibrationDate <= limit) {
      return 'soon';
    }

    return 'valid';
  }

  getToneLabel(tone: MeterMapTone): string {
    switch (tone) {
      case 'expired':
        return 'Vencido';

      case 'soon':
        return 'Por vencer';

      case 'valid':
        return 'Vigente';

      case 'no-date':
        return 'Sin fecha';

      case 'inactive':
        return 'Inactivo';
    }
  }

  getToneIcon(tone: MeterMapTone): string {
    switch (tone) {
      case 'expired':
        return 'error';

      case 'soon':
        return 'schedule';

      case 'valid':
        return 'check_circle';

      case 'no-date':
        return 'help';

      case 'inactive':
        return 'block';
    }
  }

  private loadMeters(): void {
    if (!this.map) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.metersSubscription?.unsubscribe();
    this.metersSubscription = this.metersService.getAll({
      page: 1,
      take: 1000,
      filter: this.buildMetersFilter(),
      orderBy: 'Code asc'
    }).subscribe({
      next: response => {
        if (!response.succeed) {
          this.errorMessage.set(response.message ?? 'No se pudieron cargar los medidores.');
          this.allMeters.set([]);
          this.clearSource();
          this.isLoading.set(false);
          return;
        }

        const meters = response.result ?? [];

        this.allMeters.set(meters);
        this.ensureSelectedCompanyStillExists();
        this.renderVisibleMeters();
        this.ensureSelectedMeterStillExists();
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los medidores.');
        this.allMeters.set([]);
        this.clearSource();
        this.isLoading.set(false);
      }
    });
  }

  private loadComplianceItems(): void {
    if (!this.isCenaceUser()) {
      this.complianceItems.set([]);
      return;
    }

    this.plansSubscription?.unsubscribe();
    this.plansSubscription = this.plansService.getAll({
      page: 1,
      take: 1,
      orderBy: 'Year desc'
    }).subscribe({
      next: response => {
        const plan = response.result?.[0] ?? null;

        if (!plan) {
          this.complianceItems.set([]);
          return;
        }

        this.loadComplianceItemsByPlan(plan.id);
      },
      error: () => {
        this.complianceItems.set([]);
      }
    });
  }

  private loadComplianceItemsByPlan(calibrationPlanId: number): void {
    this.planItemsSubscription?.unsubscribe();
    this.planItemsSubscription = this.planItemsService.getAll({
      page: 1,
      take: 5000,
      filter: `CalibrationPlanId eq ${calibrationPlanId}`,
      orderBy: 'PmseCompanyName asc, PlannedEndDate asc'
    }).subscribe({
      next: response => {
        this.complianceItems.set(response.succeed ? response.result ?? [] : []);
      },
      error: () => {
        this.complianceItems.set([]);
      }
    });
  }

  private buildMetersFilter(): string | undefined {
    const pmseScopeFilter = this.userScope.getPmseFilter('PmseCompanyId');

    if (pmseScopeFilter) {
      return pmseScopeFilter;
    }

    return undefined;
  }

  private renderVisibleMeters(): void {
    this.renderMarkers(this.visibleMeters());
  }

  private renderMarkers(meters: Meter[]): void {
    if (!this.map) {
      return;
    }

    this.closePopup();
    this.meterGroupsByKey.clear();
    this.markersByMeterCode.clear();

    const metersWithCoordinates = meters.filter(meter => this.hasValidCoordinates(meter));
    const locations: Array<[number, number]> = [];

    const features = metersWithCoordinates.map(meter => {
      const groupKey = `${meter.latitude!.toFixed(6)},${meter.longitude!.toFixed(6)}`;
      const coordinates: [number, number] = [meter.longitude!, meter.latitude!];
      const tone = this.getMeterTone(meter);
      const color = this.getToneColor(tone);

      const metersAtSameLocation = metersWithCoordinates.filter(item =>
        item.latitude!.toFixed(6) === meter.latitude!.toFixed(6) &&
        item.longitude!.toFixed(6) === meter.longitude!.toFixed(6)
      );

      this.meterGroupsByKey.set(groupKey, metersAtSameLocation);
      locations.push(coordinates);

      this.markersByMeterCode.set(meter.code, {
        coordinates,
        meters: metersAtSameLocation,
        groupKey
      });

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates
        },
        properties: {
          meterId: meter.id,
          groupKey,
          code: meter.code,
          color,
          tone
        }
      };
    });

    this.ensureMapSourceAndLayers(this.createFeatureCollection(features));
    this.fitMapToLocations(locations);
  }

  private ensureMapSourceAndLayers(featureCollection: any): void {
    if (!this.map) {
      return;
    }

    const existingSource = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource | undefined;

    if (existingSource) {
      existingSource.setData(featureCollection);
      return;
    }

    this.map.addSource(this.sourceId, {
      type: 'geojson',
      data: featureCollection,
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 45
    });

    this.map.addLayer({
      id: this.clusterLayerId,
      type: 'circle',
      source: this.sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#2563eb',
          10,
          '#1d4ed8',
          30,
          '#7c3aed'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          17,
          10,
          21,
          30,
          25
        ],
        'circle-opacity': 0.95,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    this.map.addLayer({
      id: this.clusterCountLayerId,
      type: 'symbol',
      source: this.sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    this.map.addLayer({
      id: this.pointLayerId,
      type: 'circle',
      source: this.sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 7,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.96,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    this.registerMapLayerEvents();
  }

  private registerMapLayerEvents(): void {
    if (!this.map || this.mapLayerEventsRegistered) {
      return;
    }

    this.map.on('click', this.clusterLayerId, event => {
      this.onClusterClick(event as any);
    });

    this.map.on('click', this.pointLayerId, event => {
      this.onPointClick(event as any);
    });

    this.map.on('mouseenter', this.clusterLayerId, () => {
      if (this.map) {
        this.map.getCanvas().style.cursor = 'pointer';
      }
    });

    this.map.on('mouseleave', this.clusterLayerId, () => {
      if (this.map) {
        this.map.getCanvas().style.cursor = '';
      }
    });

    this.map.on('mouseenter', this.pointLayerId, () => {
      if (this.map) {
        this.map.getCanvas().style.cursor = 'pointer';
      }
    });

    this.map.on('mouseleave', this.pointLayerId, () => {
      if (this.map) {
        this.map.getCanvas().style.cursor = '';
      }
    });

    this.mapLayerEventsRegistered = true;
  }

  private onClusterClick(event: any): void {
    if (!this.map) {
      return;
    }

    const features = this.map.queryRenderedFeatures(event.point, {
      layers: [this.clusterLayerId]
    });

    const clusterFeature = features[0];

    if (!clusterFeature) {
      return;
    }

    const clusterId = clusterFeature.properties?.['cluster_id'];

    if (clusterId === null || clusterId === undefined) {
      return;
    }

    const coordinates = (clusterFeature.geometry as any).coordinates as [number, number];
    const source = this.map.getSource(this.sourceId) as any;

    const zoomCallback = (error: Error | null, zoom: number): void => {
      if (error || !this.map) {
        return;
      }

      this.closePopup();

      this.map.easeTo({
        center: coordinates,
        zoom,
        duration: 500
      });
    };

    const result = source.getClusterExpansionZoom(Number(clusterId), zoomCallback);

    if (result && typeof result.then === 'function') {
      result.then((zoom: number) => zoomCallback(null, zoom));
    }
  }

  private onPointClick(event: any): void {
    if (!this.map) {
      return;
    }

    const feature = event.features?.[0];

    if (!feature) {
      return;
    }

    const groupKey = String(feature.properties?.groupKey ?? '');
    const meters = this.meterGroupsByKey.get(groupKey);

    if (!meters || meters.length === 0) {
      return;
    }

    const coordinates = feature.geometry?.coordinates as [number, number] | undefined;

    if (!coordinates) {
      return;
    }

    this.selectedMeterId.set(meters[0]?.id ?? null);
    this.openOverlayPopup(coordinates, meters);
  }

  private openOverlayPopup(coordinates: [number, number], meters: Meter[]): void {
    if (!this.map) {
      return;
    }

    const projected = this.map.project(coordinates);
    const popupPosition = this.calculatePopupPosition(projected.x, projected.y);

    this.selectedPopup.set({
      ...popupPosition,
      coordinates,
      meters
    });
  }

  private repositionPopup(): void {
    if (!this.map) {
      return;
    }

    const popup = this.selectedPopup();

    if (!popup) {
      return;
    }

    const projected = this.map.project(popup.coordinates);
    const popupPosition = this.calculatePopupPosition(projected.x, projected.y);

    this.selectedPopup.set({
      ...popup,
      ...popupPosition
    });
  }

  private calculatePopupPosition(x: number, y: number): {
    left: number;
    top: number;
    placement: PopupPlacement;
  } {
    const container = this.mapContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const popupWidth = 320;
    const edge = 16;

    const left = this.clamp(
      x,
      popupWidth / 2 + edge,
      Math.max(popupWidth / 2 + edge, width - popupWidth / 2 - edge)
    );

    const top = this.clamp(y, edge, Math.max(edge, height - edge));
    const placement: PopupPlacement = y < 220 ? 'bottom' : 'top';

    return {
      left,
      top,
      placement
    };
  }

  private fitMapToLocations(locations: Array<[number, number]>): void {
    if (!this.map || locations.length === 0) {
      return;
    }

    this.map.resize();

    if (locations.length === 1) {
      this.map.flyTo({
        center: locations[0],
        zoom: 12,
        speed: 1.2,
        essential: true
      });

      return;
    }

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(location => bounds.extend(location));

    const maxZoom =
      locations.length <= 10
        ? 11.2
        : locations.length <= 35
          ? 10.2
          : locations.length <= 120
            ? 9.2
            : 8.3;

    this.map.fitBounds(bounds, {
      padding: 55,
      maxZoom,
      duration: 1000
    });
  }

  private createFeatureCollection(features: any[]): any {
    return {
      type: 'FeatureCollection',
      features
    };
  }

  private clearSource(): void {
    this.closePopup();
    this.meterGroupsByKey.clear();
    this.markersByMeterCode.clear();

    const source = this.map?.getSource(this.sourceId) as mapboxgl.GeoJSONSource | undefined;

    source?.setData(this.createFeatureCollection([]));
  }

  private observeMapContainerResize(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.map) {
        return;
      }

      requestAnimationFrame(() => {
        this.map?.resize();
        this.repositionPopup();
      });
    });

    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  private ensureSelectedCompanyStillExists(): void {
    const selectedCompanyId = this.selectedPmseCompanyId();

    if (!selectedCompanyId) {
      return;
    }

    const exists = this.allMeters().some(meter =>
      Number(meter.pmseCompanyId) === selectedCompanyId
    );

    if (!exists) {
      this.selectedPmseCompanyId.set(null);
    }
  }

  private ensureSelectedMeterStillExists(): void {
    const selectedMeterId = this.selectedMeterControl.value;

    if (!selectedMeterId) {
      return;
    }

    const exists = this.meterSearchOptions()
      .some(option => option.id === selectedMeterId);

    if (!exists) {
      this.selectedMeterControl.setValue(null, { emitEvent: false });
      this.selectedMeterId.set(null);
    }
  }

  private buildMeterSummary(meters: Meter[]): MeterSummary {
    return {
      total: meters.length,
      withCoordinates: meters.filter(meter => this.hasValidCoordinates(meter)).length,
      withoutCoordinates: meters.filter(meter => !this.hasValidCoordinates(meter)).length,
      expired: meters.filter(meter => this.getMeterTone(meter) === 'expired').length,
      soon: meters.filter(meter => this.getMeterTone(meter) === 'soon').length,
      valid: meters.filter(meter => this.getMeterTone(meter) === 'valid').length,
      noDate: meters.filter(meter => this.getMeterTone(meter) === 'no-date').length,
      inactive: meters.filter(meter => this.getMeterTone(meter) === 'inactive').length
    };
  }

  private buildComplianceSummary(items: CalibrationPlanItem[]): CompanyComplianceSummary {
    const totalItems = items.length;

    const eligibleItems = items.filter(item => this.isEligibleItem(item)).length;

    const completedItems = items.filter(item =>
      this.isEligibleItem(item) &&
      Number(item.itemStatus) === CalibrationPlanItemStatus.Approved
    ).length;

    const notCompletedItems = Math.max(eligibleItems - completedItems, 0);
    const futurePendingItems = Math.max(totalItems - eligibleItems, 0);

    const completionRate =
      eligibleItems > 0
        ? (completedItems / eligibleItems) * 100
        : 0;

    return {
      totalItems,
      eligibleItems,
      completedItems,
      notCompletedItems,
      futurePendingItems,
      completionRate
    };
  }

  private isEligibleItem(item: CalibrationPlanItem): boolean {
    if (Number(item.itemStatus) === CalibrationPlanItemStatus.Approved) {
      return true;
    }

    const plannedEndDate = this.parseDateOnly(item.plannedEndDate);

    if (!plannedEndDate) {
      return false;
    }

    return plannedEndDate <= this.today();
  }

  private parseDateOnly(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(`${value.substring(0, 10)}T00:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private today(): Date {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }

  private buildMeterDisplayName(meter: Meter): string {
    const parts = [
      meter.code,
      meter.serial
    ]
      .map(value => value?.trim())
      .filter(Boolean);

    if (this.isCenaceUser()) {
      const pmseCompanyName = meter.pmseCompanyName?.trim();

      if (pmseCompanyName) {
        parts.push(pmseCompanyName);
      }
    }

    return parts.join(' · ');
  }

  private getTonePriority(tone: MeterMapTone): number {
    switch (tone) {
      case 'expired':
        return 1;

      case 'soon':
        return 2;

      case 'no-date':
        return 3;

      case 'valid':
        return 4;

      case 'inactive':
        return 5;
    }
  }

  private getToneColor(tone: MeterMapTone): string {
    switch (tone) {
      case 'expired':
        return '#ef4444';

      case 'soon':
        return '#f59e0b';

      case 'valid':
        return '#22c55e';

      case 'no-date':
        return '#38bdf8';

      case 'inactive':
        return '#64748b';
    }
  }

  private hasValidCoordinates(meter: Meter): boolean {
    if (meter.latitude === null || meter.latitude === undefined) {
      return false;
    }

    if (meter.longitude === null || meter.longitude === undefined) {
      return false;
    }

    return (
      Number.isFinite(meter.latitude) &&
      Number.isFinite(meter.longitude) &&
      meter.latitude >= -90 &&
      meter.latitude <= 90 &&
      meter.longitude >= -180 &&
      meter.longitude <= 180 &&
      !(meter.latitude === 0 && meter.longitude === 0)
    );
  }

  private startOfDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}