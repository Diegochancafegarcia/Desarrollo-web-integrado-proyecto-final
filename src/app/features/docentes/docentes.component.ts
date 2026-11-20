import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DocenteService } from '../../core/services/docente.service';
import { AuthService } from '../../core/services/auth.service';
import { DocenteResponse, DocenteRequest } from '../../core/models/docente.models';

@Component({
  selector: 'app-docentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './docentes.component.html',
  styleUrls: ['./docentes.component.css']
})
export class DocentesComponent implements OnInit {
  docenteService = inject(DocenteService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  docentes = signal<DocenteResponse[]>([]);
  isLoading = signal<boolean>(false);
  filtroTexto = signal<string>('');

  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  modalAbierto = signal<boolean>(false);
  docenteEditando = signal<DocenteResponse | null>(null);

  docenteForm = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    password: ['Colegio2026*', [Validators.required, Validators.minLength(8)]],
    codigoDocente: ['', [Validators.required, Validators.maxLength(20)]],
    especialidad: ['', [Validators.maxLength(100)]],
    telefono: ['', [Validators.maxLength(25)]]
  });

  ngOnInit(): void {
    this.cargarDocentes();
  }

  cargarDocentes(): void {
    this.isLoading.set(true);
    this.docenteService.getDocentes().subscribe({
      next: (data) => {
        this.docentes.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.mensajeError.set(err.error?.message || 'Error al cargar docentes.');
      }
    });
  }

  get docentesFiltrados(): DocenteResponse[] {
    const texto = this.filtroTexto().toLowerCase().trim();
    if (!texto) return this.docentes();
    return this.docentes().filter((d) =>
      d.nombres.toLowerCase().includes(texto) ||
      d.apellidos.toLowerCase().includes(texto) ||
      d.codigoDocente.toLowerCase().includes(texto) ||
      (d.especialidad && d.especialidad.toLowerCase().includes(texto))
    );
  }

  abrirModalCrear(): void {
    this.docenteEditando.set(null);
    const sugerido = `DOC-2026-00${this.docentes().length + 1}`;
    this.docenteForm.reset({
      nombres: '',
      apellidos: '',
      correo: '',
      password: 'Colegio2026*',
      codigoDocente: sugerido,
      especialidad: 'Educación Primaria',
      telefono: ''
    });
    this.docenteForm.get('correo')?.enable();
    this.docenteForm.get('nombres')?.enable();
    this.docenteForm.get('apellidos')?.enable();
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.modalAbierto.set(true);
  }

  abrirModalEditar(d: DocenteResponse): void {
    this.docenteEditando.set(d);
    this.docenteForm.patchValue({
      nombres: d.nombres,
      apellidos: d.apellidos,
      correo: d.correo,
      password: '••••••••',
      codigoDocente: d.codigoDocente,
      especialidad: d.especialidad || '',
      telefono: d.telefono || ''
    });
    // Al editar solo se modifican datos profesionales del docente
    this.docenteForm.get('correo')?.disable();
    this.docenteForm.get('nombres')?.disable();
    this.docenteForm.get('apellidos')?.disable();
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (this.docenteForm.invalid) {
      this.docenteForm.markAllAsTouched();
      return;
    }

    const d = this.docenteEditando();

    if (d) {
      // Modo Edición
      const payload: DocenteRequest = {
        usuarioId: d.usuarioId,
        codigoDocente: this.docenteForm.value.codigoDocente!.trim().toUpperCase(),
        especialidad: this.docenteForm.value.especialidad ? this.docenteForm.value.especialidad.trim() : undefined,
        telefono: this.docenteForm.value.telefono ? this.docenteForm.value.telefono.trim() : undefined
      };

      this.docenteService.updateDocente(d.id, payload).subscribe({
        next: (actualizado) => {
          this.mensajeExito.set(`Docente ${actualizado.nombres} ${actualizado.apellidos} actualizado correctamente.`);
          this.cerrarModal();
          this.cargarDocentes();
        },
        error: (err) => {
          this.mensajeError.set(err.error?.message || 'Error al actualizar docente.');
        }
      });
    } else {
      // Modo Creación
      const nuevoPayload = {
        nombres: this.docenteForm.getRawValue().nombres!,
        apellidos: this.docenteForm.getRawValue().apellidos!,
        correo: this.docenteForm.getRawValue().correo!,
        password: this.docenteForm.getRawValue().password || 'Colegio2026*',
        codigoDocente: this.docenteForm.getRawValue().codigoDocente!,
        especialidad: this.docenteForm.getRawValue().especialidad || undefined,
        telefono: this.docenteForm.getRawValue().telefono || undefined
      };

      this.docenteService.crearDocenteConUsuario(nuevoPayload).subscribe({
        next: (creado) => {
          this.mensajeExito.set(`Docente ${creado.nombres} ${creado.apellidos} registrado exitosamente con acceso a la intranet.`);
          this.cerrarModal();
          this.cargarDocentes();
        },
        error: (err) => {
          this.mensajeError.set(err.error?.message || 'Error al registrar el docente.');
        }
      });
    }
  }
}