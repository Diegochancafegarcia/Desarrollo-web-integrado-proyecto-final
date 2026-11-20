export interface AnioLectivoResponse {
  id: number;
  anio: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface GradoResponse {
  id: number;
  nombre: string;
  nivel: number;
}

export interface AulaRequest {
  gradoId: number;
  anioLectivoId: number;
  seccion: string;
  capacidad: number;
}

export interface AulaResponse {
  id: number;
  gradoId: number;
  grado: string;
  nivel: number;
  anioLectivoId: number;
  anio: number;
  seccion: string;
  capacidad: number;
}

export interface CursoRequest {
  codigo: string;
  nombre: string;
}

export interface CursoResponse {
  id: number;
  codigo: string;
  nombre: string;
}

export interface AsignacionRequest {
  docenteId: number;
  cursoId: number;
  aulaId: number;
}

export interface AsignacionResponse {
  id: number;
  docenteId: number;
  docente: string;
  cursoId: number;
  curso: string;
  aulaId: number;
  aula: string;
}