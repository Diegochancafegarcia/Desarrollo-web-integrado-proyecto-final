export interface DocenteRequest {
  usuarioId: number;
  codigoDocente: string;
  especialidad?: string;
  telefono?: string;
}

export interface DocenteResponse {
  id: number;
  usuarioId: number;
  codigoDocente: string;
  nombres: string;
  apellidos: string;
  correo: string;
  especialidad?: string;
  telefono?: string;
}