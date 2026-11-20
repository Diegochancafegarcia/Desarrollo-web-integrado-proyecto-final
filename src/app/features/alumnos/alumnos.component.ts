import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AlumnoService } from '../../core/services/alumno.service';
import { ApoderadoService } from '../../core/services/apoderado.service';
import { CalificacionService } from '../../core/services/calificacion.service';
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
import { AsignacionResponse, GradoResponse, AulaResponse, CursoResponse } from '../../core/models/academico.models';
import { MatriculaResponse } from '../../core/models/matricula.models';

function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

  // Filtros combinados
  filtroTexto = signal<string>('');
  filtroGradoId = signal<number | null>(null);
  filtroAulaId = signal<number | null>(null);
  filtroCursoId = signal<number | null>(null);

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

  aulasDisponibles = computed(() => {
    let lista = this.aulas();
    if (this.isDocente()) {
      const misAulas = new Set(this.asignacionesDocente().map(a => a.aulaId));
      lista = lista.filter(a => misAulas.has(a.id));
    }
    const gradoId = this.filtroGradoId();
    if (gradoId) {
      lista = lista.filter(a => a.gradoId === gradoId);
    }
    return lista;
  });

  cursosDisponibles = computed(() => {
    if (!this.isDocente()) return this.cursos();
    const misCursos = new Set(this.asignacionesDocente().map(a => a.cursoId));
    return this.cursos().filter(c => misCursos.has(c.id));
  });

  tieneFiltrosActivos = computed(() => {
    return !!this.filtroTexto() || !!this.filtroGradoId() || !!this.filtroAulaId() || !!this.filtroCursoId();
  });

  // Mensajes de alerta
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  // Modal Crear/Editar Alumno
  modalAlumnoAbierto = signal<boolean>(false);
  editandoId = signal<number | null>(null);

  alumnoForm = this.fb.group({
    codigoAlumno: ['', [Validators.required, Validators.maxLength(20)]],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    fechaNacimiento: ['', [Validators.required]],
    sexo: ['M' as Sexo, [Validators.required]]
  });

  // Modal Vincular Apoderado
  modalVincularAbierto = signal<boolean>(false);
  alumnoParaVincular = signal<AlumnoResponse | null>(null);

  vincularForm = this.fb.group({
    apoderadoId: [null as number | null, [Validators.required]],
    parentesco: ['', [Validators.required, Validators.maxLength(40)]],
    contactoPrincipal: [true]
  });

  // Modal Ver Notas
  modalNotasAbierto = signal<boolean>(false);
  alumnoSeleccionadoNotas = signal<AlumnoResponse | null>(null);
  notasAlumno = signal<CalificacionResponse[]>([]);
  cargandoNotas = signal<boolean>(false);

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

  getMatriculaAlumno(alumnoId: number): MatriculaResponse | undefined {
    return this.matriculas().find((m) => m.alumnoId === alumnoId && m.estado === 'ACTIVA');
  }

  getCursosAlumno(alumnoId: number): string[] {
    const mat = this.getMatriculaAlumno(alumnoId);
    if (!mat) return [];
    const cursosEnAula = this.asignaciones()
      .filter((a) => a.aulaId === mat.aulaId)
      .map((a) => a.curso);
    return Array.from(new Set(cursosEnAula));
  }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroGradoId.set(null);
    this.filtroAulaId.set(null);
    this.filtroCursoId.set(null);
  }

  get alumnosFiltrados(): AlumnoResponse[] {
    let lista = this.alumnos();

    // Si es docente, filtrar solo los alumnos matriculados en las aulas que dicho docente tiene asignadas
    if (this.isDocente()) {
      const aulaIdsDocente = new Set(this.asignacionesDocente().map((a) => a.aulaId));
      if (aulaIdsDocente.size > 0 && this.matriculas().length > 0) {
        const alumnoIdsEnMisAulas = new Set(
          this.matriculas()
            .filter((m) => aulaIdsDocente.has(m.aulaId))
            .map((m) => m.alumnoId)
        );
        lista = lista.filter((a) => alumnoIdsEnMisAulas.has(a.id));
      }
    }

    // Filtro por Grado
    const gradoId = this.filtroGradoId();
    if (gradoId) {
      const aulaIdsDeGrado = new Set(this.aulas().filter((a) => a.gradoId === gradoId).map((a) => a.id));
      const alumnoIdsEnGrado = new Set(
        this.matriculas().filter((m) => aulaIdsDeGrado.has(m.aulaId)).map((m) => m.alumnoId)
      );
      lista = lista.filter((a) => alumnoIdsEnGrado.has(a.id));
    }

    // Filtro por Aula / Sección
    const aulaId = this.filtroAulaId();
    if (aulaId) {
      const alumnoIdsEnAula = new Set(
        this.matriculas().filter((m) => m.aulaId === aulaId).map((m) => m.alumnoId)
      );
      lista = lista.filter((a) => alumnoIdsEnAula.has(a.id));
    }

    // Filtro por Curso
    const cursoId = this.filtroCursoId();
    if (cursoId) {
      const aulaIdsConCurso = new Set(
        this.asignaciones().filter((asig) => asig.cursoId === cursoId).map((asig) => asig.aulaId)
      );
      const alumnoIdsConCurso = new Set(
        this.matriculas().filter((m) => aulaIdsConCurso.has(m.aulaId)).map((m) => m.alumnoId)
      );
      lista = lista.filter((a) => alumnoIdsConCurso.has(a.id));
    }

    // Filtro de texto (búsqueda)
    const texto = this.filtroTexto().toLowerCase().trim();
    if (!texto) return lista;
    return lista.filter((a) =>
      a.nombres.toLowerCase().includes(texto) ||
      a.apellidos.toLowerCase().includes(texto) ||
      a.codigoAlumno.toLowerCase().includes(texto)
    );
  }

  abrirModalCrear(): void {
    this.editandoId.set(null);
    this.alumnoForm.reset({
      codigoAlumno: '',
      nombres: '',
      apellidos: '',
      fechaNacimiento: '',
      sexo: 'M'
    });
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.modalAlumnoAbierto.set(true);
  }

  abrirModalEditar(alumno: AlumnoResponse): void {
    this.editandoId.set(alumno.id);
    this.alumnoForm.patchValue({
      codigoAlumno: alumno.codigoAlumno,
      nombres: alumno.nombres,
      apellidos: alumno.apellidos,
      fechaNacimiento: alumno.fechaNacimiento,
      sexo: alumno.sexo
    });
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.modalAlumnoAbierto.set(true);
  }

  cerrarModalAlumno(): void {
    this.modalAlumnoAbierto.set(false);
  }

  guardarAlumno(): void {
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

    const id = this.editandoId();
    if (id) {
      // Actualizar
      this.alumnoService.updateAlumno(id, payload).subscribe({
        next: (alumnoActualizado) => {
          this.mensajeExito.set(`Alumno ${alumnoActualizado.nombres} actualizado correctamente.`);
          this.cerrarModalAlumno();
          this.cargarAlumnos();
        },
        error: (err) => {
          this.mensajeError.set(err.error?.message || 'Error al actualizar el alumno.');
        }
      });
    } else {
      // Registrar
      this.alumnoService.createAlumno(payload).subscribe({
        next: (nuevoAlumno) => {
          this.mensajeExito.set(`Alumno ${nuevoAlumno.nombres} ${nuevoAlumno.apellidos} registrado con éxito.`);
          this.cerrarModalAlumno();
          this.cargarAlumnos();
        },
        error: (err) => {
          const detalle = err.error?.details ? ` (${err.error.details.join(', ')})` : '';
          this.mensajeError.set((err.error?.message || 'Error al registrar el alumno.') + detalle);
        }
      });
    }
  }

  eliminarAlumno(alumno: AlumnoResponse): void {
    if (confirm(`¿Está seguro de dar de baja lógica al alumno ${alumno.nombres} ${alumno.apellidos}? Su estado pasará a RETIRADO.`)) {
      this.alumnoService.deleteAlumno(alumno.id).subscribe({
        next: () => {
          this.mensajeExito.set(`Alumno ${alumno.nombres} dado de baja (RETIRADO).`);
          this.cargarAlumnos();
        },
        error: (err) => {
          this.mensajeError.set(err.error?.message || 'No se pudo retirar al alumno.');
        }
      });
    }
  }

  // Vinculación de apoderado
  abrirModalVincular(alumno: AlumnoResponse): void {
    this.alumnoParaVincular.set(alumno);
    this.vincularForm.reset({
      apoderadoId: null,
      parentesco: '',
      contactoPrincipal: true
    });
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.modalVincularAbierto.set(true);
  }

  cerrarModalVincular(): void {
    this.modalVincularAbierto.set(false);
  }

  guardarVinculacion(): void {
    if (this.vincularForm.invalid) {
      this.vincularForm.markAllAsTouched();
      return;
    }

    const alumno = this.alumnoParaVincular();
    if (!alumno) return;

    const payload: VincularApoderadoRequest = {
      apoderadoId: Number(this.vincularForm.value.apoderadoId),
      parentesco: this.vincularForm.value.parentesco!,
      contactoPrincipal: !!this.vincularForm.value.contactoPrincipal
    };

    this.alumnoService.vincularApoderado(alumno.id, payload).subscribe({
      next: () => {
        this.mensajeExito.set(`Apoderado vinculado con éxito a ${alumno.nombres}.`);
        this.cerrarModalVincular();
        this.cargarAlumnos();
      },
      error: (err) => {
        this.mensajeError.set(err.error?.message || 'Error al vincular apoderado.');
      }
    });
  }

  // Ver Notas del Alumno
  verNotas(alumno: AlumnoResponse): void {
    this.alumnoSeleccionadoNotas.set(alumno);
    this.modalNotasAbierto.set(true);
    this.cargandoNotas.set(true);
    this.calificacionService.getCalificacionesByAlumno(alumno.id).subscribe({
      next: (notas) => {
        this.notasAlumno.set(notas);
        this.cargandoNotas.set(false);
      },
      error: () => {
        this.notasAlumno.set([]);
        this.cargandoNotas.set(false);
      }
    });
  }

  cerrarModalNotas(): void {
    this.modalNotasAbierto.set(false);
  }
}