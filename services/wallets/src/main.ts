import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  type MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 4002);

  // Idempotent schema sync — keeps `bun run docker:up` working with no
  // separate migration step. Safe mode never drops tables/columns.
  await app.get(MikroORM).schema.update({ safe: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Wallets Service')
    .setDescription('Player wallet management API for Crash Game.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672'],
      queue: 'wallets.events',
      queueOptions: {
        durable: true,
        arguments: { 'x-dead-letter-exchange': 'crash.events.dlx' },
      },
      noAck: false,
    },
  });

  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');
  console.log(`Wallets service running on port ${port} (HTTP & RMQ)`);
}

bootstrap();
