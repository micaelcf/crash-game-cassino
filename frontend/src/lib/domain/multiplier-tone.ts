export type Tone = "danger" | "cyan" | "orange" | "green" | "pink";

const ORDER: { threshold: number; tone: Tone }[] = [
	{ threshold: 150, tone: "danger" },
	{ threshold: 200, tone: "cyan" },
	{ threshold: 500, tone: "orange" },
	{ threshold: 1000, tone: "green" },
];

export function toneForHundredths(h: number): Tone {
	for (const { threshold, tone } of ORDER) {
		if (h < threshold) return tone;
	}
	return "pink";
}

export const TONE_TEXT: Record<Tone, string> = {
	danger: "text-(--color-danger)",
	cyan: "text-(--color-accent-cyan)",
	orange: "text-(--color-primary)",
	green: "text-(--color-secondary)",
	pink: "text-(--color-accent-pink)",
};

export const TONE_BG_SOFT: Record<Tone, string> = {
	danger: "bg-(--color-danger)/15",
	cyan: "bg-(--color-accent-cyan)/15",
	orange: "bg-(--color-primary)/15",
	green: "bg-(--color-secondary)/15",
	pink: "bg-(--color-accent-pink)/15",
};

export const TONE_RING: Record<Tone, string> = {
	danger: "ring-1 ring-inset ring-(--color-danger)/40",
	cyan: "ring-1 ring-inset ring-(--color-accent-cyan)/40",
	orange: "ring-1 ring-inset ring-(--color-primary)/40",
	green: "ring-1 ring-inset ring-(--color-secondary)/40",
	pink: "ring-1 ring-inset ring-(--color-accent-pink)/40",
};

export const TONE_VAR: Record<Tone, string> = {
	danger: "--color-danger",
	cyan: "--color-accent-cyan",
	orange: "--color-primary",
	green: "--color-secondary",
	pink: "--color-accent-pink",
};
