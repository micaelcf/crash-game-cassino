import { LogtoProvider } from "@logto/react";
import type { ReactNode } from "react";
import { logtoConfig } from "#/lib/application/auth/config";

export function AuthProvider({ children }: { children: ReactNode }) {
	return <LogtoProvider config={logtoConfig}>{children}</LogtoProvider>;
}
