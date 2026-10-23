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

export type CollectibleSection =
  | 'ABOUT'
  | 'MOOD'
  | 'SHOP'
  | 'WINS'
  | 'WRITE';

export type CreateWinGratitudeInput = {
  category?: string | null | undefined;
  description?: string | null | undefined;
  emotion?: string | null | undefined;
  question?: string | null | undefined;
  related_goal?: string | null | undefined;
  shared_with?: Array<string> | null | undefined;
  title: string;
  type: string;
  user: string;
};

export type DailyCardFamily =
  | 'ABOUT'
  | 'MOOD'
  | 'WINS'
  | 'WRITE';

/** Input for reportInterventionEvent. */
export type InterventionEventInput = {
  eventType: InterventionEventType;
  /**
   * ISO 8601 UTC client timestamp of when it happened. Omitted ⇒ the server's
   * clock. A value in the future or predating the session is rejected.
   */
  occurredAt?: string | null | undefined;
  sessionId: string;
  /** Only meaningful for TOOL_SELECTED: the InterventionTool.id the student picked. */
  toolId?: string | null | undefined;
};

/**
 * One L5 engagement event the client reports against an intervention session
 * (step-28, unit L5-B). SAD ref: §7.14 Intervention Telemetry.
 */
export type InterventionEventType =
  | 'COMPLETED'
  | 'DISMISSED'
  | 'TOOL_SELECTED'
  | 'VIEWED';

/**
 * Intervention routing pathway determined by risk level (SAD §7.2 Decision Engine).
 * - ROUTINE:          risk level 0-2 — standard growth support
 * - OBSERVATION:      risk level 3   — elevated monitoring with enriched support
 * - IMMEDIATE_SAFETY: risk level 4-6 — crisis response with human-in-the-loop
 */
export type InterventionPathway =
  | 'IMMEDIATE_SAFETY'
  | 'OBSERVATION'
  | 'ROUTINE';

/**
 * Intervention FSM state — strict linear order (SAD §7.5):
 *   EXPRESSION → SUPPORT → ACTION → FOLLOW_UP
 */
export type InterventionState =
  | 'ACTION'
  | 'EXPRESSION'
  | 'FOLLOW_UP'
  | 'SUPPORT';

/**
 * The five metrics Layer 2 computes.
 *
 * An enum and not a string: the wire name is snake_case (`mood_baseline`), the
 * console sent camelCase, and a name that does not match produces **zero rows** —
 * indistinguishable from "this cohort has no data". That is why `/metrics` showed
 * nothing at all until step-14.
 */
export type MetricName =
  | 'ENGAGEMENT_DELTA'
  | 'MOOD_BASELINE'
  | 'ROUTINE_CONSISTENCY'
  | 'SLEEP_TREND'
  | 'SUPPORT_INDEX';

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
 * Input for recording the outcome of a completed intervention session.
 * SAD ref: §7.10 Outcome & Effectiveness.
 */
export type RecordOutcomeInput = {
  engagementRecovery: number;
  humanRating?: number | null | undefined;
  moodDelta: number;
  sessionId: string;
  studentId: string;
  toolId: string;
  toolReuseRate: number;
};

/** The four risk tiers of metrics-engine's categorical classification. */
export type RiskTier =
  | 'CRITICAL'
  | 'HIGH'
  | 'LOW'
  | 'MODERATE';

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
  /**
   * The chosen option of `checkin.sleep`. It becomes a sleep_profile with that
   * quality in the same write — do NOT also send it as an answer. Not a live
   * option of that question ⇒ `BAD_REQUEST`.
   */
  sleepOptionId?: string | null | undefined;
  /** Whose check-in. Absent ⇒ the caller's own; another id needs ADMIN. */
  user?: string | null | undefined;
};

/** Support block rendering type (SAD §7.3 Support Layer). */
export type SupportBlockType =
  | 'NORMALIZATION'
  | 'PSYCHOEDUCATION'
  | 'VALIDATION';

