#!/usr/bin/env bun
/**
 * Pre-`docker:up` bootstrap. Copies every `*.env.example` to `*.env` when the
 * latter is missing, so a fresh clone can run `bun run docker:up` without any
 * manual `cp` step. Existing `.env` files are never overwritten.
 */

import { copyFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const TARGETS = [
	'services/games/.env',
	'services/wallets/.env',
	'frontend/.env',
] as const

for (const rel of TARGETS) {
	const target = resolve(ROOT, rel)
	const example = `${target}.example`

	if (existsSync(target)) {
		console.log(`✅ ${rel} already exists`)
		continue
	}
	if (!existsSync(example)) {
		console.warn(`⚠️ ${rel}.example not found, skipping`)
		continue
	}
	copyFileSync(example, target)
	console.log(`➕ Created ${rel} from .env.example`)
}
