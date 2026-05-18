import { useLogto } from "@logto/react";
import { useEffect, useState } from "react";

export function useCurrentUserSub(): string | undefined {
	const { isAuthenticated, getIdTokenClaims } = useLogto();
	const [sub, setSub] = useState<string | undefined>();

	useEffect(() => {
		if (!isAuthenticated) {
			setSub(undefined);
			return;
		}
		let cancelled = false;
		void getIdTokenClaims().then((claims) => {
			if (!cancelled) setSub(claims?.sub);
		});
		return () => {
			cancelled = true;
		};
	}, [isAuthenticated, getIdTokenClaims]);

	return sub;
}
