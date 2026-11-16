import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { AuthService } from '../../core/services/auth.service';
import { AsistenciaRequest, AsistenciaResponse, EstadoAsistencia } from '../../core/models/asistencia.models';
import { AulaResponse } from '../../core/models/academico.models';
import { MatriculaResponse } from '../../core/models/matricula.models';

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './asistencias.component.html',
  styleUrls: ['./asistencias.component.css']
})
export class AsistenciasComponent implements OnInit {
  asistenciaService = inject(AsistenciaService);
  academicoService = inject(AcademicoService);
  matriculaService = inject(MatriculaService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  aulas = signal<AulaResponse[]>([]);
  matriculasAula = signal<MatriculaResponse[]>([]);
  asistencias = signal<AsistenciaResponse[]>([]);

  // Filtros de consulta
  fechaConsulta = signal<string>(new Date().toISOString().substring(0, 10));
  aulaConsultaId = signal<number | null>(null);
  cargando = signal<boolean>(false);

  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  asistForm = this.fb.group({
    matriculaId: [null as number | null, [Validators.required]],
    fecha: [new Date().toISOString().substring(0, 10), [Validators.required]],
    estado: ['ASISTIO' as EstadoAsistencia, [Validators.required]],
    observacion: ['', [Validators.maxLength(200)]]
  });

  ngOnInit(): void {
    this.academicoService.getAulas().subscribe({
      next: (data) => {
        this.aulas.set(data);
        if (data.length > 0) {
          this.aulaConsultaId.set(data[0].id);
          this.consultar();
        }
      },
      error: () => {}
    });

    this.matriculaService.getMatriculas().subscribe({
      next: (data) => this.matriculasAula.set(data),
      error: () => {}
    });
  }

  consultar(): void {
    const aulaId = this.aulaConsultaId();
    const fecha = this.fechaConsulta();
    if (!aulaId || !fecha) return;

    this.cargando.set(true);
    this.asistenciaService.getAsistencias(fecha, aulaId).subscribe({
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

  guardar(): void {
    if (this.asistForm.invalid) {
      this.asistForm.markAllAsTouched();
      return;
    }

    const payload: AsistenciaRequest = {
      matriculaId: Number(this.asistForm.value.matriculaId),
      fecha: this.asistForm.value.fecha!,
      estado: this.asistForm.value.estado!,
      observacion: this.asistForm.value.observacion || undefined
    };

    this.asistenciaService.registrarAsistencia(payload).subscribe({
      next: (res) => {
        this.mensajeExito.set(`Asistencia (${res.estado}) registrada correctamente para ${res.alumno}.`);
        this.mensajeError.set(null);
        this.asistForm.patchValue({ observacion: '' });
        this.consultar();
      },
      error: (err) => {
        this.mensajeExito.set(null);
        this.mensajeError.set(err.error?.message || 'Error al registrar asistencia en BD.');
      }
    });
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