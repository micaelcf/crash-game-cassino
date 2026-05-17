import { Type } from '@mikro-orm/core';

export class BigIntType extends Type<bigint, string> {
  convertToDatabaseValue(value: bigint | undefined): string {
    if (value === undefined || value === null) {
      return value as any;
    }
    return value.toString();
  }

  convertToJSValue(value: string | undefined): bigint {
    if (value === undefined || value === null) {
      return value as any;
    }
    return BigInt(value);
  }

  getColumnType(): string {
    return 'bigint';
  }
}
