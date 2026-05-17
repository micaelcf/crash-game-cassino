import type { LogtoConfig } from "@logto/react";
import { env } from "#/env";

export const POST_SIGN_IN_REDIRECT = "/dashboard";
export const POST_SIGN_OUT_REDIRECT = "/";
export const CALLBACK_PATH = "/callback";

export function getCallbackUrl(): string {
	if (typeof window === "undefined") return CALLBACK_PATH;
	return new URL(CALLBACK_PATH, window.location.origin).toString();
}

export function getPostSignOutUrl(): string {
	if (typeof window === "undefined") return POST_SIGN_OUT_REDIRECT;
	return new URL(POST_SIGN_OUT_REDIRECT, window.location.origin).toString();
}

export const logtoConfig: LogtoConfig = {
	endpoint: env.VITE_LOGTO_ENDPOINT,
	appId: env.VITE_LOGTO_APP_ID,
	resources: env.VITE_LOGTO_RESOURCE ? [env.VITE_LOGTO_RESOURCE] : undefined,
};
