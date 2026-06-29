import { Injectable, NestMiddleware } from '@nestjs/common';
import { paginationParameterSchema } from '@sidpro/validators';
import { parseWithZod } from '../utils/zod-validation.util';

type HttpRequest = {
  query: Record<string, unknown>;
};

type Next = (error?: unknown) => void;

@Injectable()
export class PaginationQueryValidationMiddleware implements NestMiddleware {
  use(request: HttpRequest, _response: unknown, next: Next) {
    const page = request.query.page;
    const limit = request.query.limit;

    if (page === undefined && limit === undefined) {
      next();
      return;
    }

    const parsed = parseWithZod(paginationParameterSchema, { page, limit });

    if (parsed.page !== undefined) request.query.page = String(parsed.page);
    if (parsed.limit !== undefined) request.query.limit = String(parsed.limit);

    next();
  }
}
