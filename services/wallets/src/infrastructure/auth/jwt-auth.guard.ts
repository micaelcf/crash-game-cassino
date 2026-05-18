import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	canActivate(context: ExecutionContext) {
		// Para simplificar testes locais onde o IdP não está configurado perfeitamente,
		// ou se houver um header especial 'x-mock-user-id', podemos ignorar o JWT real.
		const request = context.switchToHttp().getRequest()
		const mockUser = request.headers['x-mock-user-id']
		if (mockUser) {
			request.user = { sub: mockUser }
			return true
		}
		return super.canActivate(context)
	}
}
