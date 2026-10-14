/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** A check-in: at least one mood and at most three. */
export type CreateMoodHistoryInput = {
  moods: Array<MoodEntryInput>;
  note?: string | null | undefined;
  user: string;
};

export type MoodEntryInput = {
  id: string;
  /**
   * 0..10. **Ignored for a mood that has a `level`** — the server derives the
   * intensity from the triad position, so "how much" is not stated twice. Out of
   * range for a mood without one ⇒ `BAD_REQUEST`.
   */
  intensity?: number | null | undefined;
};

/** How to draw a question. See `Question.display`. */
export type QuestionDisplay =
  /** Tappable pills. */
  | 'CHIPS'
  /** An arc of faces, read low to high — the `order` IS the direction. */
  | 'EMOJI_SCALE'
  /** Cards with an illustration — see `QuestionOption.imageUrl`. */
  | 'IMAGE_CARDS'
  /** An arc of numbers. */
  | 'NUMERIC_SCALE'
  /** Free text. */
  | 'TEXT';

export type QuestionType =
  /** Between one and `max_selections` options. */
  | 'MULTISELECT'
  /** Free text. Cannot have options. */
  | 'OPEN'
  /** Exactly one option. */
  | 'SELECT_ONE';

/**
 * Role represents the access tier carried by the authenticated user.
 * Legacy JWTs without a role claim default to STUDENT.
 *
 * The 8 canonical values map one-to-one onto the `user_type` catalog seeded into
 * every tenant (`school-admin` ⇄ SCHOOL_ADMIN) and onto the `auth.Role` protobuf
 * enum. This enum is enforced by the parser: `UnmarshalGQL` rejects any string
 * outside it before the resolver runs, so a value missing here cannot even be
 * sent. NOTE: widening this enum grants nothing on its own — every field gated
 * gated on the ADMIN role still requires exactly that.
 *
 * Listed from least to most privilege, matching the `rank` of the seeded
 * `user_type` catalog. The rank values are data, not part of this contract.
 */
export type Role =
  | 'ADMIN'
  | 'COUNSELOR'
  | 'PARENT'
  | 'SCHOOL_ADMIN'
  | 'STUDENT'
  | 'SUPPORT'
  | 'TEACHER'
  | 'TUTOR';

export type AuthPayloadFieldsFragment = { token: string, refresh_token: string, user_id: string, tenant: string, role: Role, expiresAt: string, refreshExpiresAt: string | null };

export type LoginMutationVariables = Exact<{
  email: string;
  password: string;
}>;


export type LoginMutation = { login: { token: string, refresh_token: string, user_id: string, tenant: string, role: Role, expiresAt: string, refreshExpiresAt: string | null } };

export type SignupMutationVariables = Exact<{
  email: string;
  password: string;
  name: string;
}>;


export type SignupMutation = { signup: { token: string, refresh_token: string, user_id: string, tenant: string, role: Role, expiresAt: string, refreshExpiresAt: string | null } };

export type AcceptInvitationMutationVariables = Exact<{
  token: string;
  password: string;
}>;


export type AcceptInvitationMutation = { acceptInvitation: { token: string, refresh_token: string, user_id: string, tenant: string, role: Role, expiresAt: string, refreshExpiresAt: string | null } };

export type RefreshMutationVariables = Exact<{
  refresh_token: string;
}>;


export type RefreshMutation = { refreshToken: { token: string, refresh_token: string, user_id: string, tenant: string, role: Role, expiresAt: string, refreshExpiresAt: string | null } };

export type LogoutMutationVariables = Exact<{
  refresh_token: string;
}>;


export type LogoutMutation = { logout: boolean };

export type LtiLaunchRoleQueryVariables = Exact<{
  ltiToken: string;
}>;


export type LtiLaunchRoleQuery = { ltiLaunchRole: { role: Role | null } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { preferredName: string | null, user: { avatar_id: string | null } | null } };

export type ListCheckinMoodsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListCheckinMoodsQuery = { listMoods: { moods: Array<{ id: string, identifier: string, label: string, level: number | null, emoji: string | null, color: string, secondaryColor: string | null, chips: Array<string>, order: number, category: { id: string, identifier: string, label: string, order: number } | null }> } };

export type CreateMoodHistoryMutationVariables = Exact<{
  input: CreateMoodHistoryInput;
}>;


export type CreateMoodHistoryMutation = { createMoodHistory: { id: string, note: string } };

export type ListQuestionsQueryVariables = Exact<{
  category?: string | null | undefined;
  keys?: Array<string> | string | null | undefined;
  type?: QuestionType | null | undefined;
  unansweredBy?: string | null | undefined;
  pageSize?: number | null | undefined;
}>;


export type ListQuestionsQuery = { listQuestions: { questions: Array<{ id: string, key: string | null, label: string, category: string, type: QuestionType, display: QuestionDisplay | null, max_selections: number, options: Array<{ id: string, label: string, value: string, emoji: string | null, imageUrl: string | null, order: number }> }> } };

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
  role
  expiresAt
  refreshExpiresAt
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
  role
  expiresAt
  refreshExpiresAt
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
  role
  expiresAt
  refreshExpiresAt
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
  role
  expiresAt
  refreshExpiresAt
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
  role
  expiresAt
  refreshExpiresAt
}`) as unknown as TypedDocumentString<RefreshMutation, RefreshMutationVariables>;
export const LogoutDocument = new TypedDocumentString(`
    mutation Logout($refresh_token: String!) {
  logout(refresh_token: $refresh_token)
}
    `) as unknown as TypedDocumentString<LogoutMutation, LogoutMutationVariables>;
export const LtiLaunchRoleDocument = new TypedDocumentString(`
    query LtiLaunchRole($ltiToken: String!) {
  ltiLaunchRole(ltiToken: $ltiToken) {
    role
  }
}
    `) as unknown as TypedDocumentString<LtiLaunchRoleQuery, LtiLaunchRoleQueryVariables>;
export const MeDocument = new TypedDocumentString(`
    query Me {
  me {
    preferredName
    user {
      avatar_id
    }
  }
}
    `) as unknown as TypedDocumentString<MeQuery, MeQueryVariables>;
export const ListCheckinMoodsDocument = new TypedDocumentString(`
    query ListCheckinMoods {
  listMoods(curatedOnly: true) {
    moods {
      id
      identifier
      label
      level
      emoji
      color
      secondaryColor
      chips
      order
      category {
        id
        identifier
        label
        order
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ListCheckinMoodsQuery, ListCheckinMoodsQueryVariables>;
export const CreateMoodHistoryDocument = new TypedDocumentString(`
    mutation CreateMoodHistory($input: CreateMoodHistoryInput!) {
  createMoodHistory(input: $input) {
    id
    note
  }
}
    `) as unknown as TypedDocumentString<CreateMoodHistoryMutation, CreateMoodHistoryMutationVariables>;
export const ListQuestionsDocument = new TypedDocumentString(`
    query ListQuestions($category: String, $keys: [String!], $type: QuestionType, $unansweredBy: ID, $pageSize: Int) {
  listQuestions(
    category: $category
    keys: $keys
    type: $type
    unansweredBy: $unansweredBy
    status: ACTIVE
    pageSize: $pageSize
  ) {
    questions {
      id
      key
      label
      category
      type
      display
      max_selections
      options {
        id
        label
        value
        emoji
        imageUrl
        order
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ListQuestionsQuery, ListQuestionsQueryVariables>;