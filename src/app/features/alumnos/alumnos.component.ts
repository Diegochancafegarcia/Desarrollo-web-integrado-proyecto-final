import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AlumnoService } from '../../core/services/alumno.service';
import { ApoderadoService } from '../../core/services/apoderado.service';
import { CalificacionService } from '../../core/services/calificacion.service';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AlumnoResponse,
  AlumnoRequest,
  Sexo,
  VincularApoderadoRequest
} from '../../core/models/alumno.models';
import { ApoderadoResponse } from '../../core/models/apoderado.models';
import { CalificacionResponse } from '../../core/models/calificacion.models';
import { AsistenciaResponse, EstadoAsistencia } from '../../core/models/asistencia.models';
import { AsignacionResponse, GradoResponse, AulaResponse, CursoResponse } from '../../core/models/academico.models';
import { MatriculaResponse } from '../../core/models/matricula.models';

function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface BloqueHorario {
  hora: string;
  lunes: string;
  martes: string;
  miercoles: string;
  jueves: string;
  viernes: string;
  esRecreo?: boolean;
}

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './alumnos.component.html',
  styleUrls: ['./alumnos.component.css']
})
export class AlumnosComponent implements OnInit {
  alumnoService = inject(AlumnoService);
  apoderadoService = inject(ApoderadoService);
  calificacionService = inject(CalificacionService);
  asistenciaService = inject(AsistenciaService);
  academicoService = inject(AcademicoService);
  matriculaService = inject(MatriculaService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  alumnos = signal<AlumnoResponse[]>([]);
  apoderados = signal<ApoderadoResponse[]>([]);
  matriculas = signal<MatriculaResponse[]>([]);
  asignaciones = signal<AsignacionResponse[]>([]);
  grados = signal<GradoResponse[]>([]);
  aulas = signal<AulaResponse[]>([]);
  cursos = signal<CursoResponse[]>([]);
  isLoading = signal<boolean>(false);

  // Filtros combinados para ADMIN / DOCENTE
  filtroTexto = signal<string>('');
  filtroGradoId = signal<number | null>(null);
  filtroAulaId = signal<number | null>(null);
  filtroCursoId = signal<number | null>(null);

  // ==========================================
  // ESTADOS PARA EL PORTAL DEL APODERADO
  // ==========================================
  hijoSeleccionado = signal<AlumnoResponse | null>(null);
  tabApoderado = signal<'notas' | 'asistencia' | 'cursos' | 'horario'>('notas');

  notasHijo = signal<CalificacionResponse[]>([]);
  cargandoNotasHijo = signal<boolean>(false);

  asistenciasHijo = signal<AsistenciaResponse[]>([]);
  cargandoAsistenciasHijo = signal<boolean>(false);

  isDocente(): boolean {
    return this.authService.hasRole('DOCENTE') && !this.authService.hasAnyRole(['ADMIN', 'DIRECTOR']);
  }

  isApoderado(): boolean {
    return this.authService.hasRole('APODERADO');
  }

  asignacionesDocente = computed(() => {
    if (!this.isDocente()) return [];
    const user = this.authService.currentUser();
    if (!user) return [];
    const normApellidos = normalizar(user.apellidos);
    return this.asignaciones().filter(a => normalizar(a.docente).includes(normApellidos));
  });

  aulasDisponibles = computed(() => {
    let lista = this.aulas();
    if (this.isDocente()) {
      const misAulas = new Set(this.asignacionesDocente().map(a => a.aulaId));
      lista = lista.filter(au => misAulas.has(au.id));
    }
    return lista;
  });

  cursosDisponibles = computed(() => {
    let lista = this.cursos();
    if (this.isDocente()) {
      const misCursos = new Set(this.asignacionesDocente().map(a => a.cursoId));
      lista = lista.filter(c => misCursos.has(c.id));
    }
    return lista;
  });

  // Mapa de matrícula por alumnoId
  matriculaMap = computed(() => {
    const mapa = new Map<number, MatriculaResponse>();
    for (const m of this.matriculas()) {
      mapa.set(m.alumnoId, m);
    }
    return mapa;
  });

  // Lista de alumnos filtrados (para Admin/Docente)
  alumnosFiltrados = computed(() => {
    let resultado = this.alumnos();
    const matMap = this.matriculaMap();

    if (this.isDocente()) {
      const aulasDocente = new Set(this.asignacionesDocente().map(a => a.aulaId));
      resultado = resultado.filter(al => {
        const mat = matMap.get(al.id);
        return mat && aulasDocente.has(mat.aulaId);
      });
    }

    if (this.filtroGradoId()) {
      const grado = this.grados().find(g => g.id === this.filtroGradoId());
      if (grado) {
        resultado = resultado.filter(al => {
          const mat = matMap.get(al.id);
          return mat && mat.grado === grado.nombre;
        });
      }
    }

    if (this.filtroAulaId()) {
      resultado = resultado.filter(al => {
        const mat = matMap.get(al.id);
        return mat && mat.aulaId === this.filtroAulaId();
      });
    }

    if (this.filtroCursoId()) {
      const cursoId = this.filtroCursoId();
      const aulasConCurso = new Set(
        this.asignaciones().filter(a => a.cursoId === cursoId).map(a => a.aulaId)
      );
      resultado = resultado.filter(al => {
        const mat = matMap.get(al.id);
        return mat && aulasConCurso.has(mat.aulaId);
      });
    }

    const texto = normalizar(this.filtroTexto());
    if (texto) {
      resultado = resultado.filter(al =>
        normalizar(al.codigoAlumno).includes(texto) ||
        normalizar(al.nombres).includes(texto) ||
        normalizar(al.apellidos).includes(texto)
      );
    }

    return resultado;
  });

  // ==========================================
  // COMPUTEDS PARA EL HIJO SELECCIONADO (APODERADO)
  // ==========================================
  matriculaHijo = computed(() => {
    const hijo = this.hijoSeleccionado();
    if (!hijo) return null;
    return this.matriculas().find(m => m.alumnoId === hijo.id) || null;
  });

  aulaHijo = computed(() => {
    const mat = this.matriculaHijo();
    if (!mat) return null;
    return this.aulas().find(a => a.id === mat.aulaId) || null;
  });

  cursosHijo = computed(() => {
    const mat = this.matriculaHijo();
    if (!mat) return [];
    const asigs = this.asignaciones().filter(a => a.aulaId === mat.aulaId);
    return asigs.map(a => {
      const cursoObj = this.cursos().find(c => c.id === a.cursoId);
      return {
        asignacionId: a.id,
        cursoId: a.cursoId,
        cursoNombre: a.curso,
        cursoCodigo: cursoObj ? cursoObj.codigo : 'CUR',
        docente: a.docente,
        aula: a.aula
      };
    });
  });

  notasPorCursoHijo = computed(() => {
    const cursos = this.cursosHijo();
    const notas = this.notasHijo();

    return cursos.map(c => {
      const notasCurso = notas.filter(n => n.cursoId === c.cursoId);
      const n1 = notasCurso.find(n => n.periodo === 1);
      const n2 = notasCurso.find(n => n.periodo === 2);
      const n3 = notasCurso.find(n => n.periodo === 3);
      const n4 = notasCurso.find(n => n.periodo === 4);

      const notasValidas = [n1, n2, n3, n4].filter(n => n !== undefined).map(n => n!.nota);
      const promedio = notasValidas.length > 0
        ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1)
        : '--';

      return {
        cursoId: c.cursoId,
        cursoCodigo: c.cursoCodigo,
        cursoNombre: c.cursoNombre,
        docente: c.docente,
        b1: n1 ? n1.nota : null,
        b1Obs: n1 ? n1.observacion : null,
        b2: n2 ? n2.nota : null,
        b2Obs: n2 ? n2.observacion : null,
        b3: n3 ? n3.nota : null,
        b3Obs: n3 ? n3.observacion : null,
        b4: n4 ? n4.nota : null,
        b4Obs: n4 ? n4.observacion : null,
        promedio
      };
    });
  });

