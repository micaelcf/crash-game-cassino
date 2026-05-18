export type ClassValue =
	| string
	| number
	| null
	| false
	| undefined
	| ClassValue[];

export function cn(...inputs: ClassValue[]): string {
	const out: string[] = [];
	const walk = (v: ClassValue) => {
		if (!v && v !== 0) return;
		if (Array.isArray(v)) {
			for (const item of v) walk(item);
			return;
		}
		out.push(String(v));
	};
	for (const v of inputs) walk(v);
	return out.join(" ");
}
