import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { AuthService } from '../../core/services/auth.service';
import { CursoResponse, CursoRequest, AsignacionResponse } from '../../core/models/academico.models';
import { MatriculaResponse } from '../../core/models/matricula.models';

function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cursos.component.html',
  styleUrls: ['./cursos.component.css']
})
export class CursosComponent implements OnInit {
  academicoService = inject(AcademicoService);
  matriculaService = inject(MatriculaService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  cursos = signal<CursoResponse[]>([]);
  asignaciones = signal<AsignacionResponse[]>([]);
  matriculas = signal<MatriculaResponse[]>([]);
  cursoSeleccionado = signal<CursoResponse | null>(null);

  isLoading = signal<boolean>(false);
  modalAbierto = signal<boolean>(false);
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  cursoForm = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]]
  });

  isDocente(): boolean {
    return this.authService.hasRole('DOCENTE') && !this.authService.hasAnyRole(['ADMIN', 'DIRECTOR']);
  }

  asignacionesDocente = computed(() => {
    if (!this.isDocente()) return [];
    const user = this.authService.currentUser();
    if (!user) return [];
    const normApellidos = normalizar(user.apellidos);
    return this.asignaciones().filter(a => normalizar(a.docente).includes(normApellidos));
  });

  cursosAMostrar = computed(() => {
    if (!this.isDocente()) {
      return this.cursos();
    }
    const misCursoIds = new Set(this.asignacionesDocente().map(a => a.cursoId));
    return this.cursos().filter(c => misCursoIds.has(c.id));
  });

  // Alumnos en las aulas donde se dicta el curso seleccionado
  alumnosDelCurso = computed(() => {
    const curso = this.cursoSeleccionado();
    if (!curso) return [];

    let aulaIds: number[] = [];
    if (this.isDocente()) {
      aulaIds = this.asignacionesDocente()
        .filter(a => a.cursoId === curso.id)
        .map(a => a.aulaId);
    } else {
      aulaIds = this.asignaciones()
        .filter(a => a.cursoId === curso.id)
        .map(a => a.aulaId);
    }

    const setAulas = new Set(aulaIds);
    return this.matriculas().filter(m => setAulas.has(m.aulaId));
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading.set(true);
    this.academicoService.getCursos().subscribe({
      next: (data) => {
        this.cursos.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.academicoService.getAsignaciones().subscribe({
      next: (data) => this.asignaciones.set(data),
      error: () => {}
    });

    this.matriculaService.getMatriculas().subscribe({
      next: (data) => this.matriculas.set(data),
      error: () => {}
    });
  }

  seleccionarCurso(curso: CursoResponse): void {
    if (this.cursoSeleccionado()?.id === curso.id) {
      this.cursoSeleccionado.set(null);
    } else {
      this.cursoSeleccionado.set(curso);
    }
  }

  getAsignacionesDeCurso(cursoId: number): AsignacionResponse[] {
    if (this.isDocente()) {
      return this.asignacionesDocente().filter(a => a.cursoId === cursoId);
    }
    return this.asignaciones().filter(a => a.cursoId === cursoId);
  }

  abrirModal(): void {
    this.cursoForm.reset({ codigo: '', nombre: '' });
    this.mensajeError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (this.cursoForm.invalid) {
      this.cursoForm.markAllAsTouched();
      return;
    }

    const payload: CursoRequest = {
      codigo: this.cursoForm.value.codigo!,
      nombre: this.cursoForm.value.nombre!
    };

    this.academicoService.createCurso(payload).subscribe({
      next: (nuevo) => {
        this.mensajeExito.set(`Curso ${nuevo.nombre} creado con éxito.`);
        this.cerrarModal();
        this.cargarDatos();
      },
      error: (err) => {
        this.mensajeError.set(err.error?.message || 'Error al registrar curso.');
      }
    });
  }
}