import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { promises as fs } from "fs";
import * as path from "path";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config/app-config.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(AppConfigService);
  app.enableCors({ origin: config.corsOrigins, credentials: true });

  const uploadRoot = path.resolve(config.media.uploadRoot);
  await fs.mkdir(uploadRoot, { recursive: true });
  app.useStaticAssets(uploadRoot, { prefix: "/uploads/" });

  await app.listen(config.port);
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${config.port}`);
}

bootstrap();
