export interface ApoderadoRequest {
  usuarioId: number;
  documento: string;
  telefono?: string;
}

export interface ApoderadoResponse {
  id: number;
  usuarioId: number;
  documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string;
}