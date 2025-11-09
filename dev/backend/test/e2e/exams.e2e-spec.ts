import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Exams (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let examId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create a test user and get token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `exam.test.${Date.now()}@example.com`,
        password: 'Test123!@#',
        name: 'Exam Test User',
      });

    accessToken = registerResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/exams (GET)', () => {
    it('should get all exams without token (public)', () => {
      return request(app.getHttpServer())
        .get('/exams')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            examId = res.body[0].id;
            expect(res.body[0]).toHaveProperty('name');
            expect(res.body[0]).toHaveProperty('code');
            expect(res.body[0]).toHaveProperty('sections');
          }
        });
    });
  });

  describe('/exams/:id (GET)', () => {
    it('should get exam details', async () => {
      const examsResponse = await request(app.getHttpServer()).get('/exams');
      
      if (examsResponse.body.length === 0) {
        return; // Skip if no exams in database
      }

      const examId = examsResponse.body[0].id;

      return request(app.getHttpServer())
        .get(`/exams/${examId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('code');
          expect(res.body).toHaveProperty('sections');
          expect(res.body.sections).toBeInstanceOf(Array);
        });
    });

    it('should return 404 for non-existent exam', () => {
      return request(app.getHttpServer())
        .get('/exams/non-existent-id')
        .expect(404);
    });
  });

  describe('/exams/code/:code (GET)', () => {
    it('should get exam by code', async () => {
      const examsResponse = await request(app.getHttpServer()).get('/exams');
      
      if (examsResponse.body.length === 0) {
        return; // Skip if no exams
      }

      const examCode = examsResponse.body[0].code;

      return request(app.getHttpServer())
        .get(`/exams/code/${examCode}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(examCode);
        });
    });
  });
});
