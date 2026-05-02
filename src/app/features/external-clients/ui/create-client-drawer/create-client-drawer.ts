import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Output } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DrawerActionsComponent } from '../../../../shared/components/drawer-actions/drawer-actions';
import { ToastService } from '../../../../core/services/toast.service';

import { ExternalClientsService } from '../../data-access/external-clients.service';
import {
  CreateExternalClientRequest,
  ExternalClient
} from '../../domain/external-client.model';

@Component({
  selector: 'app-create-client-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    DrawerActionsComponent
  ],
  templateUrl: './create-client-drawer.html',
  styleUrl: './create-client-drawer.scss'
})
export class CreateClientDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ExternalClientsService);
  private readonly toast = inject(ToastService);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<ExternalClient>();

  loading = false;
  createdClient: ExternalClient | null = null;

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(150)]],
    contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    publicKey: ['', [Validators.required, Validators.minLength(80)]]
  });

  get hasCredentials(): boolean {
    return !!this.createdClient?.clientId && !!this.createdClient?.clientSecret;
  }

  get saveDisabled(): boolean {
    return this.loading || this.form.invalid;
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const dto: CreateExternalClientRequest = {
      displayName: this.form.controls.displayName.value.trim(),
      contactEmail: this.form.controls.contactEmail.value.trim(),
      publicKey: this.form.controls.publicKey.value.trim()
    };

    this.loading = true;

    this.service.create(dto).subscribe({
      next: response => {
        this.loading = false;

        if (!response.succeed || !response.result) {
          this.toast.error(response.message ?? 'No se pudo crear el cliente externo.');
          return;
        }

        this.createdClient = response.result;
        this.created.emit(response.result);

        this.toast.success('Cliente externo creado correctamente.');
      },
      error: () => {
        this.loading = false;
        this.toast.error('Ocurrió un error al crear el cliente externo.');
      }
    });
  }

  copy(value: string | null | undefined, label: string): void {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      this.toast.success(`${label} copiado al portapapeles.`, 2500);
    });
  }

  close(): void {
    this.form.reset();
    this.createdClient = null;
    this.loading = false;
    this.closed.emit();
  }
}