/** Direction of a metric against its baseline (metrics-engine `status`). */
export type Trend =
  | 'CONSENT_REVOKED'
  | 'DECLINING'
  | 'IMPROVING'
  | 'INSUFFICIENT_DATA'
  | 'STABLE';

/**
 * How the client renders the student's screen (SAD §7.9). Shared by the chat
 * stream and `intervention(...)`. An old server's UNSPECIFIED arrives as NORMAL.
 */
export type UiMode =
  /** Risk 4-6: show the crisis screen with `crisisResources` instead of the regular flow. */
  | 'LOCKDOWN'
  | 'NORMAL';

export type UpdateWinGratitudeInput = {
  category?: string | null | undefined;
  description?: string | null | undefined;
  emotion?: string | null | undefined;
  id: string;
  question?: string | null | undefined;
  related_goal?: string | null | undefined;
  shared_with?: Array<string> | null | undefined;
  title: string;
  type: string;
};

export type JourneyActivityQueryVariables = Exact<{
  from: string;
  to: string;
  timeZone?: string | null | undefined;
  fromInstant?: string | null | undefined;
  toInstant?: string | null | undefined;
}>;


export type JourneyActivityQuery = { studentActivity: { days: Array<{ date: string, moodHistories: Array<{ id: string }> }>, totals: { checkinDays: number, moodsNamed: number, lessonsCompleted: number, sparksEarned: number, lessonsByCategory: Array<{ category: string, count: number }> } }, moodCounts: { counts: Array<{ label: string, count: number }> }, listContentCategories: Array<{ key: string, title: string }>, listMilestones: Array<{ id: string, title: string }>, listUserMilestones: Array<{ milestone: string, achieved_at: string }> };

export type RecapActivityQueryVariables = Exact<{
  from: string;
  to: string;
  timeZone?: string | null | undefined;
}>;


export type RecapActivityQuery = { studentActivity: { totals: { moodsNamed: number, journals: number, lessonsViewed: number, lessonsCompleted: number } } };

export type SummaryActivityQueryVariables = Exact<{
  from: string;
  to: string;
  timeZone?: string | null | undefined;
}>;


export type SummaryActivityQuery = { studentActivity: { days: Array<{ date: string, moodHistories: Array<{ id: string, created_at: string, moods: Array<{ id: string }> }>, journals: Array<{ content: string, created_at: string }>, wins: Array<{ title: string, description: string | null, created_at: string }>, miniSurveys: Array<{ moodHistory: string | null, category: string | null, created_at: string, responses: Array<{ question: string, answer: string, option_ids: Array<string> }> }> }> } };

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

export type ToolkitQueryVariables = Exact<{ [key: string]: never; }>;


export type ToolkitQuery = { listContentCategories: Array<{ key: string, title: string, emoji: string, color: string }>, listRecommendedContent: Array<{ id: string, title: string, duration_seconds: number, video_url: string | null, cover_url: string | null, category: string, sparks: number }>, viewed: { interactions: Array<{ lesson: { id: string, title: string, duration_seconds: number, video_url: string | null, cover_url: string | null, category: string, sparks: number } | null }> }, saved: { interactions: Array<{ lesson: { id: string, title: string, duration_seconds: number, video_url: string | null, cover_url: string | null, category: string, sparks: number } | null }> } };

export type ToolkitCategoryQueryVariables = Exact<{
  category: string;
}>;


export type ToolkitCategoryQuery = { listContentCategories: Array<{ key: string, title: string, emoji: string, color: string }>, listLessons: { lessons: Array<{ id: string, title: string, duration_seconds: number, video_url: string | null, cover_url: string | null, category: string, sparks: number }> }, saved: { interactions: Array<{ content_id: string }> } };

export type ToolkitLessonQueryVariables = Exact<{
  id: string;
}>;


export type ToolkitLessonQuery = { getLesson: { id: string, title: string, duration_seconds: number, video_url: string | null, cover_url: string | null, category: string, sparks: number } };

export type SavedLessonIdsQueryVariables = Exact<{
  category: string;
}>;


export type SavedLessonIdsQuery = { listLessons: { lessons: Array<{ id: string, title: string, duration_seconds: number, video_url: string | null, cover_url: string | null, category: string, sparks: number }> }, saved: { interactions: Array<{ content_id: string }> } };

