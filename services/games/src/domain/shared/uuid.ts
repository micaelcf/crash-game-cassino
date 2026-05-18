import { randomBytes } from 'node:crypto'

export function uuidv7(): string {
	const ms = Date.now()
	const bytes = Buffer.alloc(16)
	bytes.writeUIntBE(Math.floor(ms / 2 ** 16), 0, 4)
	bytes.writeUIntBE(ms % 2 ** 16, 4, 2)
	randomBytes(10).copy(bytes, 6)
	bytes[6] = (bytes[6] & 0x0f) | 0x70
	bytes[8] = (bytes[8] & 0x3f) | 0x80
	const hex = bytes.toString('hex')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
