import { useEffect, useState } from "react";

const TOKEN_NAMES = [
	"--color-bg-0",
	"--color-bg-1",
	"--color-bg-2",
	"--color-border",
	"--color-fg",
	"--color-fg-muted",
	"--color-fg-dim",
	"--color-primary",
	"--color-primary-hot",
	"--color-secondary",
	"--color-secondary-deep",
	"--color-accent-pink",
	"--color-accent-amber",
	"--color-accent-cyan",
	"--color-danger",
] as const;

export type ThemeTokenName = (typeof TOKEN_NAMES)[number];
export type ThemeTokens = Record<ThemeTokenName, string>;

const FALLBACK: ThemeTokens = {
	"--color-bg-0": "oklch(14% 0.015 40)",
	"--color-bg-1": "oklch(18% 0.018 40)",
	"--color-bg-2": "oklch(22% 0.022 40)",
	"--color-border": "oklch(30% 0.025 50)",
	"--color-fg": "oklch(97% 0.008 60)",
	"--color-fg-muted": "oklch(72% 0.02 50)",
	"--color-fg-dim": "oklch(54% 0.025 50)",
	"--color-primary": "oklch(74% 0.19 55)",
	"--color-primary-hot": "oklch(80% 0.21 50)",
	"--color-secondary": "oklch(78% 0.22 152)",
	"--color-secondary-deep": "oklch(68% 0.2 152)",
	"--color-accent-pink": "oklch(72% 0.27 0)",
	"--color-accent-amber": "oklch(84% 0.18 80)",
	"--color-accent-cyan": "oklch(82% 0.16 200)",
	"--color-danger": "oklch(65% 0.26 27)",
};

export function useThemeTokens(): ThemeTokens {
	const [tokens, setTokens] = useState<ThemeTokens>(FALLBACK);

	useEffect(() => {
		const root = document.documentElement;
		const styles = getComputedStyle(root);
		const resolved = { ...FALLBACK };
		for (const name of TOKEN_NAMES) {
			const value = styles.getPropertyValue(name).trim();
			if (value) resolved[name] = value;
		}
		setTokens(resolved);
	}, []);

	return tokens;
}