export type SetLessonSavedMutationVariables = Exact<{
  id: string;
  saved: boolean;
}>;


export type SetLessonSavedMutation = { setContentSaved: { saved: boolean } };

export type RecordLessonViewMutationVariables = Exact<{
  id: string;
}>;


export type RecordLessonViewMutation = { recordContentView: { view_count: number } };

export type CompleteLessonMutationVariables = Exact<{
  id: string;
}>;


export type CompleteLessonMutation = { completeLesson: { sparks_awarded: number } };

export type MySchoolsQueryVariables = Exact<{ [key: string]: never; }>;


export type MySchoolsQuery = { listSchoolsForUser: { schools: Array<{ id: string, name: string }> } };

export type CohortRiskWatchlistQueryVariables = Exact<{
  school: string;
}>;


export type CohortRiskWatchlistQuery = { cohortRisk: { watchlist: Array<{ user: string, alertId: string, alertStatus: string, alertCreatedAt: string, tier: RiskTier, riskLevel: number, riskScore: number | null, confidence: number | null, direction: Trend | null, grade: string | null, student: { first_name: string | null, last_name: string | null, display_name: string | null } | null }> } };

export type SchoolClimateQueryVariables = Exact<{
  school: string;
}>;


export type SchoolClimateQuery = { cohortMetrics: { cohortSize: number | null, metrics: Array<{ metricName: MetricName, score: number | null }> }, metricDefinitions: Array<{ name: MetricName, label: string, description: string }> };

export type AcknowledgeRiskAlertMutationVariables = Exact<{
  id: string;
}>;


export type AcknowledgeRiskAlertMutation = { acknowledgeRiskAlert: { id: string } };

export type SparkRulesQueryVariables = Exact<{ [key: string]: never; }>;


export type SparkRulesQuery = { listSparkRules: Array<{ event: string, amount: number }> };

export type HubQueryVariables = Exact<{
  date?: string | null | undefined;
}>;


export type HubQuery = { sparkBalance: { balance: number }, dailyCards: { cards: Array<{ family: DailyCardFamily, done: boolean }> } };

export type CollectiblesQueryVariables = Exact<{
  section?: CollectibleSection | null | undefined;
}>;


export type CollectiblesQuery = { listCollectibles: { collectibles: Array<{ id: string, name: string, description: string, image_url: string, cost: number, section: CollectibleSection, owned: boolean | null, affordable: boolean | null }> } };

export type PurchaseCollectibleMutationVariables = Exact<{
  id: string;
}>;


export type PurchaseCollectibleMutation = { purchaseCollectible: { balance: number } };

export type MilestonesQueryVariables = Exact<{ [key: string]: never; }>;


export type MilestonesQuery = { listMilestones: Array<{ id: string, reward_sparks: number, order: number }>, listUserMilestones: Array<{ milestone: string }> };

export type MyGradesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyGradesQuery = { myGrades: { lmsConnected: boolean, studentMatched: boolean, courses: Array<{ lmsType: string, courseExternalId: string, courseName: string, teacherName: string, currentScore: number | null, currentGrade: string | null, attendancePercent: number | null }> } };

export type CreateInterventionSessionMutationVariables = Exact<{
  studentId: string;
}>;


export type CreateInterventionSessionMutation = { createInterventionSession: { sessionId: string, pathway: InterventionPathway, uiMode: UiMode, requiresAcknowledgment: boolean, safetyMessage: string | null, supportBlocks: Array<{ type: SupportBlockType, content: string, order: number }>, actionPayload: { tools: Array<{ id: string, name: string, description: string, toolType: string }> }, crisisResources: { hotline: string, textLine: string } | null } };

export type TransitionInterventionMutationVariables = Exact<{
  sessionId: string;
  toState: InterventionState;
}>;


export type TransitionInterventionMutation = { transitionInterventionState: { success: boolean, error: string | null } };

export type ContinueSupportMutationVariables = Exact<{
  sessionId: string;
}>;


