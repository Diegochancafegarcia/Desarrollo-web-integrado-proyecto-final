import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AlumnoRequest,
  AlumnoResponse,
  VincularApoderadoRequest
} from '../models/alumno.models';

@Injectable({
  providedIn: 'root'
})
export class AlumnoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/v1/alumnos';

  getAlumnos(): Observable<AlumnoResponse[]> {
    return this.http.get<AlumnoResponse[]>(this.apiUrl);
  }

  getMisAlumnos(): Observable<AlumnoResponse[]> {
    return this.http.get<AlumnoResponse[]>(`${this.apiUrl}/mis-alumnos`);
  }

  getAlumnoById(id: number): Observable<AlumnoResponse> {
    return this.http.get<AlumnoResponse>(`${this.apiUrl}/${id}`);
  }

  createAlumno(data: AlumnoRequest): Observable<AlumnoResponse> {
    return this.http.post<AlumnoResponse>(this.apiUrl, data);
  }

  updateAlumno(id: number, data: AlumnoRequest): Observable<AlumnoResponse> {
    return this.http.put<AlumnoResponse>(`${this.apiUrl}/${id}`, data);
  }

  deleteAlumno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  vincularApoderado(id: number, data: VincularApoderadoRequest): Observable<AlumnoResponse> {
    return this.http.post<AlumnoResponse>(`${this.apiUrl}/${id}/apoderados`, data);
  }
}