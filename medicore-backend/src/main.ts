import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Proxy trust (Railway / Render sit behind a reverse proxy) ───────────
  app.set('trust proxy', 1);

  // ── CORS ────────────────────────────────────────────────────────────────
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()), // soporta lista CSV
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Validation ──────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Uploads folder: garantizar que exista al arrancar ──────────────────
  const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
    console.log(`📁 Carpeta de uploads creada en: ${uploadPath}`);
  }
  app.useStaticAssets(uploadPath, { prefix: '/uploads' });

  // ── Swagger (solo en non-prod para no exponer la especificación) ────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Medi-History API')
      .setDescription('API de historial médico personal centralizado')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Port ────────────────────────────────────────────────────────────────
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // 0.0.0.0 requerido en Railway
  console.log(`🏥 Medi-History API en puerto ${port} [${process.env.NODE_ENV ?? 'development'}]`);
}
bootstrap();
