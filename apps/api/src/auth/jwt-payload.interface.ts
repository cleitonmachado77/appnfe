export interface JwtPayload {
  sub: string;
  perfil: 'ENTREGADOR' | 'ADMIN';
  iat?: number;
  exp?: number;
}
