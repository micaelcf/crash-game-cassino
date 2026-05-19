import { useLogto } from "@logto/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/**
 * @logto/react wraps EVERY client call (getAccessToken, etc) through a `proxy`
 * that toggles its own `isLoading` counter true/false. Consuming `isLoading`
 * directly as a render gate causes mount/unmount thrash whenever queries call
 * `getToken` — each call momentarily flips `isLoading` true, which would
 * unmount the page tree, remount it, fire queries again, ad infinitum.
 *
 * This hook latches `ready` once the initial auth probe settles and never
 * flips it back to false, so downstream pages stay mounted across API calls.
 */
export function useRequireAuth(redirectTo = "/login") {
	const { isAuthenticated, isLoading } = useLogto();
	const navigate = useNavigate();
	const latchedRef = useRef(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!latchedRef.current && !isLoading) {
			latchedRef.current = true;
			setReady(true);
		}
	}, [isLoading]);

	useEffect(() => {
		if (ready && !isAuthenticated) {
			navigate({ to: redirectTo });
		}
	}, [ready, isAuthenticated, navigate, redirectTo]);

	return { isAuthenticated, isLoading: !ready };
}
