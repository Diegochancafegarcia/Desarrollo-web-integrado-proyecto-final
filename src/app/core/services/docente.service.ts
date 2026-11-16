import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocenteRequest, DocenteResponse } from '../models/docente.models';

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
}