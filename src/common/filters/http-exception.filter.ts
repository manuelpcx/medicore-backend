import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Solicitud inválida',
  401: 'No autorizado — credenciales inválidas o token expirado',
  403: 'Acceso denegado',
  404: 'Recurso no encontrado',
  409: 'Conflicto — el recurso ya existe',
  413: 'Archivo demasiado grande',
  422: 'Datos no procesables',
  500: 'Error interno del servidor',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message
          ? Array.isArray(resp.message)
            ? resp.message.join(', ')
            : resp.message
          : HTTP_MESSAGES[status] ?? message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      data: null,
      message: HTTP_MESSAGES[status] ?? message,
      error: message,
      statusCode: status,
    });
  }
}
