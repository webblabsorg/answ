import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

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

  // CORS configuration - allow localhost (any port) for dev
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow mobile apps/curl
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
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
