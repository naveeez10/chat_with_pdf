import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { QaModule } from './qa/qa.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [UploadModule, QaModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
