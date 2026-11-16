export interface LoginRequest {
  correo: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  tipo: string;
  expiraEnSegundos: number;
  correo: string;
  nombres: string;
  apellidos: string;
  roles: string[];
}

export interface UsuarioInfo {
  correo: string;
  nombres: string;
  apellidos: string;
  roles: string[];
}