  promedioGeneralHijo = computed(() => {
    const cursos = this.notasPorCursoHijo();
    const promsValidos = cursos
      .map(c => parseFloat(c.promedio))
      .filter(p => !isNaN(p));
    if (promsValidos.length === 0) return '--';
    return (promsValidos.reduce((a, b) => a + b, 0) / promsValidos.length).toFixed(1);
  });

  resumenAsistenciaHijo = computed(() => {
    const list = this.asistenciasHijo();
    const total = list.length;
    let asistio = 0, tardanza = 0, falta = 0, justificada = 0;
    for (const a of list) {
      if (a.estado === 'ASISTIO') asistio++;
      else if (a.estado === 'TARDANZA') tardanza++;
      else if (a.estado === 'FALTA') falta++;
      else if (a.estado === 'JUSTIFICADA') justificada++;
    }
    const porcentaje = total > 0 ? Math.round(((asistio + tardanza) / total) * 100) : 0;
    return { total, asistio, tardanza, falta, justificada, porcentaje };
  });

  // Generación del horario semanal escolar para el aula del hijo
  horarioSemanalHijo = computed((): BloqueHorario[] => {
    const cursos = this.cursosHijo();
    const getCurso = (idx: number) => cursos[idx % (cursos.length || 1)]?.cursoNombre || 'Tutoría Escolar';

    return [
      {
        hora: '08:00 - 09:30',
        lunes: getCurso(0),
        martes: getCurso(1),
        miercoles: getCurso(0),
        jueves: getCurso(2),
        viernes: getCurso(3)
      },
      {
        hora: '09:30 - 10:15',
        lunes: getCurso(0),
        martes: getCurso(1),
        miercoles: getCurso(4),
        jueves: getCurso(2),
        viernes: getCurso(5)
      },
      {
        hora: '10:15 - 10:45',
        lunes: 'RECREO / LONCHERA',
        martes: 'RECREO / LONCHERA',
        miercoles: 'RECREO / LONCHERA',
        jueves: 'RECREO / LONCHERA',
        viernes: 'RECREO / LONCHERA',
        esRecreo: true
      },
      {
        hora: '10:45 - 12:00',
        lunes: getCurso(1),
        martes: getCurso(2),
        miercoles: getCurso(3),
        jueves: getCurso(0),
        viernes: 'Tutoría y Convivencia'
      },
      {
        hora: '12:00 - 13:00',
        lunes: getCurso(3),
        martes: getCurso(4),
        miercoles: getCurso(3),
        jueves: getCurso(1),
        viernes: getCurso(2)
      }
    ];
  });

