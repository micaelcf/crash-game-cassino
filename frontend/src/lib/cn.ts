import type { BaseUIComponentProps } from "@base-ui/react/internals/types";
import type { ElementType } from "react";

export type ClassValue =
	| string
	| number
	| null
	| false
	| undefined
	// @micaelcf: This is a bit of a hack to allow passing the `className` prop from Base UI components without having to import their types here.
	| BaseUIComponentProps<ElementType, any>["className"]
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
