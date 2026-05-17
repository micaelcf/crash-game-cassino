import { EntityRepository } from '@mikro-orm/postgresql'

export class BaseRepository<T extends object> extends EntityRepository<T> {
	persist(entity: T | T[]): this {
		this.em.persist(entity)
		return this
	}

	remove(entity: T): this {
		this.em.remove(entity)
		return this
	}

	async flush(): Promise<void> {
		await this.em.flush()
	}
}
