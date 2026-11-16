import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicoService } from '../../core/services/academico.service';
import { AuthService } from '../../core/services/auth.service';
import { AulaResponse, AulaRequest, GradoResponse, AnioLectivoResponse } from '../../core/models/academico.models';

@Component({
  selector: 'app-aulas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './aulas.component.html',
  styleUrls: ['./aulas.component.css']
})
export class AulasComponent implements OnInit {
  academicoService = inject(AcademicoService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  aulas = signal<AulaResponse[]>([]);
  grados = signal<GradoResponse[]>([]);
  anios = signal<AnioLectivoResponse[]>([]);
  isLoading = signal<boolean>(false);
  modalAbierto = signal<boolean>(false);

  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  aulaForm = this.fb.group({
    gradoId: [null as number | null, [Validators.required]],
    anioLectivoId: [null as number | null, [Validators.required]],
    seccion: ['', [Validators.required, Validators.maxLength(5)]],
    capacidad: [25, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading.set(true);
    this.academicoService.getAulas().subscribe({
      next: (data) => {
        this.aulas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.academicoService.getGrados().subscribe({
      next: (data) => this.grados.set(data),
      error: () => {}
    });

    this.academicoService.getAniosLectivos().subscribe({
      next: (data) => this.anios.set(data),
      error: () => {}
    });
  }

  abrirModal(): void {
    const anioActivo = this.anios().find(a => a.activo)?.id || null;
    this.aulaForm.reset({
      gradoId: this.grados()[0]?.id || null,
      anioLectivoId: anioActivo,
      seccion: 'A',
      capacidad: 25
    });
    this.mensajeError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (this.aulaForm.invalid) {
      this.aulaForm.markAllAsTouched();
      return;
    }

    const payload: AulaRequest = {
      gradoId: Number(this.aulaForm.value.gradoId),
      anioLectivoId: Number(this.aulaForm.value.anioLectivoId),
      seccion: this.aulaForm.value.seccion!.toUpperCase(),
      capacidad: Number(this.aulaForm.value.capacidad)
    };

    this.academicoService.createAula(payload).subscribe({
      next: (nueva) => {
        this.mensajeExito.set(`Aula ${nueva.grado} - "${nueva.seccion}" registrada.`);
        this.cerrarModal();
        this.cargarDatos();
      },
      error: (err) => {
        this.mensajeError.set(err.error?.message || 'Error al crear aula.');
      }
    });
  }
}