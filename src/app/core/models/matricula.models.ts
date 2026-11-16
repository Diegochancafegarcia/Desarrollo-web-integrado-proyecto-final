export type EstadoMatricula = 'ACTIVA' | 'RETIRADA' | 'FINALIZADA';

export interface MatriculaRequest {
  alumnoId: number;
  aulaId: number;
  fechaMatricula?: string;
}

export interface MatriculaResponse {
  id: number;
  alumnoId: number;
  codigoAlumno: string;
  alumno: string;
  aulaId: number;
  grado: string;
  seccion: string;
  anio: number;
  fechaMatricula: string;
  estado: EstadoMatricula;
}