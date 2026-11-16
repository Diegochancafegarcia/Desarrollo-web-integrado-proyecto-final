import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApoderadoService } from '../../core/services/apoderado.service';
import { AuthService } from '../../core/services/auth.service';
import { ApoderadoResponse } from '../../core/models/apoderado.models';

@Component({
  selector: 'app-apoderados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './apoderados.component.html',
  styleUrls: ['./apoderados.component.css']
})
export class ApoderadosComponent implements OnInit {
  apoderadoService = inject(ApoderadoService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  apoderados = signal<ApoderadoResponse[]>([]);
  isLoading = signal<boolean>(false);
  filtroTexto = signal<string>('');

  // Alertas
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  // Modal Crear
  modalAbierto = signal<boolean>(false);
  guardando = signal<boolean>(false);

  apoderadoForm = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    documento: ['', [Validators.required, Validators.maxLength(20)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    telefono: ['', [Validators.maxLength(25)]],
    password: ['Colegio2026*', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit(): void {
    this.cargarApoderados();
  }

  cargarApoderados(): void {
    this.isLoading.set(true);
    this.apoderadoService.getApoderados().subscribe({
      next: (data) => {
        this.apoderados.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.mensajeError.set(err.error?.message || 'Error al cargar apoderados.');
      }
    });
  }

  get apoderadosFiltrados(): ApoderadoResponse[] {
    const texto = this.filtroTexto().toLowerCase().trim();
    if (!texto) return this.apoderados();
    return this.apoderados().filter((a) =>
      a.nombres.toLowerCase().includes(texto) ||
      a.apellidos.toLowerCase().includes(texto) ||
      a.documento.toLowerCase().includes(texto) ||
      a.correo.toLowerCase().includes(texto)
    );
  }

  abrirModalCrear(): void {
    this.apoderadoForm.reset({
      nombres: '',
      apellidos: '',
      documento: '',
      correo: '',
      telefono: '',
      password: 'Colegio2026*'
    });
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (this.apoderadoForm.invalid) {
      this.apoderadoForm.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set(null);

    const val = this.apoderadoForm.value;
    this.apoderadoService.registrarNuevoApoderado({
      nombres: val.nombres!,
      apellidos: val.apellidos!,
      documento: val.documento!,
      correo: val.correo!,
      telefono: val.telefono || undefined,
      password: val.password || 'Colegio2026*'
    }).subscribe({
      next: (nuevo) => {
        this.guardando.set(false);
        this.mensajeExito.set(`Apoderado ${nuevo.nombres} ${nuevo.apellidos} registrado exitosamente con usuario de acceso.`);
        this.cerrarModal();
        this.cargarApoderados();
      },
      error: (err) => {
        this.guardando.set(false);
        const detalle = err.error?.details ? ` (${err.error.details.join(', ')})` : '';
        this.mensajeError.set((err.error?.message || 'Error al registrar apoderado.') + detalle);
      }
    });
  }
}