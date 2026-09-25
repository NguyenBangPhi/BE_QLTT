import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class MysqlExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MysqlExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Nếu lỗi có sqlState từ mysql2
    if (exception && exception.sqlState) {
      if (exception.sqlState === '45000') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: exception.sqlMessage,
          error: 'Bad Request',
        });
      }
      
      if (exception.sqlState === '23000') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Không thể thực hiện thao tác do dữ liệu đang được sử dụng hoặc vi phạm khóa ngoại.',
          error: 'Bad Request',
        });
      }
    }

    // Default error handling for HttpException
    if (exception.getStatus) {
      const status = exception.getStatus();
      return response.status(status).json(exception.getResponse());
    }

    this.logger.error('Unhandled exception', exception.stack || exception);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal Server Error',
      error: 'Internal Server Error',
    });
  }
}
