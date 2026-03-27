export interface JwtPayload {
  sub: string;
  perfil: 'ENTREGADOR' | 'ADMIN' | 'USUARIO' | 'SUPER_ADMIN';
  empresa_id: string | null;
  iat?: number;
  exp?: number;
}
