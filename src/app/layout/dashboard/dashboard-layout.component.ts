import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css']
})
export class DashboardLayoutComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
  }

  get rolPrincipal(): string {
    const roles = this.authService.currentUser()?.roles || [];
    if (roles.includes('ADMIN')) return 'ADMINISTRADOR';
    if (roles.includes('DIRECTOR')) return 'DIRECTOR';
    if (roles.includes('DOCENTE')) return 'DOCENTE';
    if (roles.includes('APODERADO')) return 'APODERADO';
    return 'USUARIO';
  }
}