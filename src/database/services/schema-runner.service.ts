import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class SchemaRunnerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchemaRunnerService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.applyPendingScripts();
  }

  private async applyPendingScripts() {
    const schemaDir = await this.findSchemaDirectory();
    if (!schemaDir) {
      this.logger.warn('Diretório de schema não encontrado. Pulando execução automática.');
      return;
    }

    const scriptFiles = await this.listSqlFiles(schemaDir);
    if (!scriptFiles.length) {
      this.logger.log('Nenhum script SQL encontrado para aplicar.');
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      const appliedRows: Array<{ version: string }> = await queryRunner.query(
        `SELECT version FROM schema_version`,
      );
      const appliedVersions = new Set(appliedRows.map((row) => row.version));

      for (const fileName of scriptFiles) {
        if (appliedVersions.has(fileName)) {
          continue;
        }

        const filePath = join(schemaDir, fileName);
        const rawSql = await fs.readFile(filePath, 'utf8');
        const sql = this.extractRunnerSql(rawSql);
        if (!sql.trim()) {
          await queryRunner.query(`INSERT INTO schema_version (version) VALUES ($1)`, [fileName]);
          this.logger.log(`Script sem trecho executável pelo app: ${fileName}`);
          continue;
        }

        await queryRunner.startTransaction();
        try {
          await queryRunner.query(sql);
          await queryRunner.query(`INSERT INTO schema_version (version) VALUES ($1)`, [fileName]);
          await queryRunner.commitTransaction();
          this.logger.log(`Script aplicado: ${fileName}`);
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        }
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async listSqlFiles(schemaDir: string): Promise<string[]> {
    const files = await fs.readdir(schemaDir);
    return files.filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
  }

  private async findSchemaDirectory(): Promise<string | null> {
    const candidates = [
      join(process.cwd(), 'src', 'database', 'schema'),
      join(process.cwd(), 'dist', 'database', 'schema'),
      join(process.cwd(), 'dist', 'src', 'database', 'schema'),
    ];

    for (const dir of candidates) {
      try {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) return dir;
      } catch {
        // ignore
      }
    }

    return null;
  }

  private extractRunnerSql(rawSql: string): string {
    const marker = '-- APP_RUNNER_START';
    if (!rawSql.includes(marker)) {
      return rawSql;
    }

    return rawSql.split(marker)[1] ?? '';
  }
}
