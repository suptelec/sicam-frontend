import { Component, EventEmitter, OnInit, Output, inject, input, signal } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToastService } from '../../../../core/services/toast.service';
import { PmseCompaniesService } from '../../../pmse-companies/data-access/pmse-companies.service';

import { MetersService } from '../../data-access/meters.service';
import {
  CreateMeterRequest,
  EntityStatus,
  Meter
} from '../../domain/meter.model';

import {
  MeterCompanyOption,
  MeterIdentificationSectionComponent
} from './sections/meter-identification-section/meter-identification-section';
import { MeterCenaceSectionComponent } from './sections/meter-cenace-section/meter-cenace-section';
import { MeterRelationshipSectionComponent } from './sections/meter-relationship-section/meter-relationship-section';
import { MeterTechnicalSectionComponent } from './sections/meter-technical-section/meter-technical-section';
import { MeterLocationSectionComponent } from './sections/meter-location-section/meter-location-section';
import { MeterNetworkSectionComponent } from './sections/meter-network-section/meter-network-section';
import { MeterSealsSectionComponent } from './sections/meter-seals-section/meter-seals-section';
import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';

@Component({
  selector: 'app-meter-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    MeterIdentificationSectionComponent,
    MeterCenaceSectionComponent,
    MeterRelationshipSectionComponent,
    MeterTechnicalSectionComponent,
    MeterLocationSectionComponent,
    MeterNetworkSectionComponent,
    MeterSealsSectionComponent,
    DrawerActionsComponent
  ],
  templateUrl: './meter-drawer.html',
  styleUrl: './meter-drawer.scss'
})
export class MeterDrawerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly metersService = inject(MetersService);
  private readonly companiesService = inject(PmseCompaniesService);
  private readonly toast = inject(ToastService);
  meterId = input<number | null>(null);

  @Output() updated = new EventEmitter<Meter>();
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<Meter>();

  loading = false;
  submitAttempted = false;
  companies = signal<MeterCompanyOption[]>([]);

  readonly form = this.fb.group({
    identification: this.fb.group({
      pmseCompanyId: [null as number | null, Validators.required],
      code: ['', [Validators.required, Validators.maxLength(80)]],
      serial: ['', [Validators.required, Validators.maxLength(120)]],
      tplCode: ['', [Validators.maxLength(100)]],
      cenaceCode: ['', [Validators.maxLength(100)]],
      brand: ['', [Validators.maxLength(120)]],
      model: ['', [Validators.maxLength(120)]]
    }),
    cenace: this.fb.group({
      installationType: [null as number | null],
      requirementType: [null as number | null],
      isPartOfSni: [false],
      installationName: ['', [Validators.maxLength(300)]],
      installationDescription: ['', [Validators.maxLength(1000)]],
      installationLocation: ['', [Validators.maxLength(300)]],
      measurementPointCode: ['', [Validators.maxLength(120)]],
      measurementPointWbCode: ['', [Validators.maxLength(120)]],
      borderPointCode: ['', [Validators.maxLength(120)]]
    }),
    relationship: this.fb.group({
      isPrincipal: [true],
      principalCode: ['']
    }),
    technical: this.fb.group({
    accuracyClass: ['', [Validators.maxLength(80)]],
      nominalKv: [null as number | null, [Validators.min(0)]],
      tcRatio: ['', [Validators.maxLength(80)]],
      tpRatio: ['', [Validators.maxLength(80)]],
      tcSecondaryRatio: ['', [Validators.maxLength(80)]],
      tpSecondaryRatio: ['', [Validators.maxLength(80)]]
    }),
    location: this.fb.group({
      province: ['', [Validators.maxLength(120)]],
      sector: ['', [Validators.maxLength(120)]],
      address: ['', [Validators.maxLength(300)]],
      latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
      reference: ['', [Validators.maxLength(500)]]
    }),
    network: this.fb.group({
      gateway: ['', [Validators.maxLength(120)]],
      ipAddress: ['', [Validators.maxLength(80)]],
      macAddress: ['', [Validators.maxLength(80)]],
      subnetMask: ['', [Validators.maxLength(80)]],
      switchLanPort: ['', [Validators.maxLength(80)]],
      networkType: ['', [Validators.maxLength(80)]],
      activeMeter: ['', [Validators.maxLength(80)]],
      activeRouter: ['', [Validators.maxLength(80)]],
      batteryLevelPercent: ['', [Validators.maxLength(80)]]
    }),
    seals: this.fb.group({
      mainMeterSeal: ['', [Validators.maxLength(120)]],
      terminalBlockSealOne: ['', [Validators.maxLength(120)]],
      terminalBlockSealTwo: ['', [Validators.maxLength(120)]]
    })
  });

  ngOnInit(): void {
    this.loadCompanies();
    this.configurePrincipalValidation();

    if (this.meterId()) {
      this.loadMeter(this.meterId()!);
    }
  }

  get isEditMode(): boolean {
    return !!this.meterId();
  }

  get drawerTitle(): string {
    return this.isEditMode ? 'Editar medidor' : 'Crear medidor';
  }

  get drawerDescription(): string {
    return this.isEditMode
      ? 'Actualiza la información técnica y regulatoria del medidor.'
      : 'Registra la información base del medidor para planificación, certificados y procesos de calibración.';
  }

  get submitText(): string {
    return this.isEditMode ? 'Guardar cambios' : 'Guardar medidor';
  }

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid;
  }
  
  get identificationForm(): FormGroup {
    return this.form.get('identification') as FormGroup;
  }

  get cenaceForm(): FormGroup {
    return this.form.get('cenace') as FormGroup;
  }

  get relationshipForm(): FormGroup {
    return this.form.get('relationship') as FormGroup;
  }

  get technicalForm(): FormGroup {
    return this.form.get('technical') as FormGroup;
  }

  get locationForm(): FormGroup {
    return this.form.get('location') as FormGroup;
  }

  get networkForm(): FormGroup {
    return this.form.get('network') as FormGroup;
  }

  get sealsForm(): FormGroup {
    return this.form.get('seals') as FormGroup;
  }

  submit(): void {
    this.submitAttempted = true;

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    const dto = this.buildRequest();

    this.loading = true;

    const request$ = this.isEditMode
      ? this.metersService.update(this.meterId()!, dto)
      : this.metersService.create(dto);

    request$.subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo guardar el medidor.');
          return;
        }

        const message = this.isEditMode
          ? 'Medidor actualizado correctamente.'
          : 'Medidor creado correctamente.';

        this.toast.success(message);

        if (this.isEditMode) {
          this.updated.emit(response.result);
        } else {
          this.created.emit(response.result);
        }

        this.reset();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al guardar el medidor.');
      }
    });
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }

  hasGroupError(groupName: string): boolean {
    const group = this.form.get(groupName);

    if (!group) return false;

    return group.invalid;
  }

  private loadMeter(id: number): void {
    this.loading = true;

    this.metersService.getById(id).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo cargar el medidor.');
          this.closed.emit();
          return;
        }

        this.patchForm(response.result);
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al cargar el medidor.');
        this.closed.emit();
      }
    });
  }

  private patchForm(meter: Meter): void {
    this.form.patchValue({
      identification: {
        pmseCompanyId: meter.pmseCompanyId,
        code: meter.code ?? '',
        serial: meter.serial ?? '',
        tplCode: meter.tplCode ?? '',
        cenaceCode: meter.cenaceCode ?? '',
        brand: meter.brand ?? '',
        model: meter.model ?? ''
      },
      cenace: {
        installationType: meter.installationType ?? null,
        requirementType: meter.requirementType ?? null,
        isPartOfSni: meter.isPartOfSni ?? false,
        installationName: meter.installationName ?? '',
        installationDescription: meter.installationDescription ?? '',
        installationLocation: meter.installationLocation ?? '',
        measurementPointCode: meter.measurementPointCode ?? '',
        measurementPointWbCode: meter.measurementPointWbCode ?? '',
        borderPointCode: meter.borderPointCode ?? ''
      },
      relationship: {
        isPrincipal: meter.isPrincipal,
        principalCode: meter.principalCode ?? ''
      },
      technical: {
        accuracyClass: meter.accuracyClass ?? '',
        nominalKv: meter.nominalKv ?? null,
        tcRatio: meter.tcRatio ?? '',
        tpRatio: meter.tpRatio ?? '',
        tcSecondaryRatio: meter.tcSecondaryRatio ?? '',
        tpSecondaryRatio: meter.tpSecondaryRatio ?? ''
      },
      location: {
        province: meter.province ?? '',
        sector: meter.sector ?? '',
        address: meter.address ?? '',
        latitude: meter.latitude ?? null,
        longitude: meter.longitude ?? null,
        reference: meter.reference ?? ''
      },
      network: {
        gateway: meter.gateway ?? '',
        ipAddress: meter.ipAddress ?? '',
        macAddress: meter.macAddress ?? '',
        subnetMask: meter.subnetMask ?? '',
        switchLanPort: meter.switchLanPort ?? '',
        networkType: meter.networkType ?? '',
        activeMeter: meter.activeMeter ?? '',
        activeRouter: meter.activeRouter ?? '',
        batteryLevelPercent: meter.batteryLevelPercent ?? ''
      },
      seals: {
        mainMeterSeal: meter.mainMeterSeal ?? '',
        terminalBlockSealOne: meter.terminalBlockSealOne ?? '',
        terminalBlockSealTwo: meter.terminalBlockSealTwo ?? ''
      }
    });
  }

    getCenaceWarnings(): string[] {
      const cenace = this.cenaceForm.getRawValue();
      const identification = this.identificationForm.getRawValue();

      const warnings: string[] = [];

      if (!identification.serial?.trim()) {
        warnings.push('El medidor no tiene número de serie.');
      }

      if (!cenace.installationType) {
        warnings.push('Falta el tipo de instalación.');
      }

      if (!cenace.requirementType) {
        warnings.push('Falta indicar si el medidor es obligatorio o redundante.');
      }

      if (!cenace.measurementPointCode?.trim()) {
        warnings.push('Falta el punto de medida.');
      }

      if (!cenace.borderPointCode?.trim()) {
        warnings.push('Falta el punto frontera.');
      }

      if (!cenace.installationName?.trim()) {
        warnings.push('Falta el nombre de instalación.');
      }

      if (cenace.isPartOfSni === null || cenace.isPartOfSni === undefined) {
        warnings.push('Falta indicar si forma parte del SNI.');
      }

      return warnings;
    }

    hasCenaceWarnings(): boolean {
      return this.getCenaceWarnings().length > 0;
    }

  private loadCompanies(): void {
    this.companiesService.getAll({
      page: 1,
      take: 200,
      orderBy: 'Name asc'
    }).subscribe({
      next: response => {
        if (!response.succeed) {
          this.toast.warning(response.message ?? 'No se pudieron cargar las empresas PMSE.');
          return;
        }

        this.companies.set(
          (response.result ?? []).map(company => ({
            id: company.id,
            name: company.name,
            externalCode: company.externalCode
          }))
        );
      },
      error: () => {
        this.toast.warning('No se pudieron cargar las empresas PMSE.');
      }
    });
  }

  private configurePrincipalValidation(): void {
    const isPrincipalControl = this.relationshipForm.get('isPrincipal');
    const principalCodeControl = this.relationshipForm.get('principalCode');

    isPrincipalControl?.valueChanges.subscribe(isPrincipal => {
      if (isPrincipal) {
        principalCodeControl?.clearValidators();
        principalCodeControl?.setValue('');
      } else {
        principalCodeControl?.setValidators([
          Validators.required,
          Validators.maxLength(120)
        ]);
      }

      principalCodeControl?.updateValueAndValidity();
    });
  }

  private buildRequest(): CreateMeterRequest {
    const identification = this.identificationForm.getRawValue();
    const cenace = this.cenaceForm.getRawValue();
    const relationship = this.relationshipForm.getRawValue();
    const technical = this.technicalForm.getRawValue();
    const location = this.locationForm.getRawValue();
    const network = this.networkForm.getRawValue();
    const seals = this.sealsForm.getRawValue();

    return {
      pmseCompanyId: Number(identification.pmseCompanyId),

      code: this.normalizeRequired(identification.code),
      serial: this.normalizeRequired(identification.serial),
      tplCode: this.normalize(identification.tplCode),
      cenaceCode: this.normalize(identification.cenaceCode),

      brand: this.normalize(identification.brand),
      model: this.normalize(identification.model),

      installationType: cenace.installationType,
      requirementType: cenace.requirementType,
      isPartOfSni: !!cenace.isPartOfSni,
      installationName: this.normalize(cenace.installationName),
      installationDescription: this.normalize(cenace.installationDescription),
      installationLocation: this.normalize(cenace.installationLocation),
      measurementPointCode: this.normalize(cenace.measurementPointCode),
      measurementPointWbCode: this.normalize(cenace.measurementPointWbCode),
      borderPointCode: this.normalize(cenace.borderPointCode),

      isPrincipal: !!relationship.isPrincipal,
      principalCode: relationship.isPrincipal
        ? null
        : this.normalize(relationship.principalCode),

      accuracyClass: this.normalize(technical.accuracyClass),
      nominalKv: this.normalizeNumber(technical.nominalKv),
      tcRatio: this.normalize(technical.tcRatio),
      tpRatio: this.normalize(technical.tpRatio),
      tcSecondaryRatio: this.normalize(technical.tcSecondaryRatio),
      tpSecondaryRatio: this.normalize(technical.tpSecondaryRatio),

      province: this.normalize(location.province),
      sector: this.normalize(location.sector),
      address: this.normalize(location.address),
      latitude: this.normalizeNumber(location.latitude),
      longitude: this.normalizeNumber(location.longitude),
      reference: this.normalize(location.reference),

      gateway: this.normalize(network.gateway),
      ipAddress: this.normalize(network.ipAddress),
      macAddress: this.normalize(network.macAddress),
      subnetMask: this.normalize(network.subnetMask),
      switchLanPort: this.normalize(network.switchLanPort),
      networkType: this.normalize(network.networkType),
      activeMeter: this.normalize(network.activeMeter),
      activeRouter: this.normalize(network.activeRouter),
      batteryLevelPercent: this.normalize(network.batteryLevelPercent),

      mainMeterSeal: this.normalize(seals.mainMeterSeal),
      terminalBlockSealOne: this.normalize(seals.terminalBlockSealOne),
      terminalBlockSealTwo: this.normalize(seals.terminalBlockSealTwo),

      status: EntityStatus.Active
    };
  }

  private reset(): void {
    this.form.reset({
      identification: {
        pmseCompanyId: null,
        code: '',
        serial: '',
        tplCode: '',
        cenaceCode: '',
        brand: '',
        model: ''
      },
      cenace: {
        installationType: null,
        requirementType: null,
        isPartOfSni: false,
        installationName: '',
        installationDescription: '',
        installationLocation: '',
        measurementPointCode: '',
        measurementPointWbCode: '',
        borderPointCode: ''
      },
      relationship: {
        isPrincipal: true,
        principalCode: ''
      },
      technical: {
        accuracyClass: '',
        nominalKv: null,
        tcRatio: '',
        tpRatio: '',
        tcSecondaryRatio: '',
        tpSecondaryRatio: ''
      },
      location: {
        province: '',
        sector: '',
        address: '',
        latitude: null,
        longitude: null,
        reference: ''
      },
      network: {
        gateway: '',
        ipAddress: '',
        macAddress: '',
        subnetMask: '',
        switchLanPort: '',
        networkType: '',
        activeMeter: '',
        activeRouter: '',
        batteryLevelPercent: ''
      },
      seals: {
        mainMeterSeal: '',
        terminalBlockSealOne: '',
        terminalBlockSealTwo: ''
      }
    });

    this.submitAttempted = false;
    this.loading = false;
  }

  private normalize(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();

    return normalized ? normalized : null;
  }

  private normalizeRequired(value: unknown): string {
    return typeof value === 'string'
      ? value.trim()
      : '';
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? null : numberValue;
  }
}