import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { DocenteRequest, DocenteResponse } from '../models/docente.models';

export interface NuevoDocentePayload {
  nombres: string;
  apellidos: string;
  correo: string;
  password?: string;
  codigoDocente: string;
  especialidad?: string;
  telefono?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/v1/docentes';

  getDocentes(): Observable<DocenteResponse[]> {
    return this.http.get<DocenteResponse[]>(this.apiUrl);
  }

  createDocente(data: DocenteRequest): Observable<DocenteResponse> {
    return this.http.post<DocenteResponse>(this.apiUrl, data);
  }

  updateDocente(id: number, data: DocenteRequest): Observable<DocenteResponse> {
    return this.http.put<DocenteResponse>(`${this.apiUrl}/${id}`, data);
  }

  crearDocenteConUsuario(datos: NuevoDocentePayload): Observable<DocenteResponse> {
    const userPayload = {
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      correo: datos.correo.trim().toLowerCase(),
      password: datos.password || 'Colegio2026*',
      roles: ['DOCENTE']
    };

    return this.http.post<{ id: number }>('http://localhost:8080/api/v1/usuarios', userPayload).pipe(
      switchMap((usuarioCreado) => {
        const docentePayload: DocenteRequest = {
          usuarioId: usuarioCreado.id,
          codigoDocente: datos.codigoDocente.trim().toUpperCase(),
          especialidad: datos.especialidad ? datos.especialidad.trim() : undefined,
          telefono: datos.telefono ? datos.telefono.trim() : undefined
        };
        return this.createDocente(docentePayload);
      })
    );
  }
}