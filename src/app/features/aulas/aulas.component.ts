import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { DocenteService } from '../../core/services/docente.service';
import { AuthService } from '../../core/services/auth.service';
import { AulaResponse, AulaRequest, GradoResponse, AnioLectivoResponse, AsignacionResponse, CursoResponse, AsignacionRequest } from '../../core/models/academico.models';
import { MatriculaResponse } from '../../core/models/matricula.models';
import { DocenteResponse } from '../../core/models/docente.models';

function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-aulas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './aulas.component.html',
  styleUrls: ['./aulas.component.css']
})
export class AulasComponent implements OnInit {
  academicoService = inject(AcademicoService);
  matriculaService = inject(MatriculaService);
  docenteService = inject(DocenteService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  aulas = signal<AulaResponse[]>([]);
  grados = signal<GradoResponse[]>([]);
  anios = signal<AnioLectivoResponse[]>([]);
  matriculas = signal<MatriculaResponse[]>([]);
  asignaciones = signal<AsignacionResponse[]>([]);
  cursos = signal<CursoResponse[]>([]);
  docentes = signal<DocenteResponse[]>([]);

  aulaSeleccionada = signal<AulaResponse | null>(null);
  isLoading = signal<boolean>(false);
  modalAbierto = signal<boolean>(false);
  modalAsignarAbierto = signal<boolean>(false);

  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

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

  aulasAMostrar = computed(() => {
    if (!this.isDocente()) {
      return this.aulas();
    }
    const aulaIds = new Set(this.asignacionesDocente().map(a => a.aulaId));
    return this.aulas().filter(a => aulaIds.has(a.id));
  });

  alumnosDelAula = computed(() => {
    const aula = this.aulaSeleccionada();
    if (!aula) return [];
    return this.matriculas().filter(m => m.aulaId === aula.id);
  });

  aulaForm = this.fb.group({
    gradoId: [null as number | null, [Validators.required]],
    anioLectivoId: [null as number | null, [Validators.required]],
    seccion: ['', [Validators.required, Validators.maxLength(5)]],
    capacidad: [25, [Validators.required, Validators.min(1)]]
  });

  asignarForm = this.fb.group({
    aulaId: [null as number | null, [Validators.required]],
    cursoId: [null as number | null, [Validators.required]],
    docenteId: [null as number | null, [Validators.required]]
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

    this.matriculaService.getMatriculas().subscribe({
      next: (data) => this.matriculas.set(data),
      error: () => {}
    });

    this.academicoService.getAsignaciones().subscribe({
      next: (data) => this.asignaciones.set(data),
      error: () => {}
    });

    this.academicoService.getCursos().subscribe({
      next: (data) => this.cursos.set(data),
      error: () => {}
    });

    if (this.authService.hasAnyRole(['ADMIN', 'DIRECTOR'])) {
      this.docenteService.getDocentes().subscribe({
        next: (data) => this.docentes.set(data),
        error: () => {}
      });
    }
  }

  seleccionarAula(aula: AulaResponse): void {
    if (this.aulaSeleccionada()?.id === aula.id) {
      this.aulaSeleccionada.set(null);
    } else {
      this.aulaSeleccionada.set(aula);
    }
  }

  contarAlumnos(aulaId: number): number {
    return this.matriculas().filter(m => m.aulaId === aulaId).length;
  }

  getCursosEnAula(aulaId: number): string[] {
    if (this.isDocente()) {
      return this.asignacionesDocente().filter(a => a.aulaId === aulaId).map(a => a.curso);
    }
    return this.asignaciones().filter(a => a.aulaId === aulaId).map(a => `${a.curso} (${a.docente})`);
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

  abrirModalAsignar(aulaId?: number): void {
    this.asignarForm.reset({
      aulaId: aulaId || this.aulaSeleccionada()?.id || this.aulas()[0]?.id || null,
      cursoId: this.cursos()[0]?.id || null,
      docenteId: this.docentes()[0]?.id || null
    });
    this.mensajeError.set(null);
    this.modalAsignarAbierto.set(true);
  }

  cerrarModalAsignar(): void {
    this.modalAsignarAbierto.set(false);
  }

  guardarAsignacion(): void {
    if (this.asignarForm.invalid) {
      this.asignarForm.markAllAsTouched();
      return;
    }

    const payload: AsignacionRequest = {
      aulaId: Number(this.asignarForm.value.aulaId),
      cursoId: Number(this.asignarForm.value.cursoId),
      docenteId: Number(this.asignarForm.value.docenteId)
    };

    this.academicoService.createAsignacion(payload).subscribe({
      next: (nueva) => {
        this.mensajeExito.set(`Curso "${nueva.curso}" asignado exitosamente al aula ${nueva.aula} con el docente ${nueva.docente}.`);
        this.cerrarModalAsignar();
        this.academicoService.getAsignaciones().subscribe({
          next: (data) => this.asignaciones.set(data),
          error: () => {}
        });
      },
      error: (err) => {
        this.mensajeError.set(err.error?.message || 'Error al asignar curso al aula.');
      }
    });
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