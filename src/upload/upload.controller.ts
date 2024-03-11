import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  constructor(private readonly service: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: generateFilename,
      }),
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is missing');
    }
    try {
      const result = await this.service.processUpload(file);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('status/:id')
  async getStatus(@Param('id') id: string) {
    const document = await this.service.findDocumentById(id);
    console.log('document', document);
    if (!document) {
      return { message: 'Document not found.' };
    }
    return { status: document.status };
  }
}

function generateFilename(req, file, callback) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
}
