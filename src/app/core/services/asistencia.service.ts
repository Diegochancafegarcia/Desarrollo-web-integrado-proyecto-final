import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AsistenciaRequest, AsistenciaResponse } from '../models/asistencia.models';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/v1/asistencias';

  getAsistencias(fecha: string, aulaId: number): Observable<AsistenciaResponse[]> {
    const params = new HttpParams().set('fecha', fecha).set('aulaId', aulaId.toString());
    return this.http.get<AsistenciaResponse[]>(this.apiUrl, { params });
  }

  registrarAsistencia(data: AsistenciaRequest): Observable<AsistenciaResponse> {
    return this.http.post<AsistenciaResponse>(this.apiUrl, data);
  }

  getAsistenciasPorMatricula(matriculaId: number): Observable<AsistenciaResponse[]> {
    return this.http.get<AsistenciaResponse[]>(`${this.apiUrl}/matricula/${matriculaId}`);
  }
}