import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { StudentJwtPayload } from "./student-jwt.strategy";

export const CurrentStudent = createParamDecorator((_data: unknown, ctx: ExecutionContext): StudentJwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
