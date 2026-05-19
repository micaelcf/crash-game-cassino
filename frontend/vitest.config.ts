import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths()],
	define: {
		"import.meta.env.VITE_LOGTO_ENDPOINT": JSON.stringify(
			"http://localhost:8080/",
		),
		"import.meta.env.VITE_LOGTO_APP_ID": JSON.stringify("test-app-id"),
		"import.meta.env.VITE_LOGTO_RESOURCE": JSON.stringify(
			"http://api.test.local",
		),
		"import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://api.test.local"),
		"import.meta.env.VITE_WS_URL": JSON.stringify("http://ws.test.local"),
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./test/setup.ts"],
		globals: false,
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		css: false,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["src/lib/**", "src/components/**", "src/routes/**"],
			exclude: [
				"src/routeTree.gen.ts",
				"src/styles.css",
				"src/routes/playground/**",
				"src/components/playground/**",
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
			],
		},
	},
});
