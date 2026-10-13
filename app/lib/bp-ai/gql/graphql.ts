/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type AuthPayloadFieldsFragment = { token: string, refresh_token: string, user_id: string, tenant: string };

export type LoginMutationVariables = Exact<{
  email: string;
  password: string;
}>;


export type LoginMutation = { login: { token: string, refresh_token: string, user_id: string, tenant: string } };

export type SignupMutationVariables = Exact<{
  email: string;
  password: string;
  name: string;
}>;


export type SignupMutation = { signup: { token: string, refresh_token: string, user_id: string, tenant: string } };

export type AcceptInvitationMutationVariables = Exact<{
  token: string;
  password: string;
}>;


export type AcceptInvitationMutation = { acceptInvitation: { token: string, refresh_token: string, user_id: string, tenant: string } };

export type RefreshMutationVariables = Exact<{
  refresh_token: string;
}>;


export type RefreshMutation = { refreshToken: { token: string, refresh_token: string, user_id: string, tenant: string } };

export type LogoutMutationVariables = Exact<{
  refresh_token: string;
}>;


export type LogoutMutation = { logout: boolean };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const AuthPayloadFieldsFragmentDoc = new TypedDocumentString(`
    fragment AuthPayloadFields on AuthPayload {
  token
  refresh_token
  user_id
  tenant
}
    `, {"fragmentName":"AuthPayloadFields"}) as unknown as TypedDocumentString<AuthPayloadFieldsFragment, unknown>;
export const LoginDocument = new TypedDocumentString(`
    mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    ...AuthPayloadFields
  }
}
    fragment AuthPayloadFields on AuthPayload {
  token
  refresh_token
  user_id
  tenant
}`) as unknown as TypedDocumentString<LoginMutation, LoginMutationVariables>;
export const SignupDocument = new TypedDocumentString(`
    mutation Signup($email: String!, $password: String!, $name: String!) {
  signup(email: $email, password: $password, name: $name) {
    ...AuthPayloadFields
  }
}
    fragment AuthPayloadFields on AuthPayload {
  token
  refresh_token
  user_id
  tenant
}`) as unknown as TypedDocumentString<SignupMutation, SignupMutationVariables>;
export const AcceptInvitationDocument = new TypedDocumentString(`
    mutation AcceptInvitation($token: String!, $password: String!) {
  acceptInvitation(token: $token, password: $password) {
    ...AuthPayloadFields
  }
}
    fragment AuthPayloadFields on AuthPayload {
  token
  refresh_token
  user_id
  tenant
}`) as unknown as TypedDocumentString<AcceptInvitationMutation, AcceptInvitationMutationVariables>;
export const RefreshDocument = new TypedDocumentString(`
    mutation Refresh($refresh_token: String!) {
  refreshToken(refresh_token: $refresh_token) {
    ...AuthPayloadFields
  }
}
    fragment AuthPayloadFields on AuthPayload {
  token
  refresh_token
  user_id
  tenant
}`) as unknown as TypedDocumentString<RefreshMutation, RefreshMutationVariables>;
export const LogoutDocument = new TypedDocumentString(`
    mutation Logout($refresh_token: String!) {
  logout(refresh_token: $refresh_token)
}
    `) as unknown as TypedDocumentString<LogoutMutation, LogoutMutationVariables>;