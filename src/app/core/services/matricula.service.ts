import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MatriculaRequest, MatriculaResponse } from '../models/matricula.models';

@Injectable({
  providedIn: 'root'
})
export class MatriculaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/v1/matriculas';

  getMatriculas(anio?: number, grado?: number): Observable<MatriculaResponse[]> {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio.toString());
    if (grado) params = params.set('grado', grado.toString());
    return this.http.get<MatriculaResponse[]>(this.apiUrl, { params });
  }

  createMatricula(data: MatriculaRequest): Observable<MatriculaResponse> {
    return this.http.post<MatriculaResponse>(this.apiUrl, data);
  }
}