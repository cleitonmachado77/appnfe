import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

function createMockContext(
  perfil: string | undefined,
  handler: object = {},
  controller: object = {},
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({
        user: perfil !== undefined ? { userId: 'uuid-1', perfil } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite acesso quando nenhum role está definido na rota', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as unknown as string[]);

    const ctx = createMockContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acesso quando a lista de roles está vazia', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const ctx = createMockContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acesso quando o perfil do usuário está na lista de roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const ctx = createMockContext('ADMIN');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acesso para ENTREGADOR em rota com role ENTREGADOR', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ENTREGADOR']);

    const ctx = createMockContext('ENTREGADOR');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('lança ForbiddenException quando ENTREGADOR tenta acessar rota ADMIN', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const ctx = createMockContext('ENTREGADOR');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('lança ForbiddenException quando ADMIN tenta acessar rota ENTREGADOR', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ENTREGADOR']);

    const ctx = createMockContext('ADMIN');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('lança ForbiddenException quando request.user é undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const ctx = createMockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('usa a chave correta do metadata (ROLES_KEY)', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ADMIN']);

    const handler = {};
    const controller = {};
    const ctx = createMockContext('ADMIN', handler, controller);
    guard.canActivate(ctx);

    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [handler, controller]);
  });
});
