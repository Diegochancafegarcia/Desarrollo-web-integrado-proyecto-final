import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CalificacionService } from '../../core/services/calificacion.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AlumnoService } from '../../core/services/alumno.service';
import { AuthService } from '../../core/services/auth.service';
import { CalificacionRequest, CalificacionResponse } from '../../core/models/calificacion.models';
import { MatriculaResponse } from '../../core/models/matricula.models';
import { CursoResponse } from '../../core/models/academico.models';
import { AlumnoResponse } from '../../core/models/alumno.models';

@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './calificaciones.component.html',
  styleUrls: ['./calificaciones.component.css']
})
export class CalificacionesComponent implements OnInit {
  calificacionService = inject(CalificacionService);
  matriculaService = inject(MatriculaService);
  academicoService = inject(AcademicoService);
  alumnoService = inject(AlumnoService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  matriculas = signal<MatriculaResponse[]>([]);
  cursos = signal<CursoResponse[]>([]);
  alumnos = signal<AlumnoResponse[]>([]);

  // Consulta por alumno
  alumnoSeleccionadoId = signal<number | null>(null);
  calificacionesAlumno = signal<CalificacionResponse[]>([]);
  cargandoConsultas = signal<boolean>(false);

  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  calForm = this.fb.group({
    matriculaId: [null as number | null, [Validators.required]],
    cursoId: [null as number | null, [Validators.required]],
    periodo: [1, [Validators.required, Validators.min(1), Validators.max(4)]],
    nota: [null as number | null, [Validators.required, Validators.min(0), Validators.max(20)]],
    observacion: ['', [Validators.maxLength(200)]]
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.matriculaService.getMatriculas().subscribe({
      next: (data) => this.matriculas.set(data),
      error: () => {}
    });

    this.academicoService.getCursos().subscribe({
      next: (data) => this.cursos.set(data),
      error: () => {}
    });

    this.alumnoService.getAlumnos().subscribe({
      next: (data) => this.alumnos.set(data),
      error: () => {}
    });
  }

  guardarNota(): void {
    if (this.calForm.invalid) {
      this.calForm.markAllAsTouched();
      return;
    }

    const payload: CalificacionRequest = {
      matriculaId: Number(this.calForm.value.matriculaId),
      cursoId: Number(this.calForm.value.cursoId),
      periodo: Number(this.calForm.value.periodo),
      nota: Number(this.calForm.value.nota),
      observacion: this.calForm.value.observacion || undefined
    };

    this.calificacionService.registrarCalificacion(payload).subscribe({
      next: (res) => {
        this.mensajeExito.set(`Calificación de ${res.nota} registrada con éxito en ${res.curso}.`);
        this.mensajeError.set(null);
        this.calForm.patchValue({ nota: null, observacion: '' });
        // Si el alumno consultado coincide, refrescar notas
        if (this.alumnoSeleccionadoId() === res.alumnoId) {
          this.consultarNotasAlumno(res.alumnoId);
        }
      },
      error: (err) => {
        this.mensajeExito.set(null);
        const detalle = err.error?.details ? ` (${err.error.details.join(', ')})` : '';
        this.mensajeError.set((err.error?.message || 'Error al registrar la calificación.') + detalle);
      }
    });
  }

  consultarNotasAlumno(alumnoId: number): void {
    this.alumnoSeleccionadoId.set(alumnoId);
    this.cargandoConsultas.set(true);
    this.calificacionService.getCalificacionesByAlumno(alumnoId).subscribe({
      next: (data) => {
        this.calificacionesAlumno.set(data);
        this.cargandoConsultas.set(false);
      },
      error: (err) => {
        this.calificacionesAlumno.set([]);
        this.cargandoConsultas.set(false);
        this.mensajeError.set(err.error?.message || 'No se pudieron obtener las notas.');
      }
    });
  }
}