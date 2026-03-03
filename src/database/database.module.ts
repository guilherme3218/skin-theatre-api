import { Module } from '@nestjs/common';
import { SchemaRunnerService } from './services/schema-runner.service';

@Module({
  providers: [SchemaRunnerService],
})
export class DatabaseModule {}
