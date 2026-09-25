import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: mysql.Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    this.pool = mysql.createPool({
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 3306),
      user: this.configService.get<string>('DB_USER', 'root'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
      database: this.configService.get<string>('DB_NAME', 'QuanLyThuVien'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    this.logger.log('MySQL connection pool created.');
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('MySQL connection pool closed.');
    }
  }

  getPool(): mysql.Pool {
    return this.pool;
  }

  async getConnection(): Promise<mysql.PoolConnection> {
    return await this.pool.getConnection();
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    const [rows] = await this.pool.execute(sql, params);
    return rows as T;
  }

  async callProcedure(name: string, params: any[] = []): Promise<any> {
    const placeholders = params.map(() => '?').join(', ');
    const sql = `CALL ${name}(${placeholders})`;
    await this.pool.execute(sql, params);
  }

  async callProcedureWithResult<T>(name: string, params: any[] = []): Promise<T[]> {
    const placeholders = params.map(() => '?').join(', ');
    const sql = `CALL ${name}(${placeholders})`;
    const [rows] = await this.pool.execute(sql, params);
    // rows in SP with result usually returns an array of result sets. 
    // The first element is the actual result set.
    return (rows as any[])[0] as T[];
  }

  async callScalarFunction<T>(name: string, params: any[] = []): Promise<T> {
    const placeholders = params.map(() => '?').join(', ');
    const sql = `SELECT ${name}(${placeholders}) AS value`;
    const [rows] = await this.pool.execute(sql, params);
    return (rows as any[])[0].value as T;
  }
}