export type ContinueSupportMutation = { continueSupport: { success: boolean, error: string | null } };

export type RecordInterventionOutcomeMutationVariables = Exact<{
  input: RecordOutcomeInput;
}>;


export type RecordInterventionOutcomeMutation = { recordInterventionOutcome: { success: boolean, message: string | null } };

export type ReportInterventionEventMutationVariables = Exact<{
  input: InterventionEventInput;
}>;


export type ReportInterventionEventMutation = { reportInterventionEvent: boolean };

export type JournalsQueryVariables = Exact<{
  user?: string | null | undefined;
  pageSize?: number | null | undefined;
}>;


export type JournalsQuery = { listJournals: { next_page_token: string | null, journals: Array<{ id: string, title: string, content: string, question_ids: Array<string>, created_at: string }> } };

export type JournalHomeQueryVariables = Exact<{
  user?: string | null | undefined;
  pageSize?: number | null | undefined;
  date: string;
  timeZone?: string | null | undefined;
}>;


export type JournalHomeQuery = { dailyQuestions: Array<{ id: string, label: string }>, listJournals: { next_page_token: string | null, journals: Array<{ id: string, title: string, content: string, question_ids: Array<string>, created_at: string }> }, studentActivity: { days: Array<{ moodHistories: Array<{ created_at: string, moods: Array<{ id: string }> }> }> } };

export type LoginLtiMutationVariables = Exact<{
  ltiToken: string;
}>;


export type LoginLtiMutation = { loginLti: { token: string, refresh_token: string, user_id: string, tenant: string, role: Role, expiresAt: string, refreshExpiresAt: string | null } };

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

export type DailyQuestionsQueryVariables = Exact<{
  category: string;
  topic?: string | null | undefined;
  date: string;
  count?: number | null | undefined;
  timeZone?: string | null | undefined;
}>;


export type DailyQuestionsQuery = { dailyQuestions: Array<{ id: string, key: string | null, label: string, category: string, type: QuestionType, display: QuestionDisplay | null, max_selections: number, options: Array<{ id: string, label: string, value: string, emoji: string | null, imageUrl: string | null, order: number }> }> };

export type NoticeWinsQueryVariables = Exact<{
  date: string;
  timeZone?: string | null | undefined;
  category: string;
  topic?: string | null | undefined;
}>;


export type NoticeWinsQuery = { dailyQuestions: Array<{ id: string, label: string }>, studentActivity: { days: Array<{ wins: Array<{ id: string, title: string, description: string | null, question: string | null, created_at: string }> }> }, listSparkRules: Array<{ event: string, amount: number }> };

export type CreateWinMutationVariables = Exact<{
  input: CreateWinGratitudeInput;
}>;


export type CreateWinMutation = { createWinGratitude: { id: string, sparksAwarded: number | null } };

export type UpdateWinMutationVariables = Exact<{
  input: UpdateWinGratitudeInput;
}>;


export type UpdateWinMutation = { updateWinGratitude: { id: string } };

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
export const JourneyActivityDocument = new TypedDocumentString(`
    query JourneyActivity($from: String!, $to: String!, $timeZone: String, $fromInstant: String, $toInstant: String) {
  studentActivity(from: $from, to: $to, timeZone: $timeZone) {
    days {
      date
      moodHistories {
        id
      }
    }
    totals {
      checkinDays
      moodsNamed
      lessonsCompleted
      lessonsByCategory {
        category
        count
      }
      sparksEarned
    }
  }
  moodCounts(from: $fromInstant, to: $toInstant) {
    counts {
      label
      count
    }
  }
  listContentCategories {
    key
    title
  }
  listMilestones {
    id
    title
  }
  listUserMilestones {
    milestone
    achieved_at
  }
}
    `) as unknown as TypedDocumentString<JourneyActivityQuery, JourneyActivityQueryVariables>;
export const RecapActivityDocument = new TypedDocumentString(`
    query RecapActivity($from: String!, $to: String!, $timeZone: String) {
  studentActivity(from: $from, to: $to, timeZone: $timeZone) {
    totals {
      moodsNamed
      journals
      lessonsViewed
      lessonsCompleted
    }
  }
}
    `) as unknown as TypedDocumentString<RecapActivityQuery, RecapActivityQueryVariables>;
