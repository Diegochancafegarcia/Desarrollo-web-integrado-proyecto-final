import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnioLectivoResponse,
  GradoResponse,
  AulaRequest,
  AulaResponse,
  CursoRequest,
  CursoResponse,
  AsignacionRequest,
  AsignacionResponse
} from '../models/academico.models';

@Injectable({
  providedIn: 'root'
})
export class AcademicoService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/v1';

  getCursos(): Observable<CursoResponse[]> {
    return this.http.get<CursoResponse[]>(`${this.baseUrl}/cursos`);
  }

  createCurso(data: CursoRequest): Observable<CursoResponse> {
    return this.http.post<CursoResponse>(`${this.baseUrl}/cursos`, data);
  }

  getGrados(): Observable<GradoResponse[]> {
    return this.http.get<GradoResponse[]>(`${this.baseUrl}/grados`);
  }

  getAniosLectivos(): Observable<AnioLectivoResponse[]> {
    return this.http.get<AnioLectivoResponse[]>(`${this.baseUrl}/anios-lectivos`);
  }

  getAulas(anio?: number, grado?: number): Observable<AulaResponse[]> {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio.toString());
    if (grado) params = params.set('grado', grado.toString());
    return this.http.get<AulaResponse[]>(`${this.baseUrl}/aulas`, { params });
  }

  createAula(data: AulaRequest): Observable<AulaResponse> {
    return this.http.post<AulaResponse>(`${this.baseUrl}/aulas`, data);
  }

  getAsignaciones(aulaId?: number): Observable<AsignacionResponse[]> {
    let params = new HttpParams();
    if (aulaId) params = params.set('aulaId', aulaId.toString());
    return this.http.get<AsignacionResponse[]>(`${this.baseUrl}/asignaciones-docentes`, { params });
  }

  createAsignacion(data: AsignacionRequest): Observable<AsignacionResponse> {
    return this.http.post<AsignacionResponse>(`${this.baseUrl}/asignaciones-docentes`, data);
  }
}