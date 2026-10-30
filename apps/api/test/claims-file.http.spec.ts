import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AssessmentAiService } from '../src/claims/assessment-ai.service';
import { ClaimsController } from '../src/claims/claims.controller';
import { ClaimsService } from '../src/claims/claims.service';
import { FileClaimsStoreService } from '../src/storage/file-claims-store.service';

describe('Claims HTTP API with file persistence', () => {
  let app: INestApplication;
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'claims-http-test-'));
    const config = {
      get: (key: string) => key === 'CLAIMS_DATA_FILE'
        ? join(directory, 'claims.json')
        : key === 'GEMINI_MODEL'
          ? 'test-model'
          : undefined,
    } as ConfigService;
    const store = new FileClaimsStoreService(config);
    const ai = {
      evaluate: jest.fn().mockResolvedValue({
        status: 'INSUFFICIENT_EVIDENCE',
        confidence: 0.82,
        reasoning: 'The study details are insufficient to establish the exact claim.',
      }),
      getModel: jest.fn().mockReturnValue('test-model'),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [
        ClaimsService,
        { provide: AssessmentAiService, useValue: ai },
        { provide: FileClaimsStoreService, useValue: store },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });

  it('assesses, persists, and retrieves a claim using the file store', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/claims/assess')
      .send({
        claim: 'Reduces wrinkles by 20% in 4 weeks',
        evidence: 'A synthetic study summary without enough endpoint details.',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      justified: false,
      status: 'INSUFFICIENT_EVIDENCE',
      confidence: 0.82,
    });

    const saved = await request(app.getHttpServer())
      .get(`/api/claims/${response.body.claimId}`)
      .expect(200);
    expect(saved.body).toMatchObject({
      id: response.body.claimId,
      assessments: [{
        id: response.body.assessmentId,
        evidence: 'A synthetic study summary without enough endpoint details.',
        status: 'INSUFFICIENT_EVIDENCE',
        model: 'test-model',
      }],
    });
  });
});