export const SummaryActivityDocument = new TypedDocumentString(`
    query SummaryActivity($from: String!, $to: String!, $timeZone: String) {
  studentActivity(from: $from, to: $to, timeZone: $timeZone) {
    days {
      date
      moodHistories {
        id
        moods {
          id
        }
        created_at
      }
      journals {
        content
        created_at
      }
      wins {
        title
        description
        created_at
      }
      miniSurveys {
        moodHistory
        category
        responses {
          question
          answer
          option_ids
        }
        created_at
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SummaryActivityQuery, SummaryActivityQueryVariables>;
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
export const ToolkitDocument = new TypedDocumentString(`
    query Toolkit {
  listContentCategories {
    key
    title
    emoji
    color
  }
  listRecommendedContent(limit: 3) {
    id
    title
    duration_seconds
    video_url
    cover_url
    category
    sparks
  }
  viewed: listViewedContent(contentKind: LESSON, pageSize: 20) {
    interactions {
      lesson {
        id
        title
        duration_seconds
        video_url
        cover_url
        category
        sparks
      }
    }
  }
  saved: listSavedContent(contentKind: LESSON, pageSize: 50) {
    interactions {
      lesson {
        id
        title
        duration_seconds
        video_url
        cover_url
        category
        sparks
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ToolkitQuery, ToolkitQueryVariables>;
export const ToolkitCategoryDocument = new TypedDocumentString(`
    query ToolkitCategory($category: String!) {
  listContentCategories {
    key
    title
    emoji
    color
  }
  listLessons(category: $category, pageSize: 50) {
    lessons {
      id
      title
      duration_seconds
      video_url
      cover_url
      category
      sparks
    }
  }
  saved: listSavedContent(contentKind: LESSON, pageSize: 50) {
    interactions {
      content_id
    }
  }
}
    `) as unknown as TypedDocumentString<ToolkitCategoryQuery, ToolkitCategoryQueryVariables>;
export const ToolkitLessonDocument = new TypedDocumentString(`
    query ToolkitLesson($id: ID!) {
  getLesson(id: $id) {
    id
    title
    duration_seconds
    video_url
    cover_url
    category
    sparks
  }
}
    `) as unknown as TypedDocumentString<ToolkitLessonQuery, ToolkitLessonQueryVariables>;
export const SavedLessonIdsDocument = new TypedDocumentString(`
    query SavedLessonIds($category: String!) {
  listLessons(category: $category, pageSize: 10) {
    lessons {
      id
      title
      duration_seconds
      video_url
      cover_url
      category
      sparks
    }
  }
  saved: listSavedContent(contentKind: LESSON, pageSize: 50) {
    interactions {
      content_id
    }
  }
}
    `) as unknown as TypedDocumentString<SavedLessonIdsQuery, SavedLessonIdsQueryVariables>;
export const SetLessonSavedDocument = new TypedDocumentString(`
    mutation SetLessonSaved($id: ID!, $saved: Boolean!) {
  setContentSaved(contentKind: LESSON, contentId: $id, saved: $saved) {
    saved
  }
}
    `) as unknown as TypedDocumentString<SetLessonSavedMutation, SetLessonSavedMutationVariables>;
export const RecordLessonViewDocument = new TypedDocumentString(`
    mutation RecordLessonView($id: ID!) {
  recordContentView(contentKind: LESSON, contentId: $id) {
    view_count
  }
}
    `) as unknown as TypedDocumentString<RecordLessonViewMutation, RecordLessonViewMutationVariables>;
export const CompleteLessonDocument = new TypedDocumentString(`
    mutation CompleteLesson($id: ID!) {
  completeLesson(lesson: $id) {
    sparks_awarded
  }
}
    `) as unknown as TypedDocumentString<CompleteLessonMutation, CompleteLessonMutationVariables>;
export const MySchoolsDocument = new TypedDocumentString(`
    query MySchools {
  listSchoolsForUser(pageSize: 5) {
    schools {
      id
      name
    }
  }
}
    `) as unknown as TypedDocumentString<MySchoolsQuery, MySchoolsQueryVariables>;
export const CohortRiskWatchlistDocument = new TypedDocumentString(`
    query CohortRiskWatchlist($school: ID!) {
  cohortRisk(scopeType: SCHOOL, scopeId: $school) {
    watchlist {
      user
      alertId
      alertStatus
      alertCreatedAt
      tier
      riskLevel
      riskScore
      confidence
      direction
      grade
      student {
        first_name
        last_name
        display_name
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CohortRiskWatchlistQuery, CohortRiskWatchlistQueryVariables>;
export const SchoolClimateDocument = new TypedDocumentString(`
    query SchoolClimate($school: ID!) {
  cohortMetrics(
    scopeType: SCHOOL
    scopeId: $school
    metrics: [
      MOOD_BASELINE
      ENGAGEMENT_DELTA
      SLEEP_TREND
      SUPPORT_INDEX
      ROUTINE_CONSISTENCY
    ]
  ) {
    cohortSize
    metrics {
      metricName
      score
    }
  }
  metricDefinitions {
    name
    label
    description
  }
}
    `) as unknown as TypedDocumentString<SchoolClimateQuery, SchoolClimateQueryVariables>;
export const AcknowledgeRiskAlertDocument = new TypedDocumentString(`
    mutation AcknowledgeRiskAlert($id: ID!) {
  acknowledgeRiskAlert(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<AcknowledgeRiskAlertMutation, AcknowledgeRiskAlertMutationVariables>;
export const SparkRulesDocument = new TypedDocumentString(`
    query SparkRules {
  listSparkRules {
    event
    amount
  }
}
    `) as unknown as TypedDocumentString<SparkRulesQuery, SparkRulesQueryVariables>;
export const HubDocument = new TypedDocumentString(`
    query Hub($date: String) {
  sparkBalance {
    balance
  }
  dailyCards(date: $date) {
    cards {
      family
      done
    }
  }
}
    `) as unknown as TypedDocumentString<HubQuery, HubQueryVariables>;
export const CollectiblesDocument = new TypedDocumentString(`
    query Collectibles($section: CollectibleSection) {
  listCollectibles(section: $section, status: ACTIVE, pageSize: 100) {
    collectibles {
      id
      name
      description
      image_url
      cost
      section
      owned
      affordable
    }
  }
}
    `) as unknown as TypedDocumentString<CollectiblesQuery, CollectiblesQueryVariables>;
export const PurchaseCollectibleDocument = new TypedDocumentString(`
    mutation PurchaseCollectible($id: ID!) {
  purchaseCollectible(collectibleId: $id) {
    balance
  }
}
    `) as unknown as TypedDocumentString<PurchaseCollectibleMutation, PurchaseCollectibleMutationVariables>;
export const MilestonesDocument = new TypedDocumentString(`
    query Milestones {
  listMilestones {
    id
    reward_sparks
    order
  }
  listUserMilestones {
    milestone
  }
}
    `) as unknown as TypedDocumentString<MilestonesQuery, MilestonesQueryVariables>;
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
export const CreateInterventionSessionDocument = new TypedDocumentString(`
    mutation CreateInterventionSession($studentId: ID!) {
  createInterventionSession(studentId: $studentId) {
    sessionId
    pathway
    supportBlocks {
      type
      content
      order
    }
    actionPayload {
      tools {
        id
        name
        description
        toolType
      }
    }
    uiMode
    requiresAcknowledgment
    safetyMessage
    crisisResources {
      hotline
      textLine
    }
  }
}
    `) as unknown as TypedDocumentString<CreateInterventionSessionMutation, CreateInterventionSessionMutationVariables>;
export const TransitionInterventionDocument = new TypedDocumentString(`
    mutation TransitionIntervention($sessionId: ID!, $toState: InterventionState!) {
  transitionInterventionState(sessionId: $sessionId, toState: $toState) {
    success
    error
  }
}
    `) as unknown as TypedDocumentString<TransitionInterventionMutation, TransitionInterventionMutationVariables>;
export const ContinueSupportDocument = new TypedDocumentString(`
    mutation ContinueSupport($sessionId: ID!) {
  continueSupport(sessionId: $sessionId) {
    success
    error
  }
}
    `) as unknown as TypedDocumentString<ContinueSupportMutation, ContinueSupportMutationVariables>;
export const RecordInterventionOutcomeDocument = new TypedDocumentString(`
    mutation RecordInterventionOutcome($input: RecordOutcomeInput!) {
  recordInterventionOutcome(input: $input) {
    success
    message
  }
}
    `) as unknown as TypedDocumentString<RecordInterventionOutcomeMutation, RecordInterventionOutcomeMutationVariables>;
export const ReportInterventionEventDocument = new TypedDocumentString(`
    mutation ReportInterventionEvent($input: InterventionEventInput!) {
  reportInterventionEvent(input: $input)
}
    `) as unknown as TypedDocumentString<ReportInterventionEventMutation, ReportInterventionEventMutationVariables>;
export const JournalsDocument = new TypedDocumentString(`
    query Journals($user: String, $pageSize: Int) {
  listJournals(user: $user, page_size: $pageSize) {
    journals {
      id
      title
      content
      question_ids
      created_at
    }
    next_page_token
  }
}
    `) as unknown as TypedDocumentString<JournalsQuery, JournalsQueryVariables>;
export const JournalHomeDocument = new TypedDocumentString(`
    query JournalHome($user: String, $pageSize: Int, $date: String!, $timeZone: String) {
  dailyQuestions(category: "journal", date: $date, count: 2, timeZone: $timeZone) {
    id
    label
  }
  listJournals(user: $user, page_size: $pageSize) {
    journals {
      id
      title
      content
      question_ids
      created_at
    }
    next_page_token
  }
  studentActivity(from: $date, to: $date, timeZone: $timeZone) {
    days {
      moodHistories {
        moods {
          id
        }
        created_at
      }
    }
  }
}
    `) as unknown as TypedDocumentString<JournalHomeQuery, JournalHomeQueryVariables>;
export const LoginLtiDocument = new TypedDocumentString(`
    mutation LoginLti($ltiToken: String!) {
  loginLti(ltiToken: $ltiToken) {
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
}`) as unknown as TypedDocumentString<LoginLtiMutation, LoginLtiMutationVariables>;
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
export const DailyQuestionsDocument = new TypedDocumentString(`
    query DailyQuestions($category: String!, $topic: String, $date: String!, $count: Int, $timeZone: String) {
  dailyQuestions(
    category: $category
    topic: $topic
    date: $date
    count: $count
    timeZone: $timeZone
  ) {
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
    `) as unknown as TypedDocumentString<DailyQuestionsQuery, DailyQuestionsQueryVariables>;
export const NoticeWinsDocument = new TypedDocumentString(`
    query NoticeWins($date: String!, $timeZone: String, $category: String!, $topic: String) {
  dailyQuestions(
    category: $category
    topic: $topic
    date: $date
    count: 1
    timeZone: $timeZone
  ) {
    id
    label
  }
  studentActivity(from: $date, to: $date, timeZone: $timeZone) {
    days {
      wins {
        id
        title
        description
        question
        created_at
      }
    }
  }
  listSparkRules {
    event
    amount
  }
}
    `) as unknown as TypedDocumentString<NoticeWinsQuery, NoticeWinsQueryVariables>;
export const CreateWinDocument = new TypedDocumentString(`
    mutation CreateWin($input: CreateWinGratitudeInput!) {
  createWinGratitude(input: $input) {
    id
    sparksAwarded
  }
}
    `) as unknown as TypedDocumentString<CreateWinMutation, CreateWinMutationVariables>;
export const UpdateWinDocument = new TypedDocumentString(`
    mutation UpdateWin($input: UpdateWinGratitudeInput!) {
  updateWinGratitude(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<UpdateWinMutation, UpdateWinMutationVariables>;