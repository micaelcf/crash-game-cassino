import type { PagedResult, PaginationParams } from '@crash/contracts'
import type { FilterQuery, FindOptions, Loaded } from '@mikro-orm/postgresql'

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

interface FindAndCountable<
	T,
	Hint extends string = never,
	Fields extends string = never,
	Excludes extends string = never,
> {
	findAndCount(
		where: FilterQuery<T>,
		options?: FindOptions<T, Hint, Fields, Excludes>,
	): Promise<[Loaded<T, Hint, Fields, Excludes>[], number]>
}

export type PaginateOptions<
	T,
	Hint extends string = never,
	Fields extends string = never,
	Excludes extends string = never,
> = PaginationParams & {
	orderBy: FindOptions<T, Hint, Fields, Excludes>['orderBy']
	populate?: FindOptions<T, Hint, Fields, Excludes>['populate']
}

export const paginate = async <
	T,
	R,
	Hint extends string = never,
	Fields extends string = never,
	Excludes extends string = never,
>(
	repo: FindAndCountable<T, Hint, Fields, Excludes>,
	where: FilterQuery<T>,
	opts: PaginateOptions<T, Hint, Fields, Excludes>,
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
