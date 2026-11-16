export type Sexo = 'M' | 'F';
export type EstadoAlumno = 'ACTIVO' | 'RETIRADO' | 'EGRESADO';

export interface AlumnoRequest {
  codigoAlumno: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string; // YYYY-MM-DD
  sexo: Sexo;
}

export interface ApoderadoResumen {
  apoderadoId: number;
  nombreCompleto: string;
  parentesco: string;
  contactoPrincipal: boolean;
}

export interface AlumnoResponse {
  id: number;
  codigoAlumno: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: Sexo;
  estado: EstadoAlumno;
  apoderados: ApoderadoResumen[];
}

export interface VincularApoderadoRequest {
  apoderadoId: number;
  parentesco: string;
  contactoPrincipal: boolean;
}