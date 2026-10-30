import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ClaimsController } from '../src/claims/claims.controller';
import { ClaimsService } from '../src/claims/claims.service';

describe('Claims HTTP API', () => {
  let app: INestApplication;
  const service = {
    assess: jest.fn().mockResolvedValue({
      claimId: 'b6f2a5c4-8e2d-4c8c-9121-000000000001',
      assessmentId: 'b6f2a5c4-8e2d-4c8c-9121-000000000002',
      justified: false,
      status: 'INSUFFICIENT_EVIDENCE',
      confidence: 0.72,
      reasoning: 'The endpoint and study duration are not established.',
    }),
    findById: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [{ provide: ClaimsService, useValue: service }],
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

  afterAll(async () => app.close());

  it('forwards a valid request and returns typed assessment output', async () => {
    await request(app.getHttpServer())
      .post('/api/claims/assess')
      .send({
        claim: 'Reduces wrinkles by 20% in 4 weeks',
        evidence: 'A controlled study was conducted in 100 participants.',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          justified: false,
          status: 'INSUFFICIENT_EVIDENCE',
          confidence: 0.72,
        });
      });
    expect(service.assess).toHaveBeenCalledWith(expect.objectContaining({
      claim: 'Reduces wrinkles by 20% in 4 weeks',
    }));
  });

  it.each([
    { claim: '', evidence: 'Evidence text that is long enough to pass validation.' },
    { claim: 'Short', evidence: 'Evidence text that is long enough to pass validation.' },
    { claim: 'A sufficiently long claim', evidence: 'too short' },
    { claim: 'A sufficiently long claim', evidence: 'Evidence text that is long enough to pass validation.', extra: 'nope' },
    { claim: 'A'.repeat(501), evidence: 'Evidence text that is long enough to pass validation.' },
    { claim: 'A sufficiently long claim', evidence: 'E'.repeat(20001) },
  ])('rejects invalid input with 400', async (body) => {
    await request(app.getHttpServer()).post('/api/claims/assess').send(body).expect(400);
  });

  it('returns claim assessment history by UUID', async () => {
    const id = 'b6f2a5c4-8e2d-4c8c-9121-000000000001';
    service.findById.mockResolvedValueOnce({
      id,
      text: 'Reduces wrinkles by 20% in 4 weeks',
      assessments: [],
    });
    await request(app.getHttpServer()).get(`/api/claims/${id}`).expect(200).expect(({ body }) => {
      expect(body).toMatchObject({ id, assessments: [] });
    });
    expect(service.findById).toHaveBeenCalledWith(id);
  });

  it('returns 404 for an unknown claim', async () => {
    service.findById.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get('/api/claims/b6f2a5c4-8e2d-4c8c-9121-000000000003')
      .expect(404);
  });
});
