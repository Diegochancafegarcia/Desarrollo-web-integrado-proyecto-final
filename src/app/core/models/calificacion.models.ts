export interface CalificacionRequest {
  matriculaId: number;
  cursoId: number;
  periodo: number; // 1 - 4
  nota: number; // 0.00 - 20.00
  observacion?: string;
}

export interface CalificacionResponse {
  id: number;
  matriculaId: number;
  alumnoId: number;
  codigoAlumno: string;
  cursoId: number;
  curso: string;
  periodo: number;
  nota: number;
  observacion?: string;
  docente: string;
}