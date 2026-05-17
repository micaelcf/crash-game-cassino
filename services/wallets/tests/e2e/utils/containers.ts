import 'reflect-metadata';
import {
  GenericContainer,
  StartedTestContainer,
  Wait,
} from 'testcontainers';

export interface RabbitHandle {
  url: string;
  managementUrl: string;
  username: string;
  password: string;
  container: StartedTestContainer;
}

export interface PgHandle {
  url: string;
  container: StartedTestContainer;
}

export const startRabbit = async (): Promise<RabbitHandle> => {
  const username = 'admin';
  const password = 'admin';
  const container = await new GenericContainer(
    'rabbitmq:4.2.4-management-alpine',
  )
    .withEnvironment({
      RABBITMQ_DEFAULT_USER: username,
      RABBITMQ_DEFAULT_PASS: password,
    })
    .withExposedPorts(5672, 15672)
    .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
    .withStartupTimeout(120_000)
    .start();

  return {
    url: `amqp://${username}:${password}@${container.getHost()}:${container.getMappedPort(5672)}`,
    managementUrl: `http://${container.getHost()}:${container.getMappedPort(15672)}`,
    username,
    password,
    container,
  };
};

export const startPostgres = async (): Promise<PgHandle> => {
  const container = await new GenericContainer('postgres:18.3-alpine')
    .withEnvironment({
      POSTGRES_USER: 'admin',
      POSTGRES_PASSWORD: 'admin',
      POSTGRES_DB: 'test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(
        /database system is ready to accept connections/,
        2,
      ),
    )
    .withStartupTimeout(120_000)
    .start();

  return {
    url: `postgresql://admin:admin@${container.getHost()}:${container.getMappedPort(5432)}/test`,
    container,
  };
};

export const stopContainer = async (handle: {
  container: StartedTestContainer;
}): Promise<void> => {
  await handle.container.stop({ timeout: 10_000 });
};
