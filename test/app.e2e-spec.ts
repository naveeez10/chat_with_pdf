import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as path from 'path';
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
    const filePath = path.join(
      __dirname,
      '../src/files/workflow_automation_research.pdf',
    );
    return request(app.getHttpServer())
      .post('/upload')
      .attach('file', filePath)
      .expect(201);
  });

  it('/upload/status/:documentID (GET) - should return processing status', async () => {
    const documentID = 'testDocumentId';
    return request(app.getHttpServer())
      .get(`/upload/status/${documentID}`)
      .expect(200);
  });

  it('/qa (POST) - should return the answer for the question from given document Ids', async () => {
    const payload = {
      documentIds: ['cltfetcd30000fhh4r8orhzux'],
      userPrompt: 'summarize this overall pdf.',
    };
    return request(app.getHttpServer()).post('/qa').send(payload).expect(201);
  });
  afterAll(async () => {
    await app.close();
  });
});
