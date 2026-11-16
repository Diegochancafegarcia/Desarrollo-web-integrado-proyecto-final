import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlumnoService } from '../../core/services/alumno.service';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css']
})
export class DashboardHomeComponent implements OnInit {
  authService = inject(AuthService);
  private alumnoService = inject(AlumnoService);
  private academicoService = inject(AcademicoService);
  private matriculaService = inject(MatriculaService);

  totalAlumnos = signal<number>(0);
  totalCursos = signal<number>(0);
  totalAulas = signal<number>(0);
  totalMatriculas = signal<number>(0);

  ngOnInit(): void {
    if (this.authService.hasAnyRole(['ADMIN', 'DIRECTOR', 'DOCENTE'])) {
      this.alumnoService.getAlumnos().subscribe({
        next: (data) => this.totalAlumnos.set(data.length),
        error: () => {}
      });
      this.academicoService.getCursos().subscribe({
        next: (data) => this.totalCursos.set(data.length),
        error: () => {}
      });
      this.academicoService.getAulas().subscribe({
        next: (data) => this.totalAulas.set(data.length),
        error: () => {}
      });
      this.matriculaService.getMatriculas().subscribe({
        next: (data) => this.totalMatriculas.set(data.length),
        error: () => {}
      });
    }
  }
}