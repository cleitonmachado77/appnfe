export interface JwtPayload {
  sub: string;
  perfil: 'ENTREGADOR' | 'ADMIN' | 'SUPER_ADMIN';
  empresa_id: string | null;
  iat?: number;
  exp?: number;
}
