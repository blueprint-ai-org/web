/** Authentication types supported by the @auth directive. */
export const AuthType = {
  /** Requires valid API key in X-API-Key header */
  Api: 'API',
  /** No authentication required - rejects requests with existing auth */
  NoUser: 'NO_USER',
  /** Requires valid JWT token in Authorization header */
  User: 'USER',
  /** Accepts either JWT token or API key */
  UserOrApi: 'USER_OR_API'
} as const;

export type AuthType = typeof AuthType[keyof typeof AuthType];
export const CohortScopeType = {
  Classroom: 'CLASSROOM',
  District: 'DISTRICT',
  Organization: 'ORGANIZATION',
  Tenant: 'TENANT'
} as const;

export type CohortScopeType = typeof CohortScopeType[keyof typeof CohortScopeType];
export const CollectibleSection = {
  About: 'ABOUT',
  Mood: 'MOOD',
  Shop: 'SHOP',
  Wins: 'WINS',
  Write: 'WRITE'
} as const;

export type CollectibleSection = typeof CollectibleSection[keyof typeof CollectibleSection];
export const ContentKind = {
  /** Lives in knowledge-graph, so this service does not validate it. */
  CopingTool: 'COPING_TOOL',
  Course: 'COURSE',
  Lesson: 'LESSON'
} as const;

export type ContentKind = typeof ContentKind[keyof typeof ContentKind];
export const ContentStatus = {
  Draft: 'DRAFT',
  Published: 'PUBLISHED'
} as const;

export type ContentStatus = typeof ContentStatus[keyof typeof ContentStatus];
export const DailyCardFamily = {
  About: 'ABOUT',
  Mood: 'MOOD',
  Wins: 'WINS',
  Write: 'WRITE'
} as const;

export type DailyCardFamily = typeof DailyCardFamily[keyof typeof DailyCardFamily];
/**
 * Intervention routing pathway determined by risk level (SAD §7.2 Decision Engine).
 * - ROUTINE:          risk level 0-2 — standard growth support
 * - OBSERVATION:      risk level 3   — elevated monitoring with enriched support
 * - IMMEDIATE_SAFETY: risk level 4-6 — crisis response with human-in-the-loop
 */
export const InterventionPathway = {
  ImmediateSafety: 'IMMEDIATE_SAFETY',
  Observation: 'OBSERVATION',
  Routine: 'ROUTINE'
} as const;

export type InterventionPathway = typeof InterventionPathway[keyof typeof InterventionPathway];
/**
 * Intervention FSM state — strict linear order (SAD §7.5):
 *   EXPRESSION → SUPPORT → ACTION → FOLLOW_UP
 */
export const InterventionState = {
  Action: 'ACTION',
  Expression: 'EXPRESSION',
  FollowUp: 'FOLLOW_UP',
  Support: 'SUPPORT'
} as const;

export type InterventionState = typeof InterventionState[keyof typeof InterventionState];
export const MilestoneKind = {
  CheckinsTotal: 'CHECKINS_TOTAL',
  SparksTotal: 'SPARKS_TOTAL',
  StreakDays: 'STREAK_DAYS'
} as const;

export type MilestoneKind = typeof MilestoneKind[keyof typeof MilestoneKind];
export const OrgStatus = {
  Active: 'ACTIVE',
  Archived: 'ARCHIVED'
} as const;

export type OrgStatus = typeof OrgStatus[keyof typeof OrgStatus];
export const QuestionType = {
  /** Between one and `max_selections` options. */
  Multiselect: 'MULTISELECT',
  /** Free text. Cannot have options. */
  Open: 'OPEN',
  /** Exactly one option. */
  SelectOne: 'SELECT_ONE'
} as const;

export type QuestionType = typeof QuestionType[keyof typeof QuestionType];
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
export const Role = {
  Admin: 'ADMIN',
  Counselor: 'COUNSELOR',
  Parent: 'PARENT',
  SchoolAdmin: 'SCHOOL_ADMIN',
  Student: 'STUDENT',
  Support: 'SUPPORT',
  Teacher: 'TEACHER',
  Tutor: 'TUTOR'
} as const;

export type Role = typeof Role[keyof typeof Role];
export const SparkKind = {
  Earn: 'EARN',
  Spend: 'SPEND'
} as const;

export type SparkKind = typeof SparkKind[keyof typeof SparkKind];
export const SsoConnectionStatus = {
  Active: 'ACTIVE',
  Disabled: 'DISABLED'
} as const;

export type SsoConnectionStatus = typeof SsoConnectionStatus[keyof typeof SsoConnectionStatus];
/** Identity providers this deployment can speak to. */
export const SsoProvider = {
  Classlink: 'CLASSLINK',
  Clever: 'CLEVER',
  Google: 'GOOGLE',
  Saml: 'SAML'
} as const;

export type SsoProvider = typeof SsoProvider[keyof typeof SsoProvider];
/** Support block rendering type (SAD §7.3 Support Layer). */
export const SupportBlockType = {
  Normalization: 'NORMALIZATION',
  Psychoeducation: 'PSYCHOEDUCATION',
  Validation: 'VALIDATION'
} as const;

export type SupportBlockType = typeof SupportBlockType[keyof typeof SupportBlockType];
export const TapKind = {
  Question: 'QUESTION',
  Text: 'TEXT',
  Video: 'VIDEO'
} as const;

export type TapKind = typeof TapKind[keyof typeof TapKind];
/** Tenant provisioning lifecycle state (mirrors `manager.TenantStatus`). */
export const TenantStatus = {
  /** every provisioning phase succeeded (or was skipped) */
  Active: 'ACTIVE',
  /** an optional phase (e.g. Pinecone vector copy) failed; the tenant is usable */
  Degraded: 'DEGRADED',
  /** a required phase failed or manager was unreachable — call `retryProvisioning` */
  Failed: 'FAILED',
  /** auth created the tenant and dispatched `manager.CreateMigration`; still running */
  Provisioning: 'PROVISIONING'
} as const;

export type TenantStatus = typeof TenantStatus[keyof typeof TenantStatus];