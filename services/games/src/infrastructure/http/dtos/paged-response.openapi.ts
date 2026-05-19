import { applyDecorators } from '@nestjs/common'
import { ApiOkResponse } from '@nestjs/swagger'

type SchemaLike = Record<string, unknown>

export const ApiPagedOkResponse = (
	description: string,
	itemSchema: SchemaLike = { type: 'object' },
) =>
	applyDecorators(
		ApiOkResponse({
			description,
			schema: {
				type: 'object',
				required: ['items', 'page', 'pageSize', 'total'],
				properties: {
					items: { type: 'array', items: itemSchema },
					page: { type: 'integer', minimum: 1, example: 1 },
					pageSize: {
						type: 'integer',
						minimum: 1,
						maximum: 100,
						example: 20,
					},
					total: { type: 'integer', minimum: 0, example: 0 },
				},
			},
		}),
	)
