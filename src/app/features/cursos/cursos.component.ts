import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicoService } from '../../core/services/academico.service';
import { AuthService } from '../../core/services/auth.service';
import { CursoResponse, CursoRequest } from '../../core/models/academico.models';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cursos.component.html',
  styleUrls: ['./cursos.component.css']
})
export class CursosComponent implements OnInit {
  academicoService = inject(AcademicoService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  cursos = signal<CursoResponse[]>([]);
  isLoading = signal<boolean>(false);
  modalAbierto = signal<boolean>(false);
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  cursoForm = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]]
  });

  ngOnInit(): void {
    this.cargarCursos();
  }

  cargarCursos(): void {
    this.isLoading.set(true);
    this.academicoService.getCursos().subscribe({
      next: (data) => {
        this.cursos.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
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
        this.cargarCursos();
      },
      error: (err) => {
        this.mensajeError.set(err.error?.message || 'Error al registrar curso.');
      }
    });
  }
}