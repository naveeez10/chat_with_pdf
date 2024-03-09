import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/upload (POST) - should upload file successfully', () => {
    return request(app.getHttpServer())
      .post('/upload')
      .attach('file', 'path/to/your/test/file.txt')
      .expect(HttpStatus.OK);
  });

  it('/upload/status/:documentID (GET) - should return processing status', async () => {
    const documentID = 'testDocumentId';
    return request(app.getHttpServer())
      .get(`/upload/status/${documentID}`)
      .expect(HttpStatus.OK);
  });

  afterAll(async () => {
    await app.close();
  });
});
