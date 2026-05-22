import type { Type } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'

export interface PagedResponse<T> {
	items: T[]
	page: number
	pageSize: number
	total: number
}

/**
 * Build a Swagger-decorated `Paged<ItemName>` class for a given item DTO.
 *
 * Each call produces a fresh class so the OpenAPI spec exposes a named
 * schema (`PagedBetDto`, `PagedRoundDto`, …) instead of an inline
 * anonymous object — Orval consumes the named $ref cleanly.
 */
export const PagedDto = <T>(itemType: Type<T>): Type<PagedResponse<T>> => {
	class PagedItemsDto {
		items!: T[]

		@ApiProperty({ minimum: 1, example: 1 })
		page!: number

		@ApiProperty({ minimum: 1, maximum: 100, example: 20 })
		pageSize!: number

		@ApiProperty({ minimum: 0, example: 0 })
		total!: number
	}

	ApiProperty({ type: [itemType] })(PagedItemsDto.prototype, 'items')
	Object.defineProperty(PagedItemsDto, 'name', {
		value: `Paged${itemType.name}`,
	})
	return PagedItemsDto as unknown as Type<PagedResponse<T>>
}
