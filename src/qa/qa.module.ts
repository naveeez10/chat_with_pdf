import { Module } from '@nestjs/common';
import { QaService } from './qa.service';
import { QaController } from './qa.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [QaService, PrismaService],
  controllers: [QaController],
})
export class QaModule {}
