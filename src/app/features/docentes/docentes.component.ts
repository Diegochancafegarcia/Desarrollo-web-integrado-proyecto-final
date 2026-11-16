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
    usuarioId: [1, [Validators.required]],
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

  abrirModalEditar(d: DocenteResponse): void {
    this.docenteEditando.set(d);
    this.docenteForm.patchValue({
      usuarioId: d.usuarioId,
      codigoDocente: d.codigoDocente,
      especialidad: d.especialidad || '',
      telefono: d.telefono || ''
    });
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
    if (!d) return;

    const payload: DocenteRequest = {
      usuarioId: d.usuarioId,
      codigoDocente: this.docenteForm.value.codigoDocente!,
      especialidad: this.docenteForm.value.especialidad || undefined,
      telefono: this.docenteForm.value.telefono || undefined
    };

    this.docenteService.updateDocente(d.id, payload).subscribe({
      next: (actualizado) => {
        this.mensajeExito.set(`Docente ${actualizado.nombres} actualizado correctamente.`);
        this.cerrarModal();
        this.cargarDocentes();
      },
      error: (err) => {
        this.mensajeError.set(err.error?.message || 'Error al actualizar docente.');
      }
    });
  }
}