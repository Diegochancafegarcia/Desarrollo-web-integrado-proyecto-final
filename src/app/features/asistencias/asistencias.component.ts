import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { AuthService } from '../../core/services/auth.service';
import { AsistenciaRequest, AsistenciaResponse, EstadoAsistencia } from '../../core/models/asistencia.models';
import { CursoResponse, AulaResponse, AsignacionResponse } from '../../core/models/academico.models';
import { MatriculaResponse } from '../../core/models/matricula.models';

function getFechaLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencias.component.html',
  styleUrls: ['./asistencias.component.css']
})
export class AsistenciasComponent implements OnInit {
  asistenciaService = inject(AsistenciaService);
  academicoService = inject(AcademicoService);
  matriculaService = inject(MatriculaService);
  authService = inject(AuthService);

  // Datos base
  cursos = signal<CursoResponse[]>([]);
  aulas = signal<AulaResponse[]>([]);
  asignaciones = signal<AsignacionResponse[]>([]);
  matriculas = signal<MatriculaResponse[]>([]);
  asistencias = signal<AsistenciaResponse[]>([]);

  // Selección activa del flujo jerárquico (Paso 1 -> Paso 2 -> Paso 3)
  cursoSeleccionado = signal<CursoResponse | null>(null);
  aulaSeleccionada = signal<AulaResponse | null>(null);
  fecha = signal<string>(getFechaLocal());

  // Filtros
  filtroTexto = signal<string>('');

  // Modales y estados
  alumnoHistorial = signal<MatriculaResponse | null>(null);
  historialAsistencias = signal<AsistenciaResponse[]>([]);
  cargandoHistorial = signal<boolean>(false);

  alumnoObservacion = signal<MatriculaResponse | null>(null);
  textoObservacion = signal<string>('');

  // Estados de carga y mensajes
  cargando = signal<boolean>(false);
  guardandoAlumnoId = signal<number | null>(null);
  marcandoTodos = signal<boolean>(false);
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  isDocente(): boolean {
    return this.authService.hasRole('DOCENTE') && !this.authService.hasAnyRole(['ADMIN', 'DIRECTOR']);
  }

  // Asignaciones del docente logueado
  asignacionesDocente = computed(() => {
    if (!this.isDocente()) return [];
    const user = this.authService.currentUser();
    if (!user) return [];
    const normApellidos = normalizar(user.apellidos);
    return this.asignaciones().filter(a => normalizar(a.docente).includes(normApellidos));
  });

  // PASO 1: Cursos disponibles para mostrar en las tarjetas
  cursosDisponibles = computed(() => {
    if (!this.isDocente()) {
      return this.cursos();
    }
    const misCursoIds = new Set(this.asignacionesDocente().map(a => a.cursoId));
    return this.cursos().filter(c => misCursoIds.has(c.id));
  });

  // PASO 2: Aulas donde se dicta el curso seleccionado
  aulasDisponibles = computed(() => {
    const curso = this.cursoSeleccionado();
    if (!curso) return [];

    let asigs = this.asignaciones();
    if (this.isDocente()) {
      asigs = this.asignacionesDocente();
    }

    const aulaIdsDelCurso = new Set(
      asigs.filter(a => a.cursoId === curso.id).map(a => a.aulaId)
    );

    return this.aulas().filter(au => aulaIdsDelCurso.has(au.id));
  });

  // PASO 3: Estudiantes del aula seleccionada filtrados por texto
  alumnosDelAula = computed(() => {
    const aula = this.aulaSeleccionada();
    if (!aula) return [];

    let list = this.matriculas().filter(m => m.aulaId === aula.id);
    const q = normalizar(this.filtroTexto());
    if (q) {
      list = list.filter(m =>
        normalizar(m.alumno).includes(q) || normalizar(m.codigoAlumno).includes(q)
      );
    }
    return list;
  });

  // Mapa de asistencias indexado por matriculaId para acceso instantáneo O(1)
  asistenciasMap = computed(() => {
    const mapa = new Map<number, AsistenciaResponse>();
    for (const a of this.asistencias()) {
      mapa.set(a.matriculaId, a);
    }
    return mapa;
  });

  // Resumen del día (KPIs en vivo)
  resumenDia = computed(() => {
    const aula = this.aulaSeleccionada();
    if (!aula) {
      return { total: 0, asistio: 0, tardanza: 0, falta: 0, justificada: 0, sinMarcar: 0, porcentaje: 0 };
    }

    const todosMatriculados = this.matriculas().filter(m => m.aulaId === aula.id);
    const total = todosMatriculados.length;
    const mapa = this.asistenciasMap();

    let asistio = 0;
    let tardanza = 0;
    let falta = 0;
    let justificada = 0;

    for (const m of todosMatriculados) {
      const reg = mapa.get(m.id);
      if (reg) {
        if (reg.estado === 'ASISTIO') asistio++;
        else if (reg.estado === 'TARDANZA') tardanza++;
        else if (reg.estado === 'FALTA') falta++;
        else if (reg.estado === 'JUSTIFICADA') justificada++;
      }
    }

    const marcados = asistio + tardanza + falta + justificada;
    const sinMarcar = total - marcados;
    const porcentaje = total > 0 ? Math.round(((asistio + tardanza) / total) * 100) : 0;

    return { total, asistio, tardanza, falta, justificada, sinMarcar, porcentaje };
  });

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.cargando.set(true);

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
      next: (data) => {
        this.matriculas.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  irAPaso1(): void {
    this.irAPaso(1);
  }

  // Navegación del Wizard
  irAPaso(paso: number): void {
    if (paso === 1) {
      this.cursoSeleccionado.set(null);
      this.aulaSeleccionada.set(null);
      this.asistencias.set([]);
    } else if (paso === 2) {
      this.aulaSeleccionada.set(null);
      this.asistencias.set([]);
    }
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
  }

  seleccionarCurso(curso: CursoResponse): void {
    this.cursoSeleccionado.set(curso);
    this.aulaSeleccionada.set(null);
    this.asistencias.set([]);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
  }

  seleccionarAula(aula: AulaResponse): void {
    this.aulaSeleccionada.set(aula);
    this.filtroTexto.set('');
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
    this.consultarAsistencias();
  }

  consultarAsistencias(): void {
    const aula = this.aulaSeleccionada();
    const f = this.fecha();
    if (!aula || !f) return;

    this.cargando.set(true);
    this.asistenciaService.getAsistencias(f, aula.id).subscribe({
      next: (data) => {
        this.asistencias.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.asistencias.set([]);
        this.cargando.set(false);
        this.mensajeError.set(err.error?.message || 'Error al consultar asistencia.');
      }
    });
  }

  getAsistenciaAlumno(matriculaId: number): AsistenciaResponse | undefined {
    return this.asistenciasMap().get(matriculaId);
  }

  marcarAsistencia(m: MatriculaResponse, estado: EstadoAsistencia, observacion?: string): void {
    this.guardandoAlumnoId.set(m.id);
    const asistActual = this.getAsistenciaAlumno(m.id);

    const payload: AsistenciaRequest = {
      matriculaId: m.id,
      fecha: this.fecha(),
      estado,
      observacion: observacion !== undefined ? observacion : asistActual?.observacion
    };

    this.asistenciaService.registrarAsistencia(payload).subscribe({
      next: (res) => {
        const filtrados = this.asistencias().filter(a => a.matriculaId !== m.id);
        this.asistencias.set([...filtrados, res]);
        this.guardandoAlumnoId.set(null);
      },
      error: (err) => {
        this.guardandoAlumnoId.set(null);
        this.mensajeError.set(err.error?.message || 'Error al guardar asistencia.');
      }
    });
  }

  marcarTodosAsistio(): void {
    const aula = this.aulaSeleccionada();
    if (!aula) return;
    const alumnos = this.matriculas().filter(m => m.aulaId === aula.id);
    if (alumnos.length === 0) return;

    this.marcandoTodos.set(true);
    let pendientes = alumnos.length;

    alumnos.forEach(m => {
      const payload: AsistenciaRequest = {
        matriculaId: m.id,
        fecha: this.fecha(),
        estado: 'ASISTIO'
      };
      this.asistenciaService.registrarAsistencia(payload).subscribe({
        next: () => {
          pendientes--;
          if (pendientes === 0) {
            this.marcandoTodos.set(false);
            this.mensajeExito.set('Se marcó ASISTIÓ a todos los estudiantes de la sección.');
            this.consultarAsistencias();
          }
        },
        error: () => {
          pendientes--;
          if (pendientes === 0) {
            this.marcandoTodos.set(false);
            this.consultarAsistencias();
          }
        }
      });
    });
  }

  // Navegación de fechas
  cambiarFecha(dias: number): void {
    const partes = this.fecha().split('-').map(Number);
    const d = new Date(partes[0], partes[1] - 1, partes[2]);
    d.setDate(d.getDate() + dias);

    // No permitir fecha futura
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (d > hoy) return;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    this.fecha.set(`${y}-${m}-${day}`);
    this.consultarAsistencias();
  }

  irAHoy(): void {
    this.fecha.set(getFechaLocal());
    this.consultarAsistencias();
  }

  irAAyer(): void {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    this.fecha.set(`${y}-${m}-${day}`);
    this.consultarAsistencias();
  }

  esFechaFutura(): boolean {
    const partes = this.fecha().split('-').map(Number);
    const sel = new Date(partes[0], partes[1] - 1, partes[2]);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return sel >= hoy;
  }

  // Modal Observación
  abrirModalObservacion(m: MatriculaResponse): void {
    this.alumnoObservacion.set(m);
    const asist = this.getAsistenciaAlumno(m.id);
    this.textoObservacion.set(asist?.observacion || '');
  }

  guardarObservacion(): void {
    const m = this.alumnoObservacion();
    if (!m) return;
    const asist = this.getAsistenciaAlumno(m.id);
    const estado: EstadoAsistencia = asist ? asist.estado : 'ASISTIO';
    this.marcarAsistencia(m, estado, this.textoObservacion());
    this.alumnoObservacion.set(null);
  }

  // Modal Historial
  abrirModalHistorial(m: MatriculaResponse): void {
    this.alumnoHistorial.set(m);
    this.cargandoHistorial.set(true);
    this.asistenciaService.getAsistenciasPorMatricula(m.id).subscribe({
      next: (data) => {
        this.historialAsistencias.set(data);
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.historialAsistencias.set([]);
        this.cargandoHistorial.set(false);
      }
    });
  }

  cerrarModalHistorial(): void {
    this.alumnoHistorial.set(null);
    this.historialAsistencias.set([]);
  }

  // Estadísticas del historial del alumno
  resumenHistorialAlumno = computed(() => {
    const hist = this.historialAsistencias();
    const total = hist.length;
    let asistio = 0, tardanza = 0, falta = 0, justificada = 0;
    for (const h of hist) {
      if (h.estado === 'ASISTIO') asistio++;
      else if (h.estado === 'TARDANZA') tardanza++;
      else if (h.estado === 'FALTA') falta++;
      else if (h.estado === 'JUSTIFICADA') justificada++;
    }
    const porcentaje = total > 0 ? Math.round(((asistio + tardanza) / total) * 100) : 0;
    return { total, asistio, tardanza, falta, justificada, porcentaje };
  });

  // Aulas asignadas para un curso
  getAulasDeCurso(cursoId: number): string[] {
    let asigs = this.asignaciones();
    if (this.isDocente()) {
      asigs = this.asignacionesDocente();
    }
    return asigs
      .filter(a => a.cursoId === cursoId)
      .map(a => a.aula);
  }

  // Total de alumnos de un aula
  getTotalAlumnosAula(aulaId: number): number {
    return this.matriculas().filter(m => m.aulaId === aulaId).length;
  }

  getBadgeClass(estado: EstadoAsistencia): string {
    switch (estado) {
      case 'ASISTIO': return 'bg-success text-white';
      case 'TARDANZA': return 'bg-warning text-dark';
      case 'FALTA': return 'bg-danger text-white';
      case 'JUSTIFICADA': return 'bg-info text-dark';
      default: return 'bg-secondary text-white';
    }
  }
}
