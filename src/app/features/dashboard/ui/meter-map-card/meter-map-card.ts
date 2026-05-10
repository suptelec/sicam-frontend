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

interface MeterSearchOption {
  id: number;
  displayName: string;
  meter: Meter;
}

const SOURCE_ID = 'meters-source';
const LAYER_CLUSTERS = 'meters-clusters';
const LAYER_CLUSTER_COUNT = 'meters-cluster-count';
const LAYER_POINTS = 'meters-points';

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

  private map?: mapboxgl.Map;
  private activePopup?: mapboxgl.Popup;

  private metersSubscription?: Subscription;
  private companiesSubscription?: Subscription;
  private companyFilterSubscription?: Subscription;
  private meterFilterSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;

  readonly isLoading = signal(false);
  readonly isLoadingCompanies = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly allMeters = signal<Meter[]>([]);
  readonly pmseCompanies = signal<PmseCompany[]>([]);
  readonly selectedPmseCompanyId = signal<number | null>(null);

  readonly selectedPmseCompanyControl = new FormControl<number | null>(null);
  readonly selectedMeterControl = new FormControl<number | null>(null);

  readonly isPmseUser = this.userScope.isPmseUser;
  readonly isCenaceUser = this.userScope.isCenaceUser;
  readonly pmseCompanyName = this.userScope.pmseCompanyName;

  readonly metersWithCoordinates = computed(() =>
    this.allMeters().filter(m => this.hasValidCoordinates(m))
  );

  readonly metersWithoutCoordinates = computed(() =>
    this.allMeters().filter(m => !this.hasValidCoordinates(m))
  );

  readonly expiredMeters = computed(() =>
    this.allMeters().filter(m => this.getMeterTone(m) === 'expired')
  );

  readonly soonMeters = computed(() =>
    this.allMeters().filter(m => this.getMeterTone(m) === 'soon')
  );

  readonly selectedPmseCompanyName = computed(() => {
    const selectedId = this.selectedPmseCompanyId();
    if (!selectedId) return null;
    return this.pmseCompanies().find(c => c.id === selectedId)?.name ?? null;
  });

  readonly meterSearchOptions = computed<MeterSearchOption[]>(() =>
    this.metersWithCoordinates().map(meter => ({
      id: meter.id,
      displayName: this.buildMeterDisplayName(meter),
      meter
    }))
  );

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.companyFilterSubscription = this.selectedPmseCompanyControl.valueChanges
      .subscribe(value => this.onPmseCompanyChange(value));

    this.meterFilterSubscription = this.selectedMeterControl.valueChanges
      .subscribe(value => this.onMeterSelected(value));
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
      this.initLayers();
      this.loadPmseCompaniesIfNeeded();
      this.loadMeters();
    });
  }

  ngOnDestroy(): void {
    this.metersSubscription?.unsubscribe();
    this.companiesSubscription?.unsubscribe();
    this.companyFilterSubscription?.unsubscribe();
    this.meterFilterSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();

    this.activePopup?.remove();

    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  // ─── Public ──────────────────────────────────────────────────────────────

  refresh(): void {
    this.loadMeters();
  }

  onPmseCompanyChange(value: unknown | null): void {
    const parsed = Number(value);

    this.selectedPmseCompanyId.set(
      Number.isFinite(parsed) && parsed > 0 ? parsed : null
    );

    this.selectedMeterControl.setValue(null, { emitEvent: false });
    this.loadMeters();
  }

  clearPmseCompanyFilter(): void {
    this.selectedPmseCompanyControl.setValue(null);
  }

  onMeterSelected(value: unknown | null): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const selected = this.meterSearchOptions().find(o => o.id === parsed);
    if (selected) this.focusMeter(selected.meter);
  }

  clearMeterFilter(): void {
    this.selectedMeterControl.setValue(null);
  }

  focusMeter(meter: Meter): void {
    if (!this.map || !this.hasValidCoordinates(meter)) return;

    this.map.flyTo({
      center: [meter.longitude!, meter.latitude!],
      zoom: 15,
      speed: 2,
      curve: 1.35,
      essential: true
    });

    this.openPopup([meter.longitude!, meter.latitude!], this.buildPopupHtml(meter));
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
    if (meter.status !== EntityStatus.Active) return 'inactive';
    if (!meter.nextCalibrationDate) return 'no-date';

    const today = this.startOfDay(new Date());
    const nextCalibrationDate = this.startOfDay(new Date(meter.nextCalibrationDate));

    if (Number.isNaN(nextCalibrationDate.getTime())) return 'no-date';
    if (nextCalibrationDate < today) return 'expired';

    const limit = new Date(today);
    limit.setDate(limit.getDate() + 90);
    if (nextCalibrationDate <= limit) return 'soon';

    return 'valid';
  }

  getToneLabel(tone: MeterMapTone): string {
    switch (tone) {
      case 'expired':  return 'Vencido';
      case 'soon':     return 'Por vencer';
      case 'valid':    return 'Vigente';
      case 'no-date':  return 'Sin fecha';
      case 'inactive': return 'Inactivo';
    }
  }

  // ─── Map layers init ──────────────────────────────────────────────────────

  private initLayers(): void {
    if (!this.map) return;

    this.map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 45,
      generateId: true
    });

    this.map.addLayer({
      id: LAYER_CLUSTERS,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          '#3b82f6',
          10, '#f59e0b',
          50, '#ef4444'
        ],
        'circle-radius': [
          'step', ['get', 'point_count'],
          18,
          10, 24,
          50, 32
        ],
        'circle-opacity': 0.88,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.2)'
      }
    });

    this.map.addLayer({
      id: LAYER_CLUSTER_COUNT,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 13
      },
      paint: { 'text-color': '#ffffff' }
    });

    this.map.addLayer({
      id: LAYER_POINTS,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 7,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.7)'
      }
    });

    this.map.on('click', LAYER_CLUSTERS, e => this.onClusterClick(e));
    this.map.on('click', LAYER_POINTS, e => this.onPointClick(e));

    this.map.on('mouseenter', LAYER_CLUSTERS, () => this.setCursor('pointer'));
    this.map.on('mouseleave', LAYER_CLUSTERS, () => this.setCursor(''));
    this.map.on('mouseenter', LAYER_POINTS, () => this.setCursor('pointer'));
    this.map.on('mouseleave', LAYER_POINTS, () => this.setCursor(''));
  }

  // ─── Map events ──────────────────────────────────────────────────────────

  private onClusterClick(e: mapboxgl.MapMouseEvent): void {
    if (!this.map) return;

    const features = this.map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTERS] });
    if (!features.length) return;

    const clusterId = (features[0].properties as any)['cluster_id'];
    const source = this.map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err || !this.map) return;
      this.map.easeTo({
        center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
        zoom: zoom!
      });
    });
  }

  private onPointClick(e: mapboxgl.MapMouseEvent): void {
    if (!this.map) return;

    const features = this.map.queryRenderedFeatures(e.point, { layers: [LAYER_POINTS] });
    if (!features.length) return;

    const props = features[0].properties as any;
    const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];

    // popupHtml viene directo en las properties — sin lookup al cache
    const html = props['popupHtml'] as string;
    if (!html) return;

    this.openPopup(coords, html);
  }

  private openPopup(coords: [number, number], html: string): void {
    if (!this.map) return;

    this.activePopup?.remove();
    this.activePopup = new mapboxgl.Popup({
      offset: 12,
      closeButton: true,
      closeOnClick: true,
      focusAfterOpen: false,
      maxWidth: '360px',
      className: 'sicam-meter-popup'
    })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(this.map);
  }

  private setCursor(cursor: string): void {
    if (this.map) this.map.getCanvas().style.cursor = cursor;
  }

  // ─── Data loading ─────────────────────────────────────────────────────────

  private loadPmseCompaniesIfNeeded(): void {
    if (!this.isCenaceUser()) return;

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
    if (!this.map) return;

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
    if (pmseScopeFilter) return pmseScopeFilter;

    const selectedCompanyId = this.selectedPmseCompanyId();
    if (this.isCenaceUser() && selectedCompanyId) {
      return `PmseCompanyId eq ${selectedCompanyId}`;
    }

    return undefined;
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  private renderMarkers(meters: Meter[]): void {
    if (!this.map) return;

    const metersWithCoords = meters.filter(m => this.hasValidCoordinates(m));

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: metersWithCoords.map(meter => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [meter.longitude!, meter.latitude!]
        },
        properties: {
          color: this.getToneColor(this.getMeterTone(meter)),
          // HTML completo en properties — el click no necesita ningún lookup
          popupHtml: this.buildPopupHtml(meter)
        }
      }))
    };

    const source = this.map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(geojson);

    this.fitMapToMeters(metersWithCoords);
  }

  private clearSource(): void {
    const source = this.map?.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData({ type: 'FeatureCollection', features: [] });
  }

  private fitMapToMeters(meters: Meter[]): void {
    if (!this.map || meters.length === 0) return;

    this.map.resize();

    if (meters.length === 1) {
      this.map.flyTo({
        center: [meters[0].longitude!, meters[0].latitude!],
        zoom: 14,
        speed: 1.2,
        essential: true
      });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    meters.forEach(m => bounds.extend([m.longitude!, m.latitude!]));

    this.map.fitBounds(bounds, {
      padding: 55,
      maxZoom: 11.5,
      duration: 900
    });
  }

  // ─── Popup HTML ──────────────────────────────────────────────────────────

  private buildPopupHtml(meter: Meter): string {
    const tone = this.getMeterTone(meter);
    const toneLabel = this.getToneLabel(tone);
    const toneColor = this.getToneColor(tone);

    return `
      <section style="min-width:260px;background:#0f172a;color:#e5e7eb;">
        <header style="padding-bottom:8px;">
          <p style="margin:0 0 4px;color:#60a5fa;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">SICAM · Medidores</p>
          <h3 style="margin:0;color:#f8fafc;font-size:15px;font-weight:900;">${this.escapeHtml(meter.code)}</h3>
        </header>
        <article style="padding:10px 0;border-top:1px solid rgba(148,163,184,.25);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <strong style="color:#f8fafc;font-size:13px;">${this.escapeHtml(meter.code)}</strong>
            <span style="padding:4px 8px;border-radius:999px;background:${toneColor}22;color:${toneColor};font-size:11px;font-weight:800;">
              ${toneLabel}
            </span>
          </div>
          <p style="margin:6px 0 0;color:#cbd5e1;font-size:12px;">Serial: ${this.escapeHtml(meter.serial || '—')}</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">PMSE: ${this.escapeHtml(meter.pmseCompanyName || '—')}</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">${this.escapeHtml(meter.province || '—')} · ${this.escapeHtml(meter.sector || '—')}</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Próx. calibración: ${this.escapeHtml(this.formatDate(meter.nextCalibrationDate))}</p>
        </article>
      </section>
    `;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private getToneColor(tone: MeterMapTone): string {
    switch (tone) {
      case 'expired':  return '#ef4444';
      case 'soon':     return '#f59e0b';
      case 'valid':    return '#22c55e';
      case 'no-date':  return '#38bdf8';
      case 'inactive': return '#64748b';
    }
  }

  private hasValidCoordinates(meter: Meter): boolean {
    if (meter.latitude == null || meter.longitude == null) return false;

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

  private observeMapContainerResize(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.map) return;
      requestAnimationFrame(() => this.map?.resize());
    });

    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  private ensureSelectedMeterStillExists(): void {
    const selectedMeterId = this.selectedMeterControl.value;
    if (!selectedMeterId) return;

    const exists = this.meterSearchOptions().some(o => o.id === selectedMeterId);
    if (!exists) this.selectedMeterControl.setValue(null, { emitEvent: false });
  }

  private buildMeterDisplayName(meter: Meter): string {
    const parts = [meter.code, meter.serial]
      .map(v => v?.trim())
      .filter(Boolean) as string[];

    if (this.isCenaceUser()) {
      const name = meter.pmseCompanyName?.trim();
      if (name) parts.push(name);
    }

    return parts.join(' · ');
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}