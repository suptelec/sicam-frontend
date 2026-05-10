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
import { PmseCompaniesService } from '../../../pmse-companies/data-access/pmse-companies.service';
import { PmseCompany } from '../../../pmse-companies/domain/pmse-company.model';
import { EntityStatus as PmseEntityStatus } from '../../../pmse-companies/domain/pmse-company.enum';

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
  private readonly pmseCompaniesService = inject(PmseCompaniesService);
  private readonly userScope = inject(UserScopeService);

  private readonly sourceId = 'sicam-meter-map-source';
  private readonly clusterLayerId = 'sicam-meter-map-clusters';
  private readonly clusterCountLayerId = 'sicam-meter-map-cluster-count';
  private readonly pointLayerId = 'sicam-meter-map-points';

  private map?: mapboxgl.Map;

  private metersSubscription?: Subscription;
  private companiesSubscription?: Subscription;
  private companyFilterSubscription?: Subscription;
  private meterFilterSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;

  private mapLayerEventsRegistered = false;

  private readonly meterGroupsByKey = new Map<string, Meter[]>();
  private readonly markersByMeterCode = new Map<string, MeterMapMarkerRef>();

  readonly isLoading = signal(false);
  readonly isLoadingCompanies = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly allMeters = signal<Meter[]>([]);
  readonly pmseCompanies = signal<PmseCompany[]>([]);
  readonly selectedPmseCompanyId = signal<number | null>(null);
  readonly selectedPopup = signal<MeterMapPopup | null>(null);

  readonly selectedPmseCompanyControl = new FormControl<number | null>(null);
  readonly selectedMeterControl = new FormControl<number | null>(null);

  readonly isPmseUser = this.userScope.isPmseUser;
  readonly isCenaceUser = this.userScope.isCenaceUser;
  readonly pmseCompanyName = this.userScope.pmseCompanyName;

  readonly metersWithCoordinates = computed(() => {
    return this.allMeters().filter(meter => this.hasValidCoordinates(meter));
  });

  readonly metersWithoutCoordinates = computed(() => {
    return this.allMeters().filter(meter => !this.hasValidCoordinates(meter));
  });

  readonly expiredMeters = computed(() => {
    return this.allMeters().filter(meter => this.getMeterTone(meter) === 'expired');
  });

  readonly soonMeters = computed(() => {
    return this.allMeters().filter(meter => this.getMeterTone(meter) === 'soon');
  });

  readonly selectedPmseCompanyName = computed(() => {
    const selectedId = this.selectedPmseCompanyId();

    if (!selectedId) {
      return null;
    }

    return this.pmseCompanies().find(company => company.id === selectedId)?.name ?? null;
  });

  readonly meterSearchOptions = computed<MeterSearchOption[]>(() => {
    return this.metersWithCoordinates().map(meter => ({
      id: meter.id,
      displayName: this.buildMeterDisplayName(meter),
      meter
    }));
  });

  ngOnInit(): void {
    this.companyFilterSubscription = this.selectedPmseCompanyControl.valueChanges
      .subscribe(value => {
        this.onPmseCompanyChange(value);
      });

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
      this.loadPmseCompaniesIfNeeded();
      this.loadMeters();
    });

    this.map.on('move', () => this.repositionPopup());
    this.map.on('zoom', () => this.repositionPopup());
    this.map.on('dragstart', () => this.closePopup());
  }

  ngOnDestroy(): void {
    this.metersSubscription?.unsubscribe();
    this.companiesSubscription?.unsubscribe();
    this.companyFilterSubscription?.unsubscribe();
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
  }

  onPmseCompanyChange(value: unknown | null): void {
    const parsed = Number(value);

    this.selectedPmseCompanyId.set(
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : null
    );

    this.selectedMeterControl.setValue(null, { emitEvent: false });
    this.closePopup();
    this.loadMeters();
  }

  clearPmseCompanyFilter(): void {
    this.selectedPmseCompanyControl.setValue(null);
  }

  onMeterSelected(value: unknown | null): void {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    const selected = this.meterSearchOptions()
      .find(option => option.id === parsed);

    if (!selected) {
      return;
    }

    this.focusMeter(selected.meter);
  }

  clearMeterFilter(): void {
    this.selectedMeterControl.setValue(null);
  }

  focusMeter(meter: Meter): void {
    const markerRef = this.markersByMeterCode.get(meter.code);

    if (!markerRef || !this.map) {
      return;
    }

    this.closePopup();

    this.map.flyTo({
      center: markerRef.coordinates,
      zoom: 15,
      speed: 2,
      curve: 1.35,
      essential: true
    });
  }

  closePopup(): void {
    this.selectedPopup.set(null);
  }

  formatDateForView(value?: string | null): string {
    return this.formatDate(value);
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

  private loadPmseCompaniesIfNeeded(): void {
    if (!this.isCenaceUser()) {
      return;
    }

    this.isLoadingCompanies.set(true);

    this.companiesSubscription?.unsubscribe();
    this.companiesSubscription = this.pmseCompaniesService.getAll({
      page: 1,
      take: 500,
      filter: `Status eq ${PmseEntityStatus.Active}`,
      orderBy: 'Name asc'
    }).subscribe({
      next: response => {
        this.pmseCompanies.set(response.succeed ? response.result ?? [] : []);
        this.isLoadingCompanies.set(false);
      },
      error: () => {
        this.pmseCompanies.set([]);
        this.isLoadingCompanies.set(false);
      }
    });
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
        this.renderMarkers(meters);
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

  private buildMetersFilter(): string | undefined {
    const pmseScopeFilter = this.userScope.getPmseFilter('PmseCompanyId');

    if (pmseScopeFilter) {
      return pmseScopeFilter;
    }

    const selectedCompanyId = this.selectedPmseCompanyId();

    if (this.isCenaceUser() && selectedCompanyId) {
      return `PmseCompanyId eq ${selectedCompanyId}`;
    }

    return undefined;
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
      const coordinates: [number, number] = [
        meter.longitude!,
        meter.latitude!
      ];
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
      meter.longitude <= 180
    );
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
    }
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

  private getGroupTone(meters: Meter[]): MeterMapTone {
    const tones = meters.map(meter => this.getMeterTone(meter));

    if (tones.includes('expired')) {
      return 'expired';
    }

    if (tones.includes('soon')) {
      return 'soon';
    }

    if (tones.includes('no-date')) {
      return 'no-date';
    }

    if (tones.includes('inactive')) {
      return 'inactive';
    }

    return 'valid';
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