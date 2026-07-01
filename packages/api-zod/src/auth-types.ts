import * as zod from "zod";

export const AuthUserSchema = zod.object({
  id: zod.string(),
  username: zod.string().nullish(),
  firstName: zod.string().nullish(),
  lastName: zod.string().nullish(),
  email: zod.string().nullish(),
  profileImageUrl: zod.string().nullish(),
  role: zod.string().nullish(),
});

export type AuthUser = zod.infer<typeof AuthUserSchema>;

export const GetCurrentAuthUserResponse = zod.object({
  user: AuthUserSchema.nullable(),
});
export type GetCurrentAuthUserResponse = zod.infer<typeof GetCurrentAuthUserResponse>;

export const ExchangeMobileAuthorizationCodeBody = zod.object({
  code: zod.string(),
  code_verifier: zod.string(),
  state: zod.string(),
  nonce: zod.string(),
  redirect_uri: zod.string(),
});
export type ExchangeMobileAuthorizationCodeBody = zod.infer<typeof ExchangeMobileAuthorizationCodeBody>;

export const ExchangeMobileAuthorizationCodeResponse = zod.object({
  token: zod.string(),
  user: AuthUserSchema,
});
export type ExchangeMobileAuthorizationCodeResponse = zod.infer<typeof ExchangeMobileAuthorizationCodeResponse>;

export const LogoutMobileSessionResponse = zod.object({
  success: zod.boolean(),
});
export type LogoutMobileSessionResponse = zod.infer<typeof LogoutMobileSessionResponse>;