  // Formularios Modales Admin
  modalAbierto = signal<boolean>(false);
  modoEdicion = signal<boolean>(false);
  alumnoSeleccionado = signal<AlumnoResponse | null>(null);

  modalVincularAbierto = signal<boolean>(false);
  alumnoParaVincular = signal<AlumnoResponse | null>(null);

  modalNotasAbierto = signal<boolean>(false);
  alumnoSeleccionadoNotas = signal<AlumnoResponse | null>(null);
  notasAlumno = signal<CalificacionResponse[]>([]);
  cargandoNotas = signal<boolean>(false);

  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  alumnoForm = this.fb.group({
    codigoAlumno: ['', [Validators.required, Validators.maxLength(20)]],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    fechaNacimiento: ['', [Validators.required]],
    sexo: ['M' as Sexo, [Validators.required]]
  });

  vincularForm = this.fb.group({
    apoderadoId: [null as number | null, [Validators.required]],
    parentesco: ['', [Validators.required, Validators.maxLength(40)]],
    contactoPrincipal: [true]
  });

  ngOnInit(): void {
    this.cargarAlumnos();
    this.cargarDatosAcademicos();
    if (this.authService.hasRole('ADMIN')) {
      this.cargarApoderados();
    }
  }

  cargarAlumnos(): void {
    this.isLoading.set(true);
    const peticion = this.authService.hasRole('APODERADO')
      ? this.alumnoService.getMisAlumnos()
      : this.alumnoService.getAlumnos();

    peticion.subscribe({
      next: (data) => {
        this.alumnos.set(data);
        this.isLoading.set(false);
        if (this.isApoderado() && data.length > 0) {
          this.seleccionarHijo(data[0]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.mensajeError.set(err.error?.message || 'Error al cargar alumnos desde la base de datos.');
      }
    });
  }

  cargarDatosAcademicos(): void {
    this.matriculaService.getMatriculas().subscribe({
      next: (data) => this.matriculas.set(data),
      error: () => {}
    });
    this.academicoService.getGrados().subscribe({
      next: (data) => this.grados.set(data),
      error: () => {}
    });
    this.academicoService.getAulas().subscribe({
      next: (data) => this.aulas.set(data),
      error: () => {}
    });
    this.academicoService.getCursos().subscribe({
      next: (data) => this.cursos.set(data),
      error: () => {}
    });
    this.academicoService.getAsignaciones().subscribe({
      next: (data) => this.asignaciones.set(data),
      error: () => {}
    });
  }

  cargarApoderados(): void {
    this.apoderadoService.getApoderados().subscribe({
      next: (data) => this.apoderados.set(data),
      error: () => {}
    });
  }

  // ==========================================
  // METODOS DEL PORTAL FAMILIAR (APODERADO)
  // ==========================================
  seleccionarHijo(hijo: AlumnoResponse): void {
    this.hijoSeleccionado.set(hijo);
    this.cargarDetalleHijo(hijo);
  }

  cargarDetalleHijo(hijo: AlumnoResponse): void {
    this.cargandoNotasHijo.set(true);
    this.calificacionService.getCalificacionesByAlumno(hijo.id).subscribe({
      next: (data: CalificacionResponse[]) => {
        this.notasHijo.set(data);
        this.cargandoNotasHijo.set(false);
      },
      error: () => this.cargandoNotasHijo.set(false)
    });

    this.cargandoAsistenciasHijo.set(true);
    this.asistenciaService.getAsistenciasPorAlumno(hijo.id).subscribe({
      next: (data: AsistenciaResponse[]) => {
        this.asistenciasHijo.set(data);
        this.cargandoAsistenciasHijo.set(false);
      },
      error: () => this.cargandoAsistenciasHijo.set(false)
    });
  }

  setTabApoderado(tab: 'notas' | 'asistencia' | 'cursos' | 'horario'): void {
    this.tabApoderado.set(tab);
  }

  // Modales Admin
  abrirModalCrear(): void {
    this.modoEdicion.set(false);
    this.alumnoSeleccionado.set(null);
    this.alumnoForm.reset({ sexo: 'M' });
    this.modalAbierto.set(true);
  }

  abrirModalEditar(alumno: AlumnoResponse): void {
    this.modoEdicion.set(true);
    this.alumnoSeleccionado.set(alumno);
    this.alumnoForm.patchValue({
      codigoAlumno: alumno.codigoAlumno,
      nombres: alumno.nombres,
      apellidos: alumno.apellidos,
      fechaNacimiento: alumno.fechaNacimiento,
      sexo: alumno.sexo
    });
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.alumnoForm.reset();
  }

  guardar(): void {
    if (this.alumnoForm.invalid) {
      this.alumnoForm.markAllAsTouched();
      return;
    }

    const payload: AlumnoRequest = {
      codigoAlumno: this.alumnoForm.value.codigoAlumno!,
      nombres: this.alumnoForm.value.nombres!,
      apellidos: this.alumnoForm.value.apellidos!,
      fechaNacimiento: this.alumnoForm.value.fechaNacimiento!,
      sexo: this.alumnoForm.value.sexo!
    };

    if (this.modoEdicion() && this.alumnoSeleccionado()) {
      this.alumnoService.updateAlumno(this.alumnoSeleccionado()!.id, payload).subscribe({
        next: (res) => {
          this.mensajeExito.set(`Alumno ${res.nombres} actualizado correctamente.`);
          this.cargarAlumnos();
          this.cerrarModal();
        },
        error: (err) => {
          this.mensajeError.set(err.error?.message || 'Error al actualizar el alumno.');
        }
      });
    } else {
      this.alumnoService.createAlumno(payload).subscribe({
        next: (res) => {
          this.mensajeExito.set(`Alumno ${res.nombres} registrado con éxito.`);
          this.cargarAlumnos();
          this.cerrarModal();
        },
        error: (err) => {
          this.mensajeError.set(err.error?.message || 'Error al registrar el alumno en MySQL.');
        }
      });
    }
  }

  eliminar(alumno: AlumnoResponse): void {
    if (confirm(`¿Está seguro de eliminar al alumno ${alumno.nombres} ${alumno.apellidos}?`)) {
      this.alumnoService.deleteAlumno(alumno.id).subscribe({
        next: () => {
          this.mensajeExito.set('Alumno eliminado del sistema.');
          this.cargarAlumnos();
        },
        error: (err) => {
          this.mensajeError.set(err.error?.message || 'Error al eliminar el alumno.');
        }
      });
    }
  }

  abrirModalVincular(alumno: AlumnoResponse): void {
    this.alumnoParaVincular.set(alumno);
    this.vincularForm.reset({ contactoPrincipal: true });
    this.modalVincularAbierto.set(true);
  }

  cerrarModalVincular(): void {
    this.modalVincularAbierto.set(false);
    this.alumnoParaVincular.set(null);
  }

  vincular(): void {
    if (this.vincularForm.invalid || !this.alumnoParaVincular()) {
      this.vincularForm.markAllAsTouched();
      return;
    }

    const payload: VincularApoderadoRequest = {
      apoderadoId: Number(this.vincularForm.value.apoderadoId),
      parentesco: this.vincularForm.value.parentesco!,
      contactoPrincipal: this.vincularForm.value.contactoPrincipal!
    };

    this.alumnoService.vincularApoderado(this.alumnoParaVincular()!.id, payload).subscribe({
      next: () => {
        this.mensajeExito.set('Apoderado vinculado con éxito.');
        this.cargarAlumnos();
        this.cerrarModalVincular();
      },
      error: (err) => {
        this.mensajeError.set(err.error?.message || 'Error al vincular apoderado.');
      }
    });
  }

  abrirModalNotas(alumno: AlumnoResponse): void {
    this.alumnoSeleccionadoNotas.set(alumno);
    this.modalNotasAbierto.set(true);
    this.cargandoNotas.set(true);
    this.calificacionService.getCalificacionesByAlumno(alumno.id).subscribe({
      next: (data: CalificacionResponse[]) => {
        this.notasAlumno.set(data);
        this.cargandoNotas.set(false);
      },
      error: () => this.cargandoNotas.set(false)
    });
  }

  cerrarModalNotas(): void {
    this.modalNotasAbierto.set(false);
    this.alumnoSeleccionadoNotas.set(null);
    this.notasAlumno.set([]);
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

  getNotaClass(nota: number | null): string {
    if (nota === null) return 'text-muted';
    if (nota >= 14) return 'text-success fw-bold';
    if (nota >= 11) return 'text-primary fw-bold';
    return 'text-danger fw-bold';
  }
}
