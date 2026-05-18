#!/usr/bin/env bun
/**
 * Rewrites relative imports inside services/* packages to tsconfig path aliases.
 *
 * Strategy:
 *   1. For each service tsconfig (services/*\/tsconfig.json) build a `paths` table.
 *   2. Walk every .ts file under that service directory (src/ + tests/).
 *   3. For each ImportDeclaration / ExportDeclaration with a relative specifier,
 *      resolve to an absolute path, compare against each alias' resolved target,
 *      pick the longest prefix match, rewrite the specifier.
 *
 * Cross-package imports (e.g. games tests importing wallets fixtures) stay
 * relative because no alias from the consumer service covers them.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Project, type SourceFile } from 'ts-morph'
import ts from 'typescript'

interface AliasRule {
	prefix: string // e.g. "@/" or "@domain/"
	target: string // absolute filesystem path to the target dir
	priority: number // longer target path = more specific
}

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

const loadAliases = (tsconfigPath: string): AliasRule[] => {
	const raw = readFileSync(tsconfigPath, 'utf8')
	const parsed = ts.parseConfigFileTextToJson(tsconfigPath, raw)
	if (parsed.error) {
		throw new Error(
			`Failed to parse ${tsconfigPath}: ${parsed.error.messageText}`,
		)
	}
	const cfg = parsed.config as {
		compilerOptions?: { paths?: Record<string, string[]> }
	}
	const paths = cfg?.compilerOptions?.paths ?? {}
	const baseDir = dirname(tsconfigPath)
	const rules: AliasRule[] = []
	for (const [aliasKey, targets] of Object.entries(paths) as [
		string,
		string[],
	][]) {
		const target = targets[0]
		if (!aliasKey.endsWith('/*') || !target?.endsWith('/*')) continue
		const prefix = aliasKey.slice(0, -1) // "@/" etc.
		const absTarget = resolve(baseDir, target.slice(0, -1))
		rules.push({ prefix, target: absTarget, priority: absTarget.length })
	}
	rules.sort((a, b) => b.priority - a.priority)
	return rules
}

const toPosix = (p: string): string => p.split(sep).join(posix.sep)

const matchAlias = (
	absImportPath: string,
	rules: AliasRule[],
): string | null => {
	for (const rule of rules) {
		const relPath = relative(rule.target, absImportPath)
		if (relPath === '' || (!relPath.startsWith('..') && !isAbsolute(relPath))) {
			return rule.prefix + toPosix(relPath)
		}
	}
	return null
}

const rewriteFile = (sf: SourceFile, rules: AliasRule[]): number => {
	const sfDir = dirname(sf.getFilePath())
	let changes = 0
	const allDecls = [
		...sf.getImportDeclarations(),
		...sf.getExportDeclarations(),
	]
	for (const decl of allDecls) {
		const spec = decl.getModuleSpecifierValue()
		if (!spec || !spec.startsWith('.')) continue
		const absTarget = resolve(sfDir, spec)
		const alias = matchAlias(absTarget, rules)
		if (alias && alias !== spec) {
			decl.setModuleSpecifier(alias)
			changes++
		}
	}
	return changes
}

const run = (): void => {
	const services = ['services/games', 'services/wallets']
	let totalFiles = 0
	let totalChanges = 0
	for (const svc of services) {
		const tsconfigPath = resolve(repoRoot, svc, 'tsconfig.json')
		if (!existsSync(tsconfigPath)) {
			console.warn(`skip: no tsconfig at ${tsconfigPath}`)
			continue
		}
		const rules = loadAliases(tsconfigPath)
		if (rules.length === 0) {
			console.warn(`skip: no path aliases in ${tsconfigPath}`)
			continue
		}
		console.log(`\n[${svc}] aliases:`)
		for (const r of rules) console.log(`  ${r.prefix}* -> ${r.target}`)

		const project = new Project({ tsConfigFilePath: tsconfigPath })
		// add tests/** explicitly (they live outside `include`)
		const testsDir = resolve(repoRoot, svc, 'tests')
		if (existsSync(testsDir)) {
			project.addSourceFilesAtPaths(`${testsDir.replace(/\\/g, '/')}/**/*.ts`)
		}
		const files = project.getSourceFiles()
		for (const sf of files) {
			const filePath = sf.getFilePath()
			if (filePath.includes('node_modules')) continue
			if (!filePath.startsWith(resolve(repoRoot, svc).replace(/\\/g, '/')))
				continue
			const changed = rewriteFile(sf, rules)
			if (changed > 0) {
				totalFiles += 1
				totalChanges += changed
				sf.saveSync()
				console.log(`  ${changed.toString().padStart(3, ' ')}  ${filePath}`)
			}
		}
	}
	console.log(
		`\nDone. Rewrote ${totalChanges} imports across ${totalFiles} files.`,
	)
}

run()
