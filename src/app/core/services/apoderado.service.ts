import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { ApoderadoRequest, ApoderadoResponse } from '../models/apoderado.models';

export interface NuevoApoderadoDTO {
  nombres: string;
  apellidos: string;
  correo: string;
  password?: string;
  documento: string;
  telefono?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApoderadoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/v1/apoderados';
  private usuariosUrl = 'http://localhost:8080/api/v1/usuarios';

  getApoderados(): Observable<ApoderadoResponse[]> {
    return this.http.get<ApoderadoResponse[]>(this.apiUrl);
  }

  createApoderado(data: ApoderadoRequest): Observable<ApoderadoResponse> {
    return this.http.post<ApoderadoResponse>(this.apiUrl, data);
  }

  registrarNuevoApoderado(datos: NuevoApoderadoDTO): Observable<ApoderadoResponse> {
    const usuarioPayload = {
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      correo: datos.correo,
      password: datos.password || 'Colegio2026*',
      roles: ['APODERADO']
    };

    return this.http.post<{ id: number }>(this.usuariosUrl, usuarioPayload).pipe(
      switchMap((usuarioCreado) => {
        const apoderadoPayload: ApoderadoRequest = {
          usuarioId: usuarioCreado.id,
          documento: datos.documento,
          telefono: datos.telefono || undefined
        };
        return this.http.post<ApoderadoResponse>(this.apiUrl, apoderadoPayload);
      })
    );
  }
}