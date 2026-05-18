import { Type } from '@mikro-orm/core'

export class BigIntType extends Type<bigint | null | undefined, string | null> {
	override convertToDatabaseValue(
		value: bigint | null | undefined,
	): string | null {
		if (value === undefined || value === null) {
			return value ?? null
		}
		return value.toString()
	}

	override convertToJSValue(
		value: string | null | undefined,
	): bigint | null | undefined {
		if (value === undefined || value === null) {
			return value
		}
		return BigInt(value)
	}

	override getColumnType(): string {
		return 'bigint'
	}
}
