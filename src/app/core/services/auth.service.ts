import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRequest, AuthResponse, UsuarioInfo } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:8080/api/v1/auth';

  currentUser = signal<UsuarioInfo | null>(this.getUserFromStorage());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        localStorage.setItem('jwt_token', res.token);
        const userInfo: UsuarioInfo = {
          correo: res.correo,
          nombres: res.nombres,
          apellidos: res.apellidos,
          roles: res.roles
        };
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        this.currentUser.set(userInfo);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  getUserFromStorage(): UsuarioInfo | null {
    const raw = localStorage.getItem('user_info');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return !!user && user.roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.some((r) => user.roles.includes(r));
  }
}