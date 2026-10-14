/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** One answer of a check-in. `user` is the check-in's, never per answer. */
export type CheckInAnswerInput = {
  answer?: string | null | undefined;
  optionIds?: Array<string> | null | undefined;
  questionId: string;
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

/** What a student may choose to share. */
export type PrivacySettingKey =
  | 'CLASS_STATS'
  | 'JOURNAL'
  | 'MOOD';

export type PrivacySettingsInput = {
  classStats?: boolean | null | undefined;
  mood?: boolean | null | undefined;
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

/**
 * A whole check-in: one to three moods and the answers to the questions asked
 * beside them.
 */
export type SubmitCheckInInput = {
  answers?: Array<CheckInAnswerInput> | null | undefined;
  moods: Array<MoodEntryInput>;
  note?: string | null | undefined;
  /** Whose check-in. Absent ⇒ the caller's own; another id needs ADMIN. */
  user?: string | null | undefined;
};

export type AuthPayloadFieldsFragment = { token: string, refresh_token: string, user_id: string, tenant: string, role: Role, expiresAt: string, refreshExpiresAt: string | null };

export type LoginMutationVariables = Exact<{
  email: string;
  password: string;
}>;


export type LoginMutation = { login: { token: string, refresh_token: string, user_id: string, tenant: string, role: Role, expiresAt: string, refreshExpiresAt: string | null } };

export type JoinTenantMutationVariables = Exact<{
  code: string;
  email: string;
  name: string;
}>;


export type JoinTenantMutation = { joinTenant: boolean };

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

export type MyGradesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyGradesQuery = { myGrades: { lmsConnected: boolean, studentMatched: boolean, courses: Array<{ lmsType: string, courseExternalId: string, courseName: string, teacherName: string, currentScore: number | null, currentGrade: string | null, attendancePercent: number | null }> } };

export type LtiLaunchRoleQueryVariables = Exact<{
  ltiToken: string;
}>;


export type LtiLaunchRoleQuery = { ltiLaunchRole: { role: Role | null } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { preferredName: string | null, user: { avatar_id: string | null, onboardingCompletedAt: string | null, avatar: { id: string, name: string, image_url: string, background: string | null } | null } | null } };

export type ListCheckinMoodsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListCheckinMoodsQuery = { listMoods: { moods: Array<{ id: string, identifier: string, label: string, level: number | null, emoji: string | null, color: string, secondaryColor: string | null, chips: Array<string>, order: number, category: { id: string, identifier: string, label: string, order: number } | null }> } };

export type SubmitCheckInMutationVariables = Exact<{
  input: SubmitCheckInInput;
}>;


export type SubmitCheckInMutation = { submitCheckIn: { moodHistory: { id: string, note: string }, answers: Array<{ id: string, questionId: string | null }> } };

export type PasswordPolicyQueryVariables = Exact<{ [key: string]: never; }>;


export type PasswordPolicyQuery = { passwordPolicy: { minLength: number, maxBytes: number } };

export type MyPrivacySettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPrivacySettingsQuery = { myPrivacySettings: Array<{ key: PrivacySettingKey, label: string, description: string, hint: string, enabled: boolean, editable: boolean }> };

export type UpdateMyPrivacySettingsMutationVariables = Exact<{
  input: PrivacySettingsInput;
}>;


export type UpdateMyPrivacySettingsMutation = { updateMyPrivacySettings: Array<{ key: PrivacySettingKey, label: string, description: string, hint: string, enabled: boolean, editable: boolean }> };

export type CompleteOnboardingMutationVariables = Exact<{ [key: string]: never; }>;


export type CompleteOnboardingMutation = { completeOnboarding: { id: string, onboardingCompletedAt: string | null } };

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
export const JoinTenantDocument = new TypedDocumentString(`
    mutation JoinTenant($code: String!, $email: String!, $name: String!) {
  joinTenant(code: $code, email: $email, name: $name)
}
    `) as unknown as TypedDocumentString<JoinTenantMutation, JoinTenantMutationVariables>;
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
export const MyGradesDocument = new TypedDocumentString(`
    query MyGrades {
  myGrades {
    lmsConnected
    studentMatched
    courses {
      lmsType
      courseExternalId
      courseName
      teacherName
      currentScore
      currentGrade
      attendancePercent
    }
  }
}
    `) as unknown as TypedDocumentString<MyGradesQuery, MyGradesQueryVariables>;
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
      avatar {
        id
        name
        image_url
        background
      }
      onboardingCompletedAt
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
export const SubmitCheckInDocument = new TypedDocumentString(`
    mutation SubmitCheckIn($input: SubmitCheckInInput!) {
  submitCheckIn(input: $input) {
    moodHistory {
      id
      note
    }
    answers {
      id
      questionId
    }
  }
}
    `) as unknown as TypedDocumentString<SubmitCheckInMutation, SubmitCheckInMutationVariables>;
export const PasswordPolicyDocument = new TypedDocumentString(`
    query PasswordPolicy {
  passwordPolicy {
    minLength
    maxBytes
  }
}
    `) as unknown as TypedDocumentString<PasswordPolicyQuery, PasswordPolicyQueryVariables>;
export const MyPrivacySettingsDocument = new TypedDocumentString(`
    query MyPrivacySettings {
  myPrivacySettings {
    key
    label
    description
    hint
    enabled
    editable
  }
}
    `) as unknown as TypedDocumentString<MyPrivacySettingsQuery, MyPrivacySettingsQueryVariables>;
export const UpdateMyPrivacySettingsDocument = new TypedDocumentString(`
    mutation UpdateMyPrivacySettings($input: PrivacySettingsInput!) {
  updateMyPrivacySettings(input: $input) {
    key
    label
    description
    hint
    enabled
    editable
  }
}
    `) as unknown as TypedDocumentString<UpdateMyPrivacySettingsMutation, UpdateMyPrivacySettingsMutationVariables>;
export const CompleteOnboardingDocument = new TypedDocumentString(`
    mutation CompleteOnboarding {
  completeOnboarding {
    id
    onboardingCompletedAt
  }
}
    `) as unknown as TypedDocumentString<CompleteOnboardingMutation, CompleteOnboardingMutationVariables>;
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