import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | StreamableFile>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | StreamableFile> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => {
        // Las descargas de archivos (StreamableFile) se devuelven tal cual
        // para que Nest transmita los bytes; envolverlas en JSON las rompería.
        if (data instanceof StreamableFile) {
          return data;
        }
        return {
          data: data ?? null,
          message: data?.message ?? 'OK',
          statusCode: response.statusCode,
        };
      }),
    );
  }
}
