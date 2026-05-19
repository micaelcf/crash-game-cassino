import type { PagedResult, PaginationParams } from '@crash/contracts'
import type {
	FilterQuery,
	FindOptions,
	Loaded,
} from '@mikro-orm/postgresql'

export type { PagedResult }

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export interface NormalizedPagination {
	page: number
	pageSize: number
	offset: number
	limit: number
}

export const normalizePagination = (
	params: PaginationParams,
): NormalizedPagination => {
	const page = Math.max(1, Math.floor(params.page ?? 1))
	const requestedSize = Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)
	const pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE)
	return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize }
}

interface FindAndCountable<T extends object> {
	findAndCount(
		where: FilterQuery<T>,
		options?: FindOptions<T, any, any, any>,
	): Promise<[Loaded<T, any, any, any>[], number]>
}

export type PaginateOptions<T extends object> = PaginationParams & {
	orderBy: FindOptions<T>['orderBy']
	populate?: FindOptions<T>['populate']
}

export const paginate = async <T extends object, R>(
	repo: FindAndCountable<T>,
	where: FilterQuery<T>,
	opts: PaginateOptions<T>,
	map: (entity: T) => R,
): Promise<PagedResult<R>> => {
	const { page, pageSize, offset, limit } = normalizePagination(opts)
	const [rows, total] = await repo.findAndCount(where, {
		orderBy: opts.orderBy,
		offset,
		limit,
		populate: opts.populate,
	})
	return {
		items: (rows as unknown as T[]).map(map),
		page,
		pageSize,
		total,
	}
}
