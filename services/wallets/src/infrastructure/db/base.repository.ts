import { EntityRepository } from '@mikro-orm/postgresql';

export class BaseRepository<T extends object> extends EntityRepository<T> {
  persist(entity: T | T[]): this {
    this.em.persist(entity);
    return this;
  }

  async persistAndFlush(entity: T | T[]): Promise<void> {
    this.em.persist(entity);
    await this.em.flush();
  }

  remove(entity: T): this {
    this.em.remove(entity);
    return this;
  }

  async removeAndFlush(entity: T): Promise<void> {
    await this.em.removeAndFlush(entity);
  }

  async flush(): Promise<void> {
    await this.em.flush();
  }
}
