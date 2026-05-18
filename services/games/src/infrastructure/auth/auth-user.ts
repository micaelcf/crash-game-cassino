export interface JwtPayload {
	sub: string
	username?: string
	preferred_username?: string
	email?: string
	iss?: string
	aud?: string | string[]
	exp?: number
	iat?: number
	[claim: string]: unknown
}

export interface AuthUser {
	sub: string
	username: string
}

export interface AuthenticatedRequest {
	user: AuthUser
	headers: Record<string, string | string[] | undefined>
}

export const toAuthUser = (payload: JwtPayload): AuthUser => ({
	sub: payload.sub,
	username:
		payload.username ??
		payload.preferred_username ??
		payload.email ??
		payload.sub,
})
