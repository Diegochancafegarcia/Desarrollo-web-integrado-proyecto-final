import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardLayoutComponent } from './layout/dashboard/dashboard-layout.component';
import { DashboardHomeComponent } from './features/dashboard-home/dashboard-home.component';
import { AlumnosComponent } from './features/alumnos/alumnos.component';
import { DocentesComponent } from './features/docentes/docentes.component';
import { ApoderadosComponent } from './features/apoderados/apoderados.component';
import { CursosComponent } from './features/cursos/cursos.component';
import { AulasComponent } from './features/aulas/aulas.component';
import { MatriculasComponent } from './features/matriculas/matriculas.component';
import { CalificacionesComponent } from './features/calificaciones/calificaciones.component';
import { AsistenciasComponent } from './features/asistencias/asistencias.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: DashboardHomeComponent },
      { path: 'alumnos', component: AlumnosComponent },
      {
        path: 'docentes',
        component: DocentesComponent,
        canActivate: [roleGuard(['ADMIN', 'DIRECTOR'])]
      },
      {
        path: 'apoderados',
        component: ApoderadosComponent,
        canActivate: [roleGuard(['ADMIN', 'DIRECTOR'])]
      },
      {
        path: 'cursos',
        component: CursosComponent,
        canActivate: [roleGuard(['ADMIN', 'DIRECTOR'])]
      },
      {
        path: 'aulas',
        component: AulasComponent,
        canActivate: [roleGuard(['ADMIN', 'DIRECTOR'])]
      },
      {
        path: 'matriculas',
        component: MatriculasComponent,
        canActivate: [roleGuard(['ADMIN', 'DIRECTOR'])]
      },
      {
        path: 'calificaciones',
        component: CalificacionesComponent,
        canActivate: [roleGuard(['ADMIN', 'DOCENTE'])]
      },
      {
        path: 'asistencias',
        component: AsistenciasComponent,
        canActivate: [roleGuard(['ADMIN', 'DOCENTE'])]
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];