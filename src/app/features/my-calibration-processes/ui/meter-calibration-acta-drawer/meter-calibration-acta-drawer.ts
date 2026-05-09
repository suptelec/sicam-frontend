import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  effect,
  inject,
  input,
  signal
} from '@angular/core';

import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DateFieldComponent } from '../../../../shared/components/date-field/date-field';

import { FileUploadService } from '../../../../core/files/file-upload.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { CalibrationProcessesService } from '../../../my-calibration-items/data-access/calibration-processes.service';
import {
  CreateMeterCalibrationActaSealPhotoRequest,
  MeterCalibrationActa,
  MeterCalibrationActaCheck,
  MeterCalibrationActaCheckResult,
  MeterCalibrationActaFormResponse,
  MeterCalibrationActaSeal,
  MeterCalibrationActaSealPhoto,
  MeterSealType,
  SaveMeterCalibrationActaRequest
} from '../../../my-calibration-items/domain/calibration-process.model';

type ActaStep = 'acta' | 'photos';
type ActaSection = 'datos' | 'validaciones' | 'finalizacion' | 'sellos';
type ActaCheckSource = 'manual';
type InstallationFormOption = '9S' | '32S';

interface ActaCheckDefinition {
  checkCode: number;
  label: string;
  sectionKey: string;
  sectionTitle: string;
  sectionSubtitle: string;
  source: ActaCheckSource;
  inputType?: 'boolean' | 'installationForm';
}

interface GroupedActaCheckSection {
  key: string;
  title: string;
  subtitle: string;
  source: ActaCheckSource;
  items: {
    definition: ActaCheckDefinition;
    index: number;
    order: number;
  }[];
}

const CENACE_MANUAL_CHECK_CODES = [22, 31, 40];
const METER_INSTALLATION_FORM_CODES = [8, 56];
const METER_INSTALLATION_FORM_OPTIONS: InstallationFormOption[] = ['9S', '32S'];

const PMSE_INITIAL_CHECKS: ActaCheckDefinition[] = [
  {
    checkCode: 1,
    label: '¿La secuencia de fases de corriente y voltaje se encuentran como ABC?',
    sectionKey: 'pmse-inicial',
    sectionTitle: '2. Actividades previas a la calibración del medidor de energía',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 2,
    label: '¿Se encuentran balanceadas las señales de corriente?',
    sectionKey: 'pmse-inicial',
    sectionTitle: '2. Actividades previas a la calibración del medidor de energía',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 3,
    label: '¿Se encuentran balanceadas las señales de voltaje?',
    sectionKey: 'pmse-inicial',
    sectionTitle: '2. Actividades previas a la calibración del medidor de energía',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 4,
    label: '¿Funciona correctamente las borneras cortocircuitables?',
    sectionKey: 'pmse-inicial',
    sectionTitle: '2. Actividades previas a la calibración del medidor de energía',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 5,
    label: '¿Es factible colocar sellos de seguridad en las borneras cortocircuitables?',
    sectionKey: 'pmse-inicial',
    sectionTitle: '2. Actividades previas a la calibración del medidor de energía',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 6,
    label: '¿Se encuentra operativa la comunicación remota con el medidor?',
    sectionKey: 'pmse-inicial',
    sectionTitle: '2. Actividades previas a la calibración del medidor de energía',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 7,
    label: '¿Se encuentra configurada pérdidas en el medidor?',
    sectionKey: 'pmse-inicial',
    sectionTitle: '2. Actividades previas a la calibración del medidor de energía',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 8,
    label: '¿En qué forma se encuentra instalado el medidor?',
    sectionKey: 'pmse-inicial',
    sectionTitle: '2. Actividades previas a la calibración del medidor de energía',
    sectionSubtitle: 'PMSE',
    source: 'manual',
    inputType: 'installationForm'
  }
];

const CENACE_MANUAL_CHECKS: ActaCheckDefinition[] = [
  {
    checkCode: 22,
    label: 'Puesta en "modo de prueba" a medidor',
    sectionKey: 'cenace-activa',
    sectionTitle: '3. Autorización de inicio de calibración - Energía activa',
    sectionSubtitle: 'CENACE',
    source: 'manual'
  },
  {
    checkCode: 31,
    label: 'Puesta en "modo de prueba" a medidor',
    sectionKey: 'cenace-reactiva',
    sectionTitle: '5. Autorización de inicio de calibración - Energía reactiva',
    sectionSubtitle: 'CENACE',
    source: 'manual'
  },
  {
    checkCode: 40,
    label: 'Deshabilitación de "modo de prueba" a medidor',
    sectionKey: 'cenace-restablecimiento',
    sectionTitle: '7. Restablecimiento de parámetros de medidor',
    sectionSubtitle: 'CENACE',
    source: 'manual'
  }
];

const PMSE_FINAL_CHECKS: ActaCheckDefinition[] = [
  {
    checkCode: 50,
    label: '¿La secuencia de fases de corriente y voltaje se encuentran como ABC?',
    sectionKey: 'pmse-final',
    sectionTitle: '8. Finalización e implementación de sellos de seguridad',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 51,
    label: '¿Se encuentran balanceadas las señales de corriente?',
    sectionKey: 'pmse-final',
    sectionTitle: '8. Finalización e implementación de sellos de seguridad',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 52,
    label: '¿Se encuentran balanceadas las señales de voltaje?',
    sectionKey: 'pmse-final',
    sectionTitle: '8. Finalización e implementación de sellos de seguridad',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 53,
    label: '¿Funciona correctamente las borneras cortocircuitables?',
    sectionKey: 'pmse-final',
    sectionTitle: '8. Finalización e implementación de sellos de seguridad',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 54,
    label: '¿Se encuentra operativa la comunicación remota con el medidor?',
    sectionKey: 'pmse-final',
    sectionTitle: '8. Finalización e implementación de sellos de seguridad',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 55,
    label: '¿Se encuentra configurada pérdidas en el medidor?',
    sectionKey: 'pmse-final',
    sectionTitle: '8. Finalización e implementación de sellos de seguridad',
    sectionSubtitle: 'PMSE',
    source: 'manual'
  },
  {
    checkCode: 56,
    label: '¿En qué forma se encuentra instalado el medidor?',
    sectionKey: 'pmse-final',
    sectionTitle: '8. Finalización e implementación de sellos de seguridad',
    sectionSubtitle: 'PMSE',
    source: 'manual',
    inputType: 'installationForm'
  }
];

@Component({
  selector: 'app-meter-calibration-acta-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    DateFieldComponent
  ],
  templateUrl: './meter-calibration-acta-drawer.html',
  styleUrl: './meter-calibration-acta-drawer.scss'
})
export class MeterCalibrationActaDrawerComponent {
  processId = input<number | null>(null);

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('datosGeneralesSection')
  private datosGeneralesSection?: ElementRef<HTMLElement>;

  @ViewChild('validacionesTecnicasSection')
  private validacionesTecnicasSection?: ElementRef<HTMLElement>;

  @ViewChild('finalizacionSection')
  private finalizacionSection?: ElementRef<HTMLElement>;

  @ViewChild('sellosSection')
  private sellosSection?: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CalibrationProcessesService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly MeterCalibrationActaCheckResult = MeterCalibrationActaCheckResult;
  readonly MeterSealType = MeterSealType;
  readonly meterInstallationFormOptions = METER_INSTALLATION_FORM_OPTIONS;

  readonly currentStep = signal<ActaStep>('acta');
  readonly activeActaSection = signal<ActaSection>('datos');
  readonly formData = signal<MeterCalibrationActaFormResponse | null>(null);
  readonly existingActa = signal<MeterCalibrationActa | null>(null);
  readonly checkDefinitions = signal<ActaCheckDefinition[]>([]);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly uploadingSealPhotoId = signal<number | null>(null);
  readonly deletingPhotoId = signal<number | null>(null);

  readonly form = this.fb.group(
    {
      pmseTechnicalDelegateName: ['', [Validators.required, Validators.maxLength(200)]],
      pmsePhone: ['', [Validators.maxLength(50)]],
      actaDate: ['', Validators.required],

      calibrationStartDateTime: ['', Validators.required],
      meterRestorationEndDateTime: ['', Validators.required],

      activeEnergyEndDateTime: [''],
      activeEnergyEventualities: ['', [Validators.maxLength(1000)]],

      reactiveEnergyEndDateTime: [''],
      reactiveEnergyEventualities: ['', [Validators.maxLength(1000)]],

      checks: this.fb.array([]),
      seals: this.fb.array([])
    },
    {
      validators: [this.energyEndDatesWithinCalibrationWindowValidator()]
    }
  );

  constructor() {
    effect(() => {
      const currentProcessId = this.processId();

      if (currentProcessId) {
        this.currentStep.set('acta');
        this.activeActaSection.set('datos');
        this.load(currentProcessId);
      }
    });
  }

  get checks(): FormArray {
    return this.form.controls.checks as FormArray;
  }

  get seals(): FormArray {
    return this.form.controls.seals as FormArray;
  }

  get sealControls() {
    return this.seals.controls;
  }

  get actaSeals(): MeterCalibrationActaSeal[] {
    return this.existingActa()?.seals ?? [];
  }

  get hasSavedActa(): boolean {
    return !!this.existingActa()?.id;
  }

  get allSavedSealsHavePhotos(): boolean {
    return this.actaSeals.length > 0 &&
      this.actaSeals.every(seal => (seal.photos?.length ?? 0) > 0);
  }

  get calibrationWindowStartDateTime(): string | null {
    return this.normalize(this.form.controls.calibrationStartDateTime.value);
  }

  get calibrationWindowEndDateTime(): string | null {
    return this.normalize(this.form.controls.meterRestorationEndDateTime.value);
  }

  get activeEnergyEndOutOfWindow(): boolean {
    return this.form.hasError('activeEnergyEndOutOfWindow');
  }

  get reactiveEnergyEndOutOfWindow(): boolean {
    return this.form.hasError('reactiveEnergyEndOutOfWindow');
  }

  get calibrationEndBeforeStart(): boolean {
    return this.form.hasError('calibrationEndBeforeStart');
  }

  get groupedChecks(): GroupedActaCheckSection[] {
    const definitions = this.checkDefinitions();
    const groups = new Map<string, GroupedActaCheckSection>();

    definitions.forEach((definition, index) => {
      if (!groups.has(definition.sectionKey)) {
        groups.set(definition.sectionKey, {
          key: definition.sectionKey,
          title: definition.sectionTitle,
          subtitle: definition.sectionSubtitle,
          source: definition.source,
          items: []
        });
      }

      const group = groups.get(definition.sectionKey)!;

      group.items.push({
        definition,
        index,
        order: group.items.length + 1
      });
    });

    return Array.from(groups.values());
  }

  getCheckGroup(index: number): FormGroup {
    return this.checks.at(index) as FormGroup;
  }

  getSealGroup(index: number): FormGroup {
    return this.seals.at(index) as FormGroup;
  }

  isInstallationFormCheck(checkCode: number): boolean {
    return METER_INSTALLATION_FORM_CODES.includes(Number(checkCode));
  }

  setCheckResult(
    index: number,
    result: MeterCalibrationActaCheckResult
  ): void {
    const control = this.getCheckGroup(index).controls['checkResult'];

    control.setValue(result);
    control.markAsDirty();
    control.markAsTouched();
  }

  isCheckResultSelected(
    index: number,
    result: MeterCalibrationActaCheckResult
  ): boolean {
    return Number(this.getCheckGroup(index).controls['checkResult'].value) === Number(result);
  }

  onInstallationFormSelected(index: number): void {
    this.getCheckGroup(index).patchValue(
      {
        checkResult: MeterCalibrationActaCheckResult.Yes
      },
      { emitEvent: false }
    );
  }

  goToActa(): void {
    if (this.isSaving() || this.uploadingSealPhotoId()) return;

    this.currentStep.set('acta');
    this.activeActaSection.set('datos');
  }

  goToPhotos(): void {
    if (this.isSaving() || this.uploadingSealPhotoId()) return;

    if (!this.hasSavedActa) {
      this.toast.warning('Primero guarda el acta para habilitar la carga de fotos.');
      return;
    }

    this.currentStep.set('photos');
  }

  goToActaSection(section: ActaSection): void {
    if (this.currentStep() !== 'acta') {
      this.currentStep.set('acta');
    }

    this.activeActaSection.set(section);

    setTimeout(() => {
      const target = this.getActaSectionElement(section);

      if (!target) return;

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  load(processId = this.processId(), goToPhotosAfterLoad = false): void {
    if (!processId) return;

    this.isLoading.set(true);

    this.service.getActaForm(processId).subscribe({
      next: response => {
        this.isLoading.set(false);

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo cargar el formulario del acta.');
          this.formData.set(null);
          this.existingActa.set(null);
          this.checkDefinitions.set([]);
          return;
        }

        this.formData.set(response.result);
        this.existingActa.set(response.result.existingActa ?? null);
        this.patchForm(response.result);

        if (goToPhotosAfterLoad) {
          this.currentStep.set('photos');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.formData.set(null);
        this.existingActa.set(null);
        this.checkDefinitions.set([]);
        this.toast.error('Error al cargar el formulario del acta.');
      }
    });
  }

  addSeal(): void {
    this.seals.push(
      this.fb.group({
        id: [null as number | null],
        sealType: [MeterSealType.MainMeter, Validators.required],
        sealCode: ['', [Validators.required, Validators.maxLength(120)]],
        sealLocation: [null as string | null],
        installedAt: [null as string | null],
        observations: [null as string | null]
      })
    );
  }

  removeSeal(index: number): void {
    if (this.isSaving()) return;

    this.seals.removeAt(index);
  }

  submitActaAndContinue(): void {
    const currentProcessId = this.processId();

    if (!currentProcessId) {
      this.toast.error('No se recibió el identificador del proceso.');
      return;
    }

    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();

      if (this.calibrationEndBeforeStart) {
        this.toast.warning('La fecha y hora de fin no puede ser anterior al inicio de calibración.');
        return;
      }

      if (this.activeEnergyEndOutOfWindow) {
        this.toast.warning('La finalización de energía activa debe estar dentro de la fecha y hora de inicio y fin del cronograma.');
        return;
      }

      if (this.reactiveEnergyEndOutOfWindow) {
        this.toast.warning('La finalización de energía reactiva debe estar dentro de la fecha y hora de inicio y fin del cronograma.');
        return;
      }

      this.toast.warning('Revisa los campos obligatorios del acta.');
      return;
    }

    if (this.seals.length === 0) {
      this.toast.warning('Registra al menos un sello colocado después de la calibración.');
      return;
    }

    const raw = this.form.getRawValue() as {
      pmseTechnicalDelegateName: string | null;
      pmsePhone: string | null;
      actaDate: string | null;

      calibrationStartDateTime: string | null;
      meterRestorationEndDateTime: string | null;

      activeEnergyEndDateTime: string | null;
      activeEnergyEventualities: string | null;

      reactiveEnergyEndDateTime: string | null;
      reactiveEnergyEventualities: string | null;

      checks: {
        checkCode: number | null;
        checkResult: MeterCalibrationActaCheckResult | number | null;
        installationForm: InstallationFormOption | string | null;
        observation: string | null;
      }[];

      seals: {
        id: number | null;
        sealType: MeterSealType | number | null;
        sealCode: string | null;
        sealLocation: string | null;
        installedAt: string | null;
        observations: string | null;
      }[];
    };

    const dto: SaveMeterCalibrationActaRequest = {
      pmseTechnicalDelegateName: this.normalizeRequired(raw.pmseTechnicalDelegateName),
      pmsePhone: this.normalize(raw.pmsePhone),
      actaDate: this.normalizeDateOnlyRequired(raw.actaDate),

      calibrationStartDateTime: this.normalizeDateTimeRequired(
        raw.calibrationStartDateTime
      ),

      meterRestorationEndDateTime: this.normalizeDateTimeRequired(
        raw.meterRestorationEndDateTime
      ),

      activeEnergyEndDateTime: this.normalizeDateTime(
        raw.activeEnergyEndDateTime
      ),
      activeEnergyEventualities: this.normalize(raw.activeEnergyEventualities),

      reactiveEnergyEndDateTime: this.normalizeDateTime(
        raw.reactiveEnergyEndDateTime
      ),
      reactiveEnergyEventualities: this.normalize(raw.reactiveEnergyEventualities),

      checks: raw.checks
        .filter(check => this.isManualCheckCode(Number(check.checkCode)))
        .map(check => ({
          checkCode: Number(check.checkCode),
          checkResult: Number(check.checkResult) as MeterCalibrationActaCheckResult,
          observation: this.isInstallationFormCheck(Number(check.checkCode))
            ? this.buildInstallationObservation(check.installationForm, check.observation)
            : this.normalize(check.observation)
        })),

      seals: raw.seals.map(seal => ({
        id: seal.id ? Number(seal.id) : null,
        sealType: Number(seal.sealType),
        sealCode: this.normalizeRequired(seal.sealCode),
        sealLocation: null,
        installedAt: null,
        observations: null
      }))
    };

    this.isSaving.set(true);

    this.service.saveActa(currentProcessId, dto).subscribe({
      next: response => {
        this.isSaving.set(false);

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo guardar el acta.');
          return;
        }

        this.toast.success('Acta guardada. Ahora puedes subir fotos por cada sello.');
        this.load(currentProcessId, true);
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error('Error al guardar el acta.');
      }
    });
  }

  onSealPhotoSelected(event: Event, seal: MeterCalibrationActaSeal): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    input.value = '';

    if (!file) return;

    const sealId = seal.id;

    if (!sealId) {
      this.toast.warning('Guarda el acta antes de subir fotos al sello.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toast.warning('Solo se permiten imágenes para fotos de sellos.');
      return;
    }

    const currentProcessId = this.processId();

    if (!currentProcessId) {
      this.toast.error('No se recibió el identificador del proceso.');
      return;
    }

    this.uploadingSealPhotoId.set(sealId);

    this.fileUploadService.upload({
      file,
      folder: 'meter-calibration-actas'
    }).subscribe({
      next: uploadResponse => {
        if (!uploadResponse.succeed || !uploadResponse.result) {
          this.uploadingSealPhotoId.set(null);
          this.toast.error(uploadResponse.message ?? 'No se pudo subir la foto del sello.');
          return;
        }

        const uploaded = uploadResponse.result;

        const dto: CreateMeterCalibrationActaSealPhotoRequest = {
          fileName: uploaded.fileName || file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
          storageKey: uploaded.relativeUrl,
          fileUrl: uploaded.absoluteUrl,
          caption: `Foto del sello ${seal.sealCode}`,
          sortOrder: (seal.photos?.length ?? 0) + 1
        };

        this.service.addActaSealPhoto(currentProcessId, sealId, dto).subscribe({
          next: response => {
            this.uploadingSealPhotoId.set(null);

            if (!response.succeed) {
              this.toast.error(response.message ?? 'No se pudo registrar la foto del sello.');
              return;
            }

            this.toast.success('Foto de sello registrada correctamente.');
            this.load(currentProcessId, true);
          },
          error: () => {
            this.uploadingSealPhotoId.set(null);
            this.toast.error('Error al registrar la foto del sello.');
          }
        });
      },
      error: () => {
        this.uploadingSealPhotoId.set(null);
        this.toast.error('Error al subir la foto del sello.');
      }
    });
  }

  deleteSealPhoto(
    seal: MeterCalibrationActaSeal,
    photo: MeterCalibrationActaSealPhoto
  ): void {
    const currentProcessId = this.processId();
    const sealId = seal.id;

    if (!currentProcessId || !sealId) return;

    this.confirmDialog.confirm({
      title: 'Eliminar foto del sello',
      message: `Se eliminará la foto "${photo.fileName}". ¿Deseas continuar?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.deletingPhotoId.set(photo.id);

      this.service.deleteActaSealPhoto(currentProcessId, sealId, photo.id).subscribe({
        next: response => {
          this.deletingPhotoId.set(null);

          if (!response.succeed) {
            this.toast.error(response.message ?? 'No se pudo eliminar la foto.');
            return;
          }

          this.toast.success('Foto eliminada correctamente.');
          this.load(currentProcessId, true);
        },
        error: () => {
          this.deletingPhotoId.set(null);
          this.toast.error('Error al eliminar la foto.');
        }
      });
    });
  }

  close(): void {
    if (this.isSaving() || this.uploadingSealPhotoId()) return;

    this.saved.emit();
    this.closed.emit();
  }

  getSealTypeLabel(type: MeterSealType | number): string {
    switch (Number(type)) {
      case MeterSealType.MainMeter:
        return 'Medidor';

      case MeterSealType.TerminalBlock:
        return 'Bornera';

      default:
        return '—';
    }
  }

  private patchForm(response: MeterCalibrationActaFormResponse): void {
    const acta = response.existingActa;
    const suggestedDate = response.suggestedActaDate ?? '';

    this.checks.clear();
    this.seals.clear();

    this.form.patchValue(
      {
        pmseTechnicalDelegateName: acta?.pmseTechnicalDelegateName ?? '',
        pmsePhone: acta?.pmsePhone ?? '',
        actaDate: this.toDateControlValue(acta?.actaDate ?? suggestedDate),

        calibrationStartDateTime: this.toDateTimeControlValue(
          acta?.calibrationStartDateTime
        ),

        meterRestorationEndDateTime: this.toDateTimeControlValue(
          acta?.meterRestorationEndDateTime
        ),

        activeEnergyEndDateTime: this.toDateTimeControlValue(
          acta?.activeEnergyEndDateTime
        ),
        activeEnergyEventualities: acta?.activeEnergyEventualities ?? '',

        reactiveEnergyEndDateTime: this.toDateTimeControlValue(
          acta?.reactiveEnergyEndDateTime
        ),
        reactiveEnergyEventualities: acta?.reactiveEnergyEventualities ?? ''
      },
      { emitEvent: false }
    );

    const definitions = this.buildCheckDefinitions();
    this.checkDefinitions.set(definitions);

    const existingChecks = acta?.checks ?? [];

    for (const definition of definitions) {
      const existing = this.findCheckByCode(existingChecks, definition.checkCode);
      const isInstallationForm = this.isInstallationFormCheck(definition.checkCode);
      const parsedInstallation = this.parseInstallationObservation(existing?.observation);

      this.checks.push(
        this.fb.group({
          checkCode: [definition.checkCode],
          checkResult: [
            isInstallationForm
              ? this.resolveInstallationFormCheckResult(existing)
              : existing?.checkResult ?? MeterCalibrationActaCheckResult.Pending,
            Validators.required
          ],
          installationForm: [
            isInstallationForm ? parsedInstallation.form : null,
            isInstallationForm ? Validators.required : []
          ],
          observation: [
            isInstallationForm
              ? parsedInstallation.observation
              : existing?.observation ?? '',
            [Validators.maxLength(500)]
          ]
        })
      );
    }

    for (const seal of acta?.seals ?? []) {
      this.seals.push(
        this.fb.group({
          id: [seal.id ?? null],
          sealType: [this.normalizeSealType(seal.sealType), Validators.required],
          sealCode: [seal.sealCode ?? '', [Validators.required, Validators.maxLength(120)]],
          sealLocation: [null as string | null],
          installedAt: [null as string | null],
          observations: [null as string | null]
        })
      );
    }

    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private getActaSectionElement(section: ActaSection): HTMLElement | null {
    switch (section) {
      case 'datos':
        return this.datosGeneralesSection?.nativeElement ?? null;

      case 'validaciones':
        return this.validacionesTecnicasSection?.nativeElement ?? null;

      case 'finalizacion':
        return this.finalizacionSection?.nativeElement ?? null;

      case 'sellos':
        return this.sellosSection?.nativeElement ?? null;
    }
  }

  private buildCheckDefinitions(): ActaCheckDefinition[] {
    return [
      ...PMSE_INITIAL_CHECKS,
      ...CENACE_MANUAL_CHECKS,
      ...PMSE_FINAL_CHECKS
    ];
  }

  private findCheckByCode(
    checks: MeterCalibrationActaCheck[],
    code: number
  ): MeterCalibrationActaCheck | undefined {
    return checks.find(check => Number(check.checkCode) === Number(code));
  }

  private resolveInstallationFormCheckResult(
    check: MeterCalibrationActaCheck | undefined
  ): MeterCalibrationActaCheckResult {
    if (!check?.observation) {
      return MeterCalibrationActaCheckResult.Yes;
    }

    return check.checkResult && Number(check.checkResult) !== MeterCalibrationActaCheckResult.Pending
      ? check.checkResult
      : MeterCalibrationActaCheckResult.Yes;
  }

  private parseInstallationObservation(
    value: string | null | undefined
  ): { form: InstallationFormOption | null; observation: string } {
    const normalized = this.normalize(value);

    if (!normalized) {
      return { form: null, observation: '' };
    }

    const form = METER_INSTALLATION_FORM_OPTIONS.find(option =>
      normalized.toUpperCase().startsWith(option)
    ) ?? null;

    if (!form) {
      return { form: null, observation: normalized };
    }

    const observation = normalized
      .replace(new RegExp(`^${form}\\s*(\\||-|–|—|:)?\\s*`, 'i'), '')
      .replace(/^Observación:\s*/i, '')
      .trim();

    return { form, observation };
  }

  private buildInstallationObservation(
    installationForm: unknown,
    observation: unknown
  ): string | null {
    const form = this.normalize(installationForm);
    const notes = this.normalize(observation);

    if (!form) return notes;

    return notes ? `${form} | ${notes}` : form;
  }

  private normalizeSealType(type: MeterSealType | number | null | undefined): MeterSealType {
    return Number(type) === MeterSealType.TerminalBlock
      ? MeterSealType.TerminalBlock
      : MeterSealType.MainMeter;
  }

  private toDateControlValue(value: string | null | undefined): string {
    const normalized = this.normalize(value);

    return normalized ? normalized.substring(0, 10) : '';
  }

  private toDateTimeControlValue(value: string | null | undefined): string {
    return this.normalizeDateTime(value) ?? '';
  }

  private normalizeDateOnlyRequired(value: unknown): string {
    const normalized = this.normalizeRequired(value);

    return normalized.substring(0, 10);
  }

  private normalizeDateTimeRequired(value: unknown): string {
    return this.normalizeDateTime(value) ?? '';
  }

  private normalizeDateTime(value: unknown): string | null {
    const normalized = this.normalize(value);

    if (!normalized || normalized.length < 10) return null;

    const datePart = normalized.substring(0, 10);
    const timePart = normalized.match(/[T\s](\d{2}:\d{2})/)?.[1] ?? '00:00';

    return `${datePart}T${timePart}`;
  }

  private energyEndDatesWithinCalibrationWindowValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const start = this.parseDateTimeForComparison(
        control.get('calibrationStartDateTime')?.value
      );

      const end = this.parseDateTimeForComparison(
        control.get('meterRestorationEndDateTime')?.value
      );

      const activeEnergyEnd = this.parseDateTimeForComparison(
        control.get('activeEnergyEndDateTime')?.value
      );

      const reactiveEnergyEnd = this.parseDateTimeForComparison(
        control.get('reactiveEnergyEndDateTime')?.value
      );

      const errors: ValidationErrors = {};

      if (start && end && end < start) {
        errors['calibrationEndBeforeStart'] = true;
      }

      if (
        start &&
        end &&
        activeEnergyEnd &&
        (activeEnergyEnd < start || activeEnergyEnd > end)
      ) {
        errors['activeEnergyEndOutOfWindow'] = true;
      }

      if (
        start &&
        end &&
        reactiveEnergyEnd &&
        (reactiveEnergyEnd < start || reactiveEnergyEnd > end)
      ) {
        errors['reactiveEnergyEndOutOfWindow'] = true;
      }

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }

  private parseDateTimeForComparison(value: unknown): Date | null {
    const normalized = this.normalize(value);

    if (!normalized) return null;

    const match = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/
    );

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4] ?? '0');
    const minute = Number(match[5] ?? '0');

    const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

  private isManualCheckCode(checkCode: number): boolean {
    return (checkCode >= 1 && checkCode <= 8) ||
      CENACE_MANUAL_CHECK_CODES.includes(checkCode) ||
      (checkCode >= 50 && checkCode <= 56);
  }
}