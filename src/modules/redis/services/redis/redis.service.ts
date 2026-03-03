import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'net';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private host: string;
  private port: number;
  private password?: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);
      this.host = parsedUrl.hostname;
      this.port = Number(parsedUrl.port || 6379);
      this.password = parsedUrl.password || undefined;
    } else {
      this.host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
      this.port = Number(this.configService.get<string>('REDIS_PORT', '6379'));
      this.password = this.configService.get<string>('REDIS_PASSWORD') || undefined;
    }

    // Não forçar conexão no bootstrap para não derrubar a API
    // quando o Redis estiver indisponível no ambiente local.
  }

  async onModuleDestroy() {}

  async set(key: string, value: string, ttlInSeconds: number) {
    await this.executeCommand(['SET', key, value, 'EX', String(ttlInSeconds)]);
  }

  async get(key: string): Promise<string | null> {
    const value = await this.executeCommand(['GET', key]);
    return value === null ? null : String(value);
  }

  async del(key: string) {
    await this.executeCommand(['DEL', key]);
  }

  private async executeCommand(args: string[]): Promise<string | number | null> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({
        host: this.host,
        port: this.port,
      });

      const payload = this.encodeRespArray(args);
      let buffer = Buffer.alloc(0);
      let authSent = !this.password;
      let commandSent = false;

      const cleanUp = () => {
        if (!socket.destroyed) {
          socket.end();
          socket.destroy();
        }
      };

      socket.on('connect', () => {
        if (this.password) {
          socket.write(this.encodeRespArray(['AUTH', this.password]));
          authSent = true;
          return;
        }

        socket.write(payload);
        commandSent = true;
      });

      socket.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        const parsed = this.decodeResp(buffer, 0);
        if (!parsed) return;

        buffer = buffer.subarray(parsed.offset);

        if (parsed.error) {
          cleanUp();
          reject(new Error(parsed.error));
          return;
        }

        if (authSent && !commandSent && this.password) {
          socket.write(payload);
          commandSent = true;
          return;
        }

        cleanUp();
        resolve(parsed.value);
      });

      socket.on('error', (error) => {
        cleanUp();
        reject(error);
      });
    });
  }

  private encodeRespArray(args: string[]): string {
    let encoded = `*${args.length}\r\n`;
    for (const arg of args) {
      encoded += `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`;
    }

    return encoded;
  }

  private decodeResp(
    buffer: Buffer,
    offset: number,
  ): { value: string | number | null; offset: number; error?: string } | null {
    if (offset >= buffer.length) return null;

    const type = String.fromCharCode(buffer[offset]);
    const readLine = (start: number) => {
      const end = buffer.indexOf('\r\n', start);
      if (end === -1) return null;
      return {
        line: buffer.toString('utf8', start, end),
        next: end + 2,
      };
    };

    if (type === '+' || type === '-' || type === ':') {
      const line = readLine(offset + 1);
      if (!line) return null;

      if (type === '-') {
        return {
          value: null,
          offset: line.next,
          error: line.line,
        };
      }

      return {
        value: type === ':' ? Number(line.line) : line.line,
        offset: line.next,
      };
    }

    if (type === '$') {
      const header = readLine(offset + 1);
      if (!header) return null;

      const size = Number(header.line);
      if (size === -1) {
        return { value: null, offset: header.next };
      }

      const end = header.next + size;
      if (buffer.length < end + 2) return null;

      return {
        value: buffer.toString('utf8', header.next, end),
        offset: end + 2,
      };
    }

    return {
      value: null,
      offset: buffer.length,
      error: 'Resposta Redis inválida',
    };
  }
}
