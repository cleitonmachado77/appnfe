import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const ACAO_MAP: Record<string, Record<string, string>> = {
  POST: {
    '/auth/login': 'LOGIN',
    '/entregas': 'CRIAR_ENTREGA',
    '/usuarios': 'CRIAR_ENTREGADOR',
    '/super-admin/empresas': 'CRIAR_EMPRESA',
  },
  DELETE: {
    '/entregas': 'EXCLUIR_ENTREGA',
    '/usuarios': 'EXCLUIR_ENTREGADOR',
  },
  PATCH: {
    '/super-admin/empresas': 'ALTERAR_STATUS_EMPRESA',
  },
};

function resolverAcao(method: string, url: string): { acao: string; recurso: string } {
  const base = Object.keys(ACAO_MAP[method] ?? {}).find((k) => url.startsWith(k));
  const acao = ACAO_MAP[method]?.[base ?? ''] ?? `${method} ${url}`;
  const recurso = base?.replace('/', '') ?? url.split('/')[1] ?? 'sistema';
  return { acao, recurso };
}

function extrairRecursoId(url: string): string | null {
  const parts = url.split('/').filter(Boolean);
  const uuidRegex = /^[0-9a-f-]{36}$/i;
  return parts.find((p) => uuidRegex.test(p)) ?? null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;

    // Só loga mutações e login
    if (!['POST', 'DELETE', 'PATCH', 'PUT'].includes(method)) return next.handle();

    const url: string = req.url?.split('?')[0] ?? '';
    const user = req.user as { userId?: string; perfil?: string; empresa_id?: string | null } | undefined;

    return next.handle().pipe(
      tap(async () => {
        const res = context.switchToHttp().getResponse();
        const { acao, recurso } = resolverAcao(method, url);
        const recurso_id = extrairRecursoId(url);

        await this.auditService.registrar({
          usuario_id: user?.userId ?? null,
          empresa_id: user?.empresa_id ?? null,
          acao,
          recurso,
          recurso_id,
          metodo_http: method,
          rota: url,
          status_http: res.statusCode,
        });
      }),
    );
  }
}
