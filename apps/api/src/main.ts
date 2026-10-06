import {
  ValidationPipe,
} from '@nestjs/common';
import {
  NestFactory,
} from '@nestjs/core';
import cookieParser from 'cookie-parser';

import {
  AppModule,
} from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create(
      AppModule,
    );

  app.enableCors({
    origin:
      process.env.WEB_ORIGIN ??
      'http://localhost:3000',
    credentials: true,
  });

  app.use(
    cookieParser(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted:
        true,
      transform: true,
    }),
  );

  app.setGlobalPrefix(
    'api',
  );

  app.enableShutdownHooks();

  const port =
    Number(
      process.env.API_PORT ??
        4000,
    );

  await app.listen(port);

  console.log(
    `Bagheri API running on http://localhost:${port}/api`,
  );
}

void bootstrap();