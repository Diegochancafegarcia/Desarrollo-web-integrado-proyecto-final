import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CalificacionService } from '../../core/services/calificacion.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AuthService } from '../../core/services/auth.service';
import { CalificacionRequest, CalificacionResponse } from '../../core/models/calificacion.models';
import { MatriculaResponse } from '../../core/models/matricula.models';
import { CursoResponse, AulaResponse, AsignacionResponse } from '../../core/models/academico.models';

function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Datos globales
  cursos = signal<CursoResponse[]>([]);
  aulas = signal<AulaResponse[]>([]);
  asignaciones = signal<AsignacionResponse[]>([]);
  matriculas = signal<MatriculaResponse[]>([]);

  // Estados de navegación jerárquica (Drill-Down)
  cursoSeleccionado = signal<CursoResponse | null>(null);
  aulaSeleccionada = signal<AulaResponse | null>(null);
  matriculaSeleccionada = signal<MatriculaResponse | null>(null);

  // Calificaciones del alumno seleccionado
  notasAlumno = signal<CalificacionResponse[]>([]);
  cargandoNotas = signal<boolean>(false);

  // Filtro de búsqueda en la lista de alumnos
  filtroAlumnoTexto = signal<string>('');

  // Mensajes de alerta
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  // Chips de tipo de evaluación rápida
  tiposEvaluacion = ['Examen Bimestral', 'Práctica Calificada', 'Tarea / Proyecto', 'Participación Oral', 'Examen de Recuperación'];
  tipoSeleccionado = signal<string>('Examen Bimestral');

  calForm = this.fb.group({
    periodo: [1, [Validators.required, Validators.min(1), Validators.max(4)]],
    nota: [null as number | null, [Validators.required, Validators.min(0), Validators.max(20)]],
    observacion: ['Examen Bimestral', [Validators.maxLength(200)]]
  });

  isDocente(): boolean {
    return this.authService.hasRole('DOCENTE') && !this.authService.hasAnyRole(['ADMIN', 'DIRECTOR']);
  }

  asignacionesDocente = computed(() => {
    if (!this.isDocente()) return [];
    const user = this.authService.currentUser();
    if (!user) return [];
    const normApellidos = normalizar(user.apellidos);
    return this.asignaciones().filter((a) => normalizar(a.docente).includes(normApellidos));
  });

  cursosDisponibles = computed(() => {
    if (!this.isDocente()) {
      return this.cursos();
    }
    const misCursoIds = new Set(this.asignacionesDocente().map((a) => a.cursoId));
    return this.cursos().filter((c) => misCursoIds.has(c.id));
  });

  aulasDelCurso = computed(() => {
    const curso = this.cursoSeleccionado();
    if (!curso) return [];

    let asigs = this.asignaciones().filter((a) => a.cursoId === curso.id);
    if (this.isDocente()) {
      const user = this.authService.currentUser();
      if (user) {
        const normApellidos = normalizar(user.apellidos);
        asigs = asigs.filter((a) => normalizar(a.docente).includes(normApellidos));
      }
    }

    const aulaIds = new Set(asigs.map((a) => a.aulaId));
    return this.aulas().filter((au) => aulaIds.has(au.id));
  });

  alumnosDelAula = computed(() => {
    const aula = this.aulaSeleccionada();
    if (!aula) return [];

    let lista = this.matriculas().filter((m) => m.aulaId === aula.id && m.estado === 'ACTIVA');
    const q = this.filtroAlumnoTexto().toLowerCase().trim();
    if (q) {
      lista = lista.filter((m) => m.alumno.toLowerCase().includes(q) || m.codigoAlumno.toLowerCase().includes(q));
    }
    return lista;
  });

  notasDelCursoActual = computed(() => {
    const curso = this.cursoSeleccionado();
    if (!curso) return [];
    return this.notasAlumno()
      .filter((n) => n.cursoId === curso.id)
      .sort((a, b) => a.periodo - b.periodo);
  });

  promedioCurso = computed(() => {
    const notas = this.notasDelCursoActual();
    if (notas.length === 0) return null;
    const suma = notas.reduce((acc, curr) => acc + curr.nota, 0);
    return Number((suma / notas.length).toFixed(2));
  });

  // Determinar si para el periodo seleccionado en el formulario ya existe una nota guardada
  notaExistenteEnPeriodo = computed(() => {
    const periodoActual = Number(this.calForm.value.periodo);
    return this.notasDelCursoActual().find((n) => n.periodo === periodoActual) || null;
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.academicoService.getCursos().subscribe({
      next: (data) => this.cursos.set(data),
      error: () => {}
    });

    this.academicoService.getAulas().subscribe({
      next: (data) => this.aulas.set(data),
      error: () => {}
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

  // Métodos de navegación paso a paso
  seleccionarCurso(c: CursoResponse): void {
    this.cursoSeleccionado.set(c);
    this.aulaSeleccionada.set(null);
    this.matriculaSeleccionada.set(null);
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
  }

  seleccionarAula(a: AulaResponse): void {
    this.aulaSeleccionada.set(a);
    this.matriculaSeleccionada.set(null);
    this.filtroAlumnoTexto.set('');
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
  }

  seleccionarAlumno(m: MatriculaResponse): void {
    this.matriculaSeleccionada.set(m);
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.cargarNotasAlumno(m.alumnoId);
  }

  irAPaso(paso: number): void {
    if (paso === 1) {
      this.cursoSeleccionado.set(null);
      this.aulaSeleccionada.set(null);
      this.matriculaSeleccionada.set(null);
    } else if (paso === 2) {
      this.aulaSeleccionada.set(null);
      this.matriculaSeleccionada.set(null);
    } else if (paso === 3) {
      this.matriculaSeleccionada.set(null);
    }
  }

  cargarNotasAlumno(alumnoId: number): void {
    this.cargandoNotas.set(true);
    this.calificacionService.getCalificacionesByAlumno(alumnoId).subscribe({
      next: (notas) => {
        this.notasAlumno.set(notas);
        this.cargandoNotas.set(false);
        this.autoSeleccionarSiguientePeriodo();
      },
      error: (err) => {
        this.notasAlumno.set([]);
        this.cargandoNotas.set(false);
        this.mensajeError.set(err.error?.message || 'Error al obtener calificaciones del alumno.');
      }
    });
  }

  autoSeleccionarSiguientePeriodo(): void {
    const notas = this.notasDelCursoActual();
    const periodosCalificados = new Set(notas.map((n) => n.periodo));
    let siguientePeriodo = 1;
    for (let p = 1; p <= 4; p++) {
      if (!periodosCalificados.has(p)) {
        siguientePeriodo = p;
        break;
      }
    }
    this.cambiarPeriodo(siguientePeriodo);
  }

  cambiarPeriodo(periodo: number): void {
    this.calForm.patchValue({ periodo });
    const existente = this.notasDelCursoActual().find((n) => n.periodo === periodo);
    if (existente) {
      this.calForm.patchValue({
        nota: existente.nota,
        observacion: existente.observacion || ''
      });
    } else {
      this.calForm.patchValue({
        nota: null,
        observacion: this.tipoSeleccionado()
      });
    }
  }

  seleccionarTipo(tipo: string): void {
    this.tipoSeleccionado.set(tipo);
    const notaActual = this.notaExistenteEnPeriodo();
    if (!notaActual) {
      this.calForm.patchValue({ observacion: tipo });
    } else {
      const obs = this.calForm.value.observacion || '';
      if (!obs.includes(tipo)) {
        this.calForm.patchValue({ observacion: tipo + ' - ' + obs });
      }
    }
  }

  getNotaDePeriodo(periodo: number): CalificacionResponse | undefined {
    return this.notasDelCursoActual().find((n) => n.periodo === periodo);
  }

  guardarNota(): void {
    if (this.calForm.invalid) {
      this.calForm.markAllAsTouched();
      return;
    }

    const m = this.matriculaSeleccionada();
    const c = this.cursoSeleccionado();
    if (!m || !c) return;

    const periodo = Number(this.calForm.value.periodo);
    const nota = Number(this.calForm.value.nota);
    const observacion = this.calForm.value.observacion || undefined;
    const existente = this.notaExistenteEnPeriodo();

    if (existente) {
      // Modo Actualización
      this.calificacionService.actualizarCalificacion(existente.id, { nota, observacion }).subscribe({
        next: (actualizada) => {
          this.mensajeExito.set(`Nota de Bimestre ${actualizada.periodo} actualizada a ${actualizada.nota} en ${actualizada.curso}.`);
          this.mensajeError.set(null);
          this.cargarNotasAlumno(m.alumnoId);
        },
        error: (err) => {
          this.mensajeExito.set(null);
          this.mensajeError.set(err.error?.message || 'Error al actualizar calificación.');
        }
      });
    } else {
      // Modo Registro Nuevo
      const payload: CalificacionRequest = {
        matriculaId: m.id,
        cursoId: c.id,
        periodo,
        nota,
        observacion
      };

      this.calificacionService.registrarCalificacion(payload).subscribe({
        next: (nueva) => {
          this.mensajeExito.set(`Calificación de ${nueva.nota} registrada con éxito en Bimestre ${nueva.periodo} (${nueva.curso}).`);
          this.mensajeError.set(null);
          this.cargarNotasAlumno(m.alumnoId);
        },
        error: (err) => {
          this.mensajeExito.set(null);
          const detalle = err.error?.details ? ` (${err.error.details.join(', ')})` : '';
          this.mensajeError.set((err.error?.message || 'Error al registrar calificación.') + detalle);
        }
      });
    }
  }
}
