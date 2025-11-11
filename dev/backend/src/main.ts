import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import type { Request, Response } from 'express';

async function bootstrap() {
  // Enable access to rawBody for Stripe webhook signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }));

  // Compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration – reflect allowed origin (supports comma‑separated CORS_ORIGIN)
  const envOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const defaultLocal = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
  const allowList = new Set([...defaultLocal, ...envOrigins]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser clients
      if (allowList.has(origin)) return callback(null, true);
      // Allow any localhost port in development as a fallback
      if (/^http:\/\/(localhost|127\.0\.0\.1):(\d+)$/.test(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  // Ensure Vary: Origin and proper preflight reflection
  app.use((req: Request, res: Response, next) => {
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      res.header('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      }
    }
    next();
  });

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Answly API')
    .setDescription('Answly Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Exams', 'Exam catalog and management')
    .addTag('Questions', 'Question bank management')
    .addTag('Test Sessions', 'Test-taking and session management')
    .addTag('Admin', 'Administrative operations')
    .addTag('Audit Logs', 'Audit logging and tracking')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Answly API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`🔒 Security: Helmet + Rate Limiting enabled`);
  console.log(`⚡ Performance: Caching + Compression enabled`);
}

bootstrap();
