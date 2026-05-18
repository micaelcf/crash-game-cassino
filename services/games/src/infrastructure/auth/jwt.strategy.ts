import {
	type AuthUser,
	type JwtPayload,
	toAuthUser,
} from '@infrastructure/auth/auth-user'
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { passportJwtSecret } from 'jwks-rsa'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor() {
		const jwksUri = process.env.JWKS_URI || 'http://localhost:3001/oidc/jwks'
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKeyProvider: passportJwtSecret({
				cache: true,
				rateLimit: true,
				jwksRequestsPerMinute: 5,
				jwksUri,
			}),
		})
	}

	async validate(payload: JwtPayload): Promise<AuthUser> {
		return toAuthUser(payload)
	}
}
