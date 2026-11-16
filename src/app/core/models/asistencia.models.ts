export type EstadoAsistencia = 'ASISTIO' | 'TARDANZA' | 'FALTA' | 'JUSTIFICADA';

export interface AsistenciaRequest {
  matriculaId: number;
  fecha: string; // YYYY-MM-DD
  estado: EstadoAsistencia;
  observacion?: string;
}

export interface AsistenciaResponse {
  id: number;
  matriculaId: number;
  codigoAlumno: string;
  alumno: string;
  fecha: string;
  estado: EstadoAsistencia;
  observacion?: string;
}