import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class IncidenciasUploadFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();

    if (exception.code === 'LIMIT_FILE_SIZE') {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'Cada fotografía debe pesar como máximo 5 MiB',
        error: 'Payload Too Large',
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message:
        exception.code === 'LIMIT_FILE_COUNT' ||
        exception.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Se permiten como máximo 5 fotografías por solicitud'
          : 'No se pudo leer la fotografía enviada',
      error: 'Bad Request',
    });
  }
}
