import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { correo, password } = this.loginForm.value;
    this.authService.login({ correo: correo!, password: password! }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard/home']);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 400) {
          this.errorMessage.set('Credenciales incorrectas. Verifique su correo y contraseña.');
        } else {
          this.errorMessage.set('No se pudo conectar con el servidor. Verifique que el backend esté ejecutándose.');
        }
      }
    });
  }

  cargarCredencialDemo(tipo: 'admin' | 'docente' | 'apoderado' | 'director'): void {
    const credenciales = {
      admin: { correo: 'admin@santarosa.edu.pe', password: 'Colegio2026*' },
      docente: { correo: 'lucia.torres@santarosa.edu.pe', password: 'Colegio2026*' },
      apoderado: { correo: 'rosa.quispe@correo.com', password: 'Colegio2026*' },
      director: { correo: 'director@santarosa.edu.pe', password: 'Colegio2026*' }
    };
    this.loginForm.patchValue(credenciales[tipo]);
  }
}