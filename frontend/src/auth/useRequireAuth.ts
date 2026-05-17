import { useLogto } from "@logto/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function useRequireAuth(redirectTo = "/login") {
	const { isAuthenticated, isLoading } = useLogto();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			navigate({ to: redirectTo });
		}
	}, [isAuthenticated, isLoading, navigate, redirectTo]);

	return { isAuthenticated, isLoading };
}
