import { LogtoProvider } from "@logto/react";
import type { ReactNode } from "react";
import { logtoConfig } from "./logto-config";

export function AuthProvider({ children }: { children: ReactNode }) {
	return <LogtoProvider config={logtoConfig}>{children}</LogtoProvider>;
}
