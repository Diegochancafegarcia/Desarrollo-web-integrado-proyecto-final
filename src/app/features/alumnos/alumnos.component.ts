import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AlumnoService } from '../../core/services/alumno.service';
import { ApoderadoService } from '../../core/services/apoderado.service';
import { CalificacionService } from '../../core/services/calificacion.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AlumnoResponse,
  AlumnoRequest,
  Sexo,
  VincularApoderadoRequest
} from '../../core/models/alumno.models';
import { ApoderadoResponse } from '../../core/models/apoderado.models';
import { CalificacionResponse } from '../../core/models/calificacion.models';

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
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  alumnos = signal<AlumnoResponse[]>([]);
  apoderados = signal<ApoderadoResponse[]>([]);
  isLoading = signal<boolean>(false);
  filtroTexto = signal<string>('');

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

  cargarApoderados(): void {
    this.apoderadoService.getApoderados().subscribe({
      next: (data) => this.apoderados.set(data),
      error: () => {}
    });
  }

  get alumnosFiltrados(): AlumnoResponse[] {
    const texto = this.filtroTexto().toLowerCase().trim();
    if (!texto) return this.alumnos();
    return this.alumnos().filter((a) =>
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