/** What kind of file an asset points at. */
export const AssetType = {
  Audio: 'AUDIO',
  Image: 'IMAGE',
  Video: 'VIDEO'
} as const;

export type AssetType = typeof AssetType[keyof typeof AssetType];
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
/** Whether a catalogue row is offered or retired. */
export const CatalogueStatus = {
  /** Offered to students, and the default on create. */
  Active: 'ACTIVE',
  /** Retired: kept for the rows that reference it, never offered again. */
  Archived: 'ARCHIVED'
} as const;

export type CatalogueStatus = typeof CatalogueStatus[keyof typeof CatalogueStatus];
export const CohortScopeType = {
  Classroom: 'CLASSROOM',
  District: 'DISTRICT',
  /** A group of `listGroups`. Expanded to its members by this gateway. */
  Group: 'GROUP',
  Organization: 'ORGANIZATION',
  /** A school of `listSchools`. Expanded to its members by this gateway. */
  School: 'SCHOOL',
  Tenant: 'TENANT'
} as const;

export type CohortScopeType = typeof CohortScopeType[keyof typeof CohortScopeType];
/** How far back a cohort aggregation looks. */
export const CohortWindow = {
  Last_7Days: 'LAST_7_DAYS',
  Last_30Days: 'LAST_30_DAYS',
  Last_90Days: 'LAST_90_DAYS'
} as const;

export type CohortWindow = typeof CohortWindow[keyof typeof CohortWindow];
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
export const CrisisRuleSeverity = {
  Alert: 'ALERT',
  Critical: 'CRITICAL',
  Info: 'INFO',
  Warning: 'WARNING'
} as const;

export type CrisisRuleSeverity = typeof CrisisRuleSeverity[keyof typeof CrisisRuleSeverity];
export const CrisisRuleType = {
  Composite: 'COMPOSITE',
  Frequency: 'FREQUENCY',
  Pattern: 'PATTERN',
  Sequence: 'SEQUENCE',
  Threshold: 'THRESHOLD'
} as const;

export type CrisisRuleType = typeof CrisisRuleType[keyof typeof CrisisRuleType];
export const DailyCardFamily = {
  About: 'ABOUT',
  Mood: 'MOOD',
  Wins: 'WINS',
  Write: 'WRITE'
} as const;

export type DailyCardFamily = typeof DailyCardFamily[keyof typeof DailyCardFamily];
/**
 * What an educator DID about a student (C2-R08) — the intervention record behind
 * an alert. PROVISIONAL (D18): the list product wants is unsigned; the set being
 * closed is not, because an arbitrary value could not be aggregated later.
 */
export const EducatorActionType = {
  /** Spoke with the student. */
  CheckIn: 'CHECK_IN',
  /** Contacted the family. */
  FamilyContact: 'FAMILY_CONTACT',
  /** Reviewed and chose not to act. */
  NoAction: 'NO_ACTION',
  Other: 'OTHER',
  /** Referred to a counselor or support service. */
  Referral: 'REFERRAL',
  /** Followed the school's safety protocol. */
  SafetyProtocol: 'SAFETY_PROTOCOL'
} as const;

export type EducatorActionType = typeof EducatorActionType[keyof typeof EducatorActionType];
/**
 * What a failure tells a client, and what it does not.
 *
 * `extensions.code` is ALWAYS present and is the contract: it is what a client
 * branches on. `extensions.reason` and `extensions.field` are OPTIONAL refinements
 * — a reason names the domain rule that failed, a field names the input that did.
 * `extensions.classification` splits `client` (do not retry, show the user) from
 * `server` (retry, or show a generic failure), and `extensions.grpc_code` is the
 * downstream code, for logs.
 *
 * **The MESSAGE is not contract.** It is written for a human reading a log and
 * changes without notice; downstream messages are dropped entirely, because they
 * carry Mongo validator fragments and internal hostnames. Anything a client
 * decides must come from a field above.
 */
export const ErrorCode = {
  /** The resource already exists. `reason` says which uniqueness rule. */
  AlreadyExists: 'ALREADY_EXISTS',
  /** `uploadAsset`: the id matches more than one registered target. */
  AmbiguousTarget: 'AMBIGUOUS_TARGET',
  /** Generic client-side bad request. */
  BadRequest: 'BAD_REQUEST',
  /** The request was cancelled before it completed. */
  Cancelled: 'CANCELLED',
  /** `uploadAsset`: no `collection` was given and none could be inferred. */
  CollectionRequired: 'COLLECTION_REQUIRED',
  /** The signup email is already registered. */
  EmailAlreadyRegistered: 'EMAIL_ALREADY_REGISTERED',
  /** The request cannot be completed in the current state. `reason` says which rule. */
  FailedPrecondition: 'FAILED_PRECONDITION',
  /** `uploadAsset`: the target has several candidate fields and none was named. */
  FieldRequired: 'FIELD_REQUIRED',
  /** Authenticated, but the credential lacks the role or the ownership. Signing in again changes nothing. */
  Forbidden: 'FORBIDDEN',
  /** An unexpected server-side failure. */
  InternalError: 'INTERNAL_ERROR',
  /** The API key is malformed, unknown or revoked. */
  InvalidApiKey: 'INVALID_API_KEY',
  /** `uploadAsset`: an argument is malformed, e.g. an `id` that is not a safe path segment. */
  InvalidArgument: 'INVALID_ARGUMENT',
  /** `uploadAsset`: the `collection` is not registered for that scope's database. */
  InvalidCollection: 'INVALID_COLLECTION',
  /** The bearer token is malformed, expired or revoked. */
  InvalidToken: 'INVALID_TOKEN',
  /** The named resource does not exist, or the caller may not see that it does. */
  NotFound: 'NOT_FOUND',
  /** The deployment does not support this operation (e.g. tenant search without Atlas Search). */
  NotImplemented: 'NOT_IMPLEMENTED',
  /** Billing could not be reached, and the gateway refuses to assume a free tier. */
  PaymentUnavailable: 'PAYMENT_UNAVAILABLE',
  /** Too many requests. Retrying later is the fix. */
  RateLimited: 'RATE_LIMITED',
  /** The credential could not be revoked. */
  RevocationFailed: 'REVOCATION_FAILED',
  /** A downstream service is unavailable. Retryable. */
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  /** The environment's tenant budget (`MAX_TENANTS`) is full. Retrying later does NOT help. */
  TenantLimitReached: 'TENANT_LIMIT_REACHED',
  /** The request timed out downstream. */
  Timeout: 'TIMEOUT',
  /** No usable credential. Signing in again is the fix. */
  Unauthorized: 'UNAUTHORIZED',
  /** The operation could not be served; retrying may work. */
  Unavailable: 'UNAVAILABLE',
  /** Input failed validation. `field` names the input when the service said which. */
  ValidationFailed: 'VALIDATION_FAILED'
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
/**
 * The domain RULE behind a failure, when a service named one.
 *
 * Mirrors `common.ErrorReason` in protobuf, minus its `UNSPECIFIED`. The gateway
 * re-exposes a reason ONLY if it is a member of this enum: a service that ships a
 * new rule before the gateway publishes it sends `reason` absent rather than a
 * value no client can handle, and the client falls back to `code`.
 *
 * Three of these COLLAPSE cases on purpose, and the collapse is the feature:
 * `INVALID_CREDENTIALS` does not say whether the email exists, and
 * `INVITATION_INVALID` does not say whether the link was expired, of the wrong
 * kind, or already used.
 */
export const ErrorReason = {
  /** That SAML ACS URL is assigned to another tenant by the platform. */
  AcsUrlAlreadyClaimed: 'ACS_URL_ALREADY_CLAIMED',
  /** The mood category still has moods pointing at it. */
  CategoryInUse: 'CATEGORY_IN_USE',
  /** Another tenant has already claimed that email domain. */
  DomainAlreadyClaimed: 'DOMAIN_ALREADY_CLAIMED',
  /** The group still has live members. */
  GroupHasMembers: 'GROUP_HAS_MEMBERS',
  /** The course, unit or lesson still has children. */
  HasChildren: 'HAS_CHILDREN',
  /** Wrong email or wrong password — deliberately indistinguishable. */
  InvalidCredentials: 'INVALID_CREDENTIALS',
  /** The invitation link is unusable: expired, of the wrong kind, or already used — deliberately indistinguishable. */
  InvitationInvalid: 'INVITATION_INVALID',
  /** The school join code is unusable: unknown, expired or revoked — deliberately indistinguishable. */
  JoinCodeInvalid: 'JOIN_CODE_INVALID',
  /** The owner must belong to the group's school. */
  OwnerNotInSchool: 'OWNER_NOT_IN_SCHOOL',
  /** A group must be owned by a teacher. */
  OwnerNotTeacher: 'OWNER_NOT_TEACHER',
  /** The chosen password is longer than the server accepts. */
  PasswordTooLong: 'PASSWORD_TOO_LONG',
  /** The chosen password is shorter than the server's policy allows. */
  PasswordTooShort: 'PASSWORD_TOO_SHORT',
  /** An open-ended question cannot have options, and this one has live ones. */
  QuestionOptionsConflict: 'QUESTION_OPTIONS_CONFLICT',
  /** The invitee's rank is equal to or above the caller's. */
  RankNotBelowCaller: 'RANK_NOT_BELOW_CALLER',
  /** An already-rotated refresh token was presented; the whole family was revoked. */
  RefreshTokenReused: 'REFRESH_TOKEN_REUSED',
  /** The school still has live members, so deleting it would orphan them. */
  SchoolHasMembers: 'SCHOOL_HAS_MEMBERS',
  /**
   * Somebody else changed the record while this caller was editing it: the
   * `expectedUpdatedAt` they sent is not the one stored. Reloading is the fix.
   */
  StaleWrite: 'STALE_WRITE',
  /** The environment's `MAX_TENANTS` budget is full. */
  TenantLimitReached: 'TENANT_LIMIT_REACHED',
  /** The token was revoked, by logout or by an operator. */
  TokenRevoked: 'TOKEN_REVOKED',
  /** The invitee already has a credential, so inviting them would reset it. */
  UserAlreadyActive: 'USER_ALREADY_ACTIVE',
  /** The user has no membership in the school that owns this group. */
  UserNotInSchool: 'USER_NOT_IN_SCHOOL'
} as const;

export type ErrorReason = typeof ErrorReason[keyof typeof ErrorReason];
/** The student's answer to "did it help?". */
export const FollowupOutcome = {
  Helped: 'HELPED',
  NotDone: 'NOT_DONE',
  NotHelped: 'NOT_HELPED'
} as const;

export type FollowupOutcome = typeof FollowupOutcome[keyof typeof FollowupOutcome];
/**
 * One L5 engagement event the client reports against an intervention session
 * (step-28, unit L5-B). SAD ref: §7.14 Intervention Telemetry.
 */
export const InterventionEventType = {
  Completed: 'COMPLETED',
  Dismissed: 'DISMISSED',
  ToolSelected: 'TOOL_SELECTED',
  Viewed: 'VIEWED'
} as const;

export type InterventionEventType = typeof InterventionEventType[keyof typeof InterventionEventType];
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
/** State of an entry in the shared login index. */
export const LoginStatus = {
  Active: 'ACTIVE',
  /** The credential was revoked; the address no longer resolves to a tenant. */
  Revoked: 'REVOKED'
} as const;

export type LoginStatus = typeof LoginStatus[keyof typeof LoginStatus];
/**
 * The five metrics Layer 2 computes.
 *
 * An enum and not a string: the wire name is snake_case (`mood_baseline`), the
 * console sent camelCase, and a name that does not match produces **zero rows** —
 * indistinguishable from "this cohort has no data". That is why `/metrics` showed
 * nothing at all until step-14.
 */
export const MetricName = {
  EngagementDelta: 'ENGAGEMENT_DELTA',
  MoodBaseline: 'MOOD_BASELINE',
  RoutineConsistency: 'ROUTINE_CONSISTENCY',
  SleepTrend: 'SLEEP_TREND',
  SupportIndex: 'SUPPORT_INDEX'
} as const;

export type MetricName = typeof MetricName[keyof typeof MetricName];
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
/**
 * Outcome of one provisioning phase. The member names mirror `manager.PhaseStatus`
 * on purpose: the console already compares against `PHASE_FAILED`.
 */
export const PhaseStatus = {
  PhaseFailed: 'PHASE_FAILED',
  /** Not attempted. A skipped REQUIRED phase is still a failure — see `required`. */
  PhaseSkipped: 'PHASE_SKIPPED',
  PhaseSuccess: 'PHASE_SUCCESS'
} as const;

export type PhaseStatus = typeof PhaseStatus[keyof typeof PhaseStatus];
/** What a student may choose to share. */
export const PrivacySettingKey = {
  ClassStats: 'CLASS_STATS',
  Journal: 'JOURNAL',
  Mood: 'MOOD'
} as const;

export type PrivacySettingKey = typeof PrivacySettingKey[keyof typeof PrivacySettingKey];
/** How to draw a question. See `Question.display`. */
export const QuestionDisplay = {
  /** Tappable pills. */
  Chips: 'CHIPS',
  /** An arc of faces, read low to high — the `order` IS the direction. */
  EmojiScale: 'EMOJI_SCALE',
  /** Cards with an illustration — see `QuestionOption.imageUrl`. */
  ImageCards: 'IMAGE_CARDS',
  /** An arc of numbers. */
  NumericScale: 'NUMERIC_SCALE',
  /** Free text. */
  Text: 'TEXT'
} as const;

export type QuestionDisplay = typeof QuestionDisplay[keyof typeof QuestionDisplay];
export const QuestionType = {
  /** Between one and `max_selections` options. */
  Multiselect: 'MULTISELECT',
  /** Free text. Cannot have options. */
  Open: 'OPEN',
  /** Exactly one option. */
  SelectOne: 'SELECT_ONE'
} as const;

export type QuestionType = typeof QuestionType[keyof typeof QuestionType];
/** The four risk tiers of metrics-engine's categorical classification. */
export const RiskTier = {
  Critical: 'CRITICAL',
  High: 'HIGH',
  Low: 'LOW',
  Moderate: 'MODERATE'
} as const;

export type RiskTier = typeof RiskTier[keyof typeof RiskTier];
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
/**
 * How current a snapshot is. **Freshness, not risk**: a screen that read the old
 * `status` string as a risk level was reading `stale` as "at risk".
 */
export const SnapshotFreshness = {
  Fresh: 'FRESH',
  Partial: 'PARTIAL',
  Stale: 'STALE'
} as const;

export type SnapshotFreshness = typeof SnapshotFreshness[keyof typeof SnapshotFreshness];
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
/** Which protocol a provider speaks. It decides which half of a form applies. */
export const SsoProtocol = {
  Oidc: 'OIDC',
  Saml: 'SAML'
} as const;

export type SsoProtocol = typeof SsoProtocol[keyof typeof SsoProtocol];
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
/** Stable id of a provisioning phase. */
export const TenantPhaseKey = {
  Kms: 'KMS',
  MongoCollections: 'MONGO_COLLECTIONS',
  Neo4J: 'NEO4J',
  Seeds: 'SEEDS',
  Vector: 'VECTOR'
} as const;

export type TenantPhaseKey = typeof TenantPhaseKey[keyof typeof TenantPhaseKey];
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
/**
 * Outcome of a balance movement. One member, because `succeeded` is the only value
 * payment writes — a pending or failed movement is not persisted at all.
 */
export const TransactionStatus = {
  Succeeded: 'SUCCEEDED'
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];
/** Direction of a balance movement, derived from the sign of the amount. */
export const TransactionType = {
  Credit: 'CREDIT',
  Debit: 'DEBIT',
  /** Declared because the API describes it; payment does not emit it yet. */
  Refund: 'REFUND'
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];
/** Direction of a metric against its baseline (metrics-engine `status`). */
export const Trend = {
  ConsentRevoked: 'CONSENT_REVOKED',
  Declining: 'DECLINING',
  Improving: 'IMPROVING',
  InsufficientData: 'INSUFFICIENT_DATA',
  Stable: 'STABLE'
} as const;

export type Trend = typeof Trend[keyof typeof Trend];
/**
 * How the client renders the student's screen (SAD §7.9). Shared by the chat
 * stream and `intervention(...)`. An old server's UNSPECIFIED arrives as NORMAL.
 */
export const UiMode = {
  /** Risk 4-6: show the crisis screen with `crisisResources` instead of the regular flow. */
  Lockdown: 'LOCKDOWN',
  Normal: 'NORMAL'
} as const;

export type UiMode = typeof UiMode[keyof typeof UiMode];
/** Lifecycle of a tenant-internal user. */
export const UserStatus = {
  /** Can sign in. The only value anything writes today. */
  Active: 'ACTIVE',
  /** Admitted by the IDL; nothing writes it yet. */
  Inactive: 'INACTIVE',
  /** Admitted by the IDL; nothing writes it yet. */
  Suspended: 'SUSPENDED'
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];