import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatriculaService } from '../../core/services/matricula.service';
import { AlumnoService } from '../../core/services/alumno.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AuthService } from '../../core/services/auth.service';
import { MatriculaResponse, MatriculaRequest } from '../../core/models/matricula.models';
import { AlumnoResponse } from '../../core/models/alumno.models';
import { AulaResponse } from '../../core/models/academico.models';

@Component({
  selector: 'app-matriculas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './matriculas.component.html',
  styleUrls: ['./matriculas.component.css']
})
export class MatriculasComponent implements OnInit {
  matriculaService = inject(MatriculaService);
  alumnoService = inject(AlumnoService);
  academicoService = inject(AcademicoService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  matriculas = signal<MatriculaResponse[]>([]);
  alumnos = signal<AlumnoResponse[]>([]);
  aulas = signal<AulaResponse[]>([]);
  isLoading = signal<boolean>(false);
  modalAbierto = signal<boolean>(false);

  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  matForm = this.fb.group({
    alumnoId: [null as number | null, [Validators.required]],
    aulaId: [null as number | null, [Validators.required]]
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading.set(true);
    this.matriculaService.getMatriculas().subscribe({
      next: (data) => {
        this.matriculas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.alumnoService.getAlumnos().subscribe({
      next: (data) => this.alumnos.set(data.filter(a => a.estado === 'ACTIVO')),
      error: () => {}
    });

    this.academicoService.getAulas().subscribe({
      next: (data) => this.aulas.set(data),
      error: () => {}
    });
  }

  abrirModal(): void {
    this.matForm.reset({ alumnoId: null, aulaId: null });
    this.mensajeError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (this.matForm.invalid) {
      this.matForm.markAllAsTouched();
      return;
    }

    const payload: MatriculaRequest = {
      alumnoId: Number(this.matForm.value.alumnoId),
      aulaId: Number(this.matForm.value.aulaId)
    };

    this.matriculaService.createMatricula(payload).subscribe({
      next: (nueva) => {
        this.mensajeExito.set(`Alumno ${nueva.alumno} matriculado exitosamente en ${nueva.grado} "${nueva.seccion}".`);
        this.cerrarModal();
        this.cargarDatos();
      },
      error: (err) => {
        this.mensajeError.set(err.error?.message || 'Error al procesar matrícula.');
      }
    });
  }
}