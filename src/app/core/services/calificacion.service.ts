import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalificacionRequest, CalificacionResponse } from '../models/calificacion.models';

@Injectable({
  providedIn: 'root'
})
export class CalificacionService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/v1';

  registrarCalificacion(data: CalificacionRequest): Observable<CalificacionResponse> {
    return this.http.post<CalificacionResponse>(`${this.baseUrl}/calificaciones`, data);
  }

  actualizarCalificacion(id: number, data: { nota: number; observacion?: string }): Observable<CalificacionResponse> {
    return this.http.put<CalificacionResponse>(`${this.baseUrl}/calificaciones/${id}`, data);
  }

  getCalificacionesByAlumno(alumnoId: number): Observable<CalificacionResponse[]> {
    return this.http.get<CalificacionResponse[]>(`${this.baseUrl}/alumnos/${alumnoId}/calificaciones`);
  }
}