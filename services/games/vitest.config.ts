import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	esbuild: false,
	oxc: false,
	plugins: [
		tsconfigPaths(),
		swc.vite({
			module: { type: 'es6' },
			jsc: {
				target: 'es2022',
				parser: { syntax: 'typescript', decorators: true },
				transform: { legacyDecorator: true, decoratorMetadata: true },
				keepClassNames: true,
			},
		}),
	],
	test: {
		globals: false,
		environment: 'node',
		setupFiles: ['tests/setup.ts'],
		include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
		pool: 'forks',
		forks: { singleFork: true },
		fileParallelism: false,
		testTimeout: 15_000,
		hookTimeout: 60_000,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/migrations/**', 'src/main.ts', 'src/**/*.spec.ts'],
		},
	},
})
