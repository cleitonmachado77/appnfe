import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/** Garante formato padrão de resposta de erro em todos os endpoints:
 *  { statusCode, mensagem, campo? }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let mensagem = 'Erro interno do servidor';
    let campo: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        mensagem = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;

        // ValidationPipe retorna { message: string[] }
        if (Array.isArray(b['message'])) {
          mensagem = (b['message'] as string[]).join('; ');
        } else if (typeof b['message'] === 'string') {
          mensagem = b['message'];
        } else if (typeof b['mensagem'] === 'string') {
          mensagem = b['mensagem'];
        }

        if (typeof b['campo'] === 'string') {
          campo = b['campo'];
        }
      }
    } else if (exception instanceof Error) {
      mensagem = exception.message;
    }

    const payload: Record<string, unknown> = { statusCode, mensagem };
    if (campo) payload['campo'] = campo;

    response.status(statusCode).json(payload);
  }
}
