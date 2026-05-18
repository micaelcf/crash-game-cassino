export interface PaginationParams {
	page?: number
	pageSize?: number
}

export interface PagedResult<T> {
	items: T[]
	page: number
	pageSize: number
	total: number
}
