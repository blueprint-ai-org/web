export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Int64: { input: number; output: number; }
};

/**
 * Account information payload returned from account queries.
 * Contains billing and subscription details for the authenticated user or API key.
 */
export type AccountPayload = {
  /** Whether the account is on a free tier agreement */
  agreement_free: Scalars['Boolean']['output'];
  /** Unique identifier for the account */
  id: Scalars['ID']['output'];
};

export type AckFollowupResponse = {
  /**
   * True when this call is the one that marked the follow-up delivered. False on
   * an idempotent replay of an already-consumed follow-up, which is a normal
   * outcome and not an error.
   */
  delivered: Scalars['Boolean']['output'];
};

/** The Action Layer dashboard composition (SAD §7.4). */
export type ActionPayload = {
  tools: Array<InterventionTool>;
};

export type AddTrustedPersonInput = {
  available?: InputMaybe<Scalars['Boolean']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  contact?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  relationship: Scalars['String']['input'];
  role?: InputMaybe<Scalars['String']['input']>;
  /**
   * Links the relationship to an EXISTING tenant user instead of creating a new
   * trusted-person node. Omit it and the service creates the person and returns
   * the generated id — either way `TrustRelationship.trusted_user` comes back
   * populated.
   */
  trusted_user?: InputMaybe<Scalars['ID']['input']>;
  user: Scalars['ID']['input'];
};

export type AlertContact = {
  active: Scalars['Boolean']['output'];
  created_at: Scalars['String']['output'];
  /** @deprecated Resolved from <tenantID>.user.email on read. */
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** @deprecated Resolved from <tenantID>.user.display_name on read. */
  name?: Maybe<Scalars['String']['output']>;
  /** @deprecated Resolved from <tenantID>.user.user_type_id on read. */
  role?: Maybe<Role>;
  tenant: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  /** Step-9: FK to <tenantID>.user._id. Required. */
  user: Scalars['ID']['output'];
};

export type Analysis = {
  context: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  model: Scalars['String']['output'];
  response: Scalars['String']['output'];
  score: Scalars['String']['output'];
  text: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

/**
 * API key creation response containing the generated key.
 * The key should be stored securely as it cannot be retrieved again.
 */
export type ApiKeyPayload = {
  /** The generated API key - store securely, shown only once */
  api_key: Scalars['String']['output'];
};

export type Asset = {
  type: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type AssetInput = {
  type: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type AssetTarget = {
  collection: Scalars['String']['output'];
  field: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type AssetUpload = {
  expiresAt: Scalars['String']['output'];
  publicUrl: Scalars['String']['output'];
  /** null when no id was passed. */
  target?: Maybe<AssetTarget>;
  /** The client MUST send these on the PUT (Content-Type, x-goog-content-length-range). */
  uploadHeaders: Array<UploadHeader>;
  /** Signed V4 PUT, 15 min, bound to Content-Type and max size. */
  uploadUrl: Scalars['String']['output'];
};

/**
 * Authentication response payload containing JWT token and user information.
 * Returned from login and signup mutations.
 */
export type AuthPayload = {
  /**
   * Rotatable refresh token. Present it to the `refreshToken` mutation to obtain a
   * fresh access+refresh pair without re-authenticating. Store securely; it is
   * long-lived and revocable (logout / reuse detection).
   */
  refresh_token: Scalars['String']['output'];
  /** Tenant identifier for the user's organization */
  tenant: Scalars['String']['output'];
  /** JWT token for subsequent authenticated requests */
  token: Scalars['String']['output'];
  /** Unique identifier of the authenticated user */
  user_id: Scalars['String']['output'];
};

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
export type Avatar = {
  background?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type BatchIngestEventsInput = {
  events: Array<IngestEventInput>;
};

export type BatchIngestEventsResponse = {
  accepted: Scalars['Int']['output'];
  flagged: Scalars['Int']['output'];
  quarantined: Scalars['Int']['output'];
  rejected: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type BehavioralEvent = {
  consent_id?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  event_type: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  payload?: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
  status: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
  trust_score?: Maybe<Scalars['Float']['output']>;
  user: Scalars['String']['output'];
};

export type BillingSetting = {
  auto_charge_amount: Scalars['Boolean']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  not_paid_limit: Scalars['Boolean']['output'];
  paid_limit: Scalars['Int64']['output'];
  payment: Scalars['String']['output'];
  tenant: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type BillingSettingResponse = {
  billing_setting: BillingSetting;
};

export type CardInput = {
  cvc: Scalars['String']['input'];
  exp_month: Scalars['Int']['input'];
  exp_year: Scalars['Int']['input'];
  number: Scalars['String']['input'];
  token?: InputMaybe<Scalars['String']['input']>;
};

export type ChatChunk = {
  chunk: Scalars['String']['output'];
  inferenceOutput?: Maybe<InferenceOutput>;
  is_last: Scalars['Boolean']['output'];
  session_id: Scalars['String']['output'];
};

export type CohortMetricValue = {
  compositeTrust: Scalars['Float']['output'];
  median: Scalars['Float']['output'];
  metricName: Scalars['String']['output'];
  personCount: Scalars['Int']['output'];
  stddev: Scalars['Float']['output'];
  weightedMean: Scalars['Float']['output'];
};

export type CohortMetricsResponse = {
  cohortSize: Scalars['Int']['output'];
  metrics: Array<CohortMetricValue>;
  scopeId?: Maybe<Scalars['String']['output']>;
  scopeType: CohortScopeType;
  tenantId: Scalars['ID']['output'];
  windowEnd: Scalars['String']['output'];
  windowStart: Scalars['String']['output'];
};

export const CohortScopeType = {
  Classroom: 'CLASSROOM',
  District: 'DISTRICT',
  Organization: 'ORGANIZATION',
  Tenant: 'TENANT'
} as const;

export type CohortScopeType = typeof CohortScopeType[keyof typeof CohortScopeType];
export type Collectible = {
  cost: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  section: CollectibleSection;
  status: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export const CollectibleSection = {
  About: 'ABOUT',
  Mood: 'MOOD',
  Shop: 'SHOP',
  Wins: 'WINS',
  Write: 'WRITE'
} as const;

export type CollectibleSection = typeof CollectibleSection[keyof typeof CollectibleSection];
export type CommonQuestion = {
  category: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  /** The `_id` of the question in activity-ingestor's catalogue. */
  external_id: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  /**
   * The predefined answers, denormalised as labels: nothing in the graph
   * traverses INTO an option.
   */
  option_labels: Array<Scalars['String']['output']>;
  tenant_id: Scalars['String']['output'];
  /** `open`, `select_one` or `multiselect`. Empty on nodes mirrored before the type existed. */
  type: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type CompleteLessonPayload = {
  balance: Scalars['Int']['output'];
  interaction: ContentInteraction;
  /** 0 when the lesson was already complete — completing twice does not pay twice. */
  sparks_awarded: Scalars['Int']['output'];
};

export type CompleteSsoInput = {
  /** OIDC authorization code. */
  code?: InputMaybe<Scalars['String']['input']>;
  provider: SsoProvider;
  relayState?: InputMaybe<Scalars['String']['input']>;
  /** SAML 2.0 assertion, base64. */
  samlResponse?: InputMaybe<Scalars['String']['input']>;
  state: Scalars['String']['input'];
};

export type Confidence = {
  dataConfidence: Scalars['Float']['output'];
  modelConfidence: Scalars['Float']['output'];
};

export type Connector = {
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  last_sync_at?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  reliability_score: Scalars['Float']['output'];
  status: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type Consent = {
  created_at: Scalars['String']['output'];
  data_category: Scalars['String']['output'];
  expires_at?: Maybe<Scalars['String']['output']>;
  granted_at: Scalars['String']['output'];
  granted_by: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  purpose: Scalars['String']['output'];
  revoked_at?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

/** One student's relationship with one piece of content. One row, not one per view. */
export type ContentInteraction = {
  completed_at?: Maybe<Scalars['String']['output']>;
  content_id: Scalars['ID']['output'];
  content_kind: ContentKind;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  liked: Scalars['Boolean']['output'];
  saved: Scalars['Boolean']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['ID']['output'];
  view_count: Scalars['Int']['output'];
  viewed_at?: Maybe<Scalars['String']['output']>;
};

export const ContentKind = {
  /** Lives in knowledge-graph, so this service does not validate it. */
  CopingTool: 'COPING_TOOL',
  Course: 'COURSE',
  Lesson: 'LESSON'
} as const;

export type ContentKind = typeof ContentKind[keyof typeof ContentKind];
export type ContentSearchResult = {
  course?: Maybe<Course>;
  kind: ContentKind;
  lesson?: Maybe<Lesson>;
};

export const ContentStatus = {
  Draft: 'DRAFT',
  Published: 'PUBLISHED'
} as const;

export type ContentStatus = typeof ContentStatus[keyof typeof ContentStatus];
export type CopingTool = {
  category: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  external_id: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  therapist_reviewed_at?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
};

export type CopingToolUsage = {
  after_mood?: Maybe<Scalars['Float']['output']>;
  before_mood?: Maybe<Scalars['Float']['output']>;
  coping_tool_id: Scalars['ID']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  risk_context?: Maybe<Scalars['String']['output']>;
  timestamp: Scalars['String']['output'];
  user: Scalars['ID']['output'];
};

/**
 * The learning catalogue: course → unit → lesson → tap, plus curated collections
 * of courses.
 *
 * A DRAFT course hides everything under it. A non-admin asking for a draft — or
 * for anything inside one — gets NOT_FOUND rather than "exists but unpublished":
 * the distinction would turn this API into a way to enumerate unreleased titles.
 */
export type Course = {
  cover_url: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  order: Scalars['Int']['output'];
  status: ContentStatus;
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type CourseCollection = {
  /**
   * Draft courses are dropped for a non-admin: showing the id would render a
   * slot that errors when opened.
   */
  course_ids: Array<Scalars['ID']['output']>;
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  order: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type CreateAccountInput = {
  email: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateAccountResponse = {
  account_id: Scalars['ID']['output'];
};

export type CreateActionInput = {
  action: Scalars['String']['input'];
  key: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type CreateActionResponse = {
  id: Scalars['ID']['output'];
};

export type CreateAlertContactInput = {
  active: Scalars['Boolean']['input'];
  /** Step-9: FK to <tenantID>.user._id. Required. */
  user: Scalars['ID']['input'];
};

export type CreateAnalysisFromLlmsInput = {
  context: Scalars['String']['input'];
  model?: InputMaybe<Scalars['String']['input']>;
  text: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

export type CreateAnalysisFromLlmsResponse = {
  llms: Array<Llm>;
};

export type CreateAnalysisInput = {
  context: Scalars['String']['input'];
  model?: InputMaybe<Scalars['String']['input']>;
  text: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

export type CreateAvatarInput = {
  background?: InputMaybe<Scalars['String']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type CreateBillingSettingInput = {
  auto_charge_amount?: InputMaybe<Scalars['Boolean']['input']>;
  not_paid_limit?: InputMaybe<Scalars['Boolean']['input']>;
  paid_limit?: InputMaybe<Scalars['Int64']['input']>;
};

export type CreateCardResponse = {
  card_id: Scalars['ID']['output'];
};

export type CreateCollectibleInput = {
  cost: Scalars['Int']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  section?: InputMaybe<CollectibleSection>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type CreateCommonQuestionInput = {
  category: Scalars['String']['input'];
  external_id: Scalars['String']['input'];
  label: Scalars['String']['input'];
};

export type CreateCopingToolInput = {
  category: Scalars['String']['input'];
  external_id: Scalars['String']['input'];
  label: Scalars['String']['input'];
};

export type CreateCourseCollectionInput = {
  course_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreateCourseInput = {
  cover_url?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<ContentStatus>;
  title: Scalars['String']['input'];
};

export type CreateEscalationPolicyInput = {
  ackTimeoutMinutes?: InputMaybe<Scalars['Int']['input']>;
  active?: InputMaybe<Scalars['Boolean']['input']>;
  contacts?: InputMaybe<Array<PolicyContactInput>>;
  fallbackPolicyId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  targetRoles: Array<Role>;
  /** @deprecated tenant is derived from the authenticated context */
  tenantId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateFeedbackInput = {
  _id: Scalars['ID']['input'];
  analyze: Scalars['String']['input'];
  build?: InputMaybe<Scalars['String']['input']>;
  feedback: Scalars['String']['input'];
  input: Scalars['String']['input'];
  model?: InputMaybe<Scalars['String']['input']>;
  scale: Scalars['String']['input'];
};

export type CreateGroupInput = {
  name: Scalars['String']['input'];
  owner: Scalars['ID']['input'];
  school: Scalars['ID']['input'];
  status?: InputMaybe<OrgStatus>;
};

export type CreateJournalInput = {
  content: Scalars['String']['input'];
  entities?: InputMaybe<Array<Scalars['String']['input']>>;
  keywords?: InputMaybe<Array<Scalars['String']['input']>>;
  mood?: InputMaybe<Scalars['String']['input']>;
  /**
   * Catalogue prompts. Each must exist, be live, and belong to the `journal`
   * category — otherwise an entry could cite a sleep-survey question and a reader
   * rendering "you were asked:" would show a prompt from another surface.
   */
  question_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  sentiment?: InputMaybe<Scalars['Float']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

export type CreateLessonInput = {
  category: Scalars['String']['input'];
  cover_url?: InputMaybe<Scalars['String']['input']>;
  duration_seconds?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  sparks?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
  unit: Scalars['ID']['input'];
  video_url?: InputMaybe<Scalars['String']['input']>;
};

export type CreateMilestoneInput = {
  key: Scalars['String']['input'];
  kind: MilestoneKind;
  order?: InputMaybe<Scalars['Int']['input']>;
  reward_sparks?: InputMaybe<Scalars['Int']['input']>;
  threshold: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type CreateMiniSurveyInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  completed_at?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  responses?: InputMaybe<Array<SurveyResponseInput>>;
  score?: InputMaybe<Scalars['Int']['input']>;
  survey_type: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

export type CreateMoodCategoryInput = {
  identifier: Scalars['String']['input'];
  label: Scalars['String']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
};

export type CreateMoodHistoryInput = {
  moods: Array<MoodEntryInput>;
  note?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['String']['input'];
};

export type CreateMoodInput = {
  category: Scalars['String']['input'];
  color: Scalars['String']['input'];
  cover: AssetInput;
  description: Scalars['String']['input'];
  identifier: Scalars['String']['input'];
  label: Scalars['String']['input'];
  order: Scalars['Int']['input'];
  text_color: Scalars['String']['input'];
  tips: Array<TipInput>;
  video?: InputMaybe<AssetInput>;
};

export type CreatePersonalGoalInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  milestones?: InputMaybe<Array<MilestoneInput>>;
  next_check_in?: InputMaybe<Scalars['String']['input']>;
  progress?: InputMaybe<Scalars['Int']['input']>;
  status: Scalars['String']['input'];
  streak?: InputMaybe<Scalars['Int']['input']>;
  target?: InputMaybe<Scalars['String']['input']>;
  target_date?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

export type CreateQuestionInput = {
  category: Scalars['String']['input'];
  label: Scalars['String']['input'];
  max_selections?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type: QuestionType;
};

export type CreateQuestionOptionInput = {
  emoji?: InputMaybe<Scalars['String']['input']>;
  label: Scalars['String']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  question: Scalars['ID']['input'];
  value: Scalars['String']['input'];
};

export type CreateRiskHistoryInput = {
  description: Scalars['String']['input'];
  flagged: Scalars['Boolean']['input'];
  recommendations?: InputMaybe<Array<Scalars['String']['input']>>;
  resolved_at?: InputMaybe<Scalars['String']['input']>;
  risk_level: Scalars['Int']['input'];
  risk_type: Scalars['String']['input'];
  severity?: InputMaybe<Scalars['String']['input']>;
  source: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

export type CreateRuleInput = {
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  rule: Scalars['String']['input'];
};

export type CreateSchoolInfoInput = {
  attendance?: InputMaybe<Scalars['Float']['input']>;
  grade: Scalars['String']['input'];
  grades?: InputMaybe<Array<SubjectGradeInput>>;
  notes?: InputMaybe<Scalars['String']['input']>;
  performance?: InputMaybe<Scalars['String']['input']>;
  school_name: Scalars['String']['input'];
  semester?: InputMaybe<Scalars['String']['input']>;
  subjects?: InputMaybe<Array<Scalars['String']['input']>>;
  user: Scalars['String']['input'];
  year?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateSchoolInput = {
  external_ids?: InputMaybe<Array<ExternalIdInput>>;
  name: Scalars['String']['input'];
  status?: InputMaybe<OrgStatus>;
};

export type CreateSleepProfileInput = {
  bed_time: Scalars['String']['input'];
  disruptions?: InputMaybe<Scalars['Int']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  hours_slept: Scalars['Float']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  quality: Scalars['Int']['input'];
  user: Scalars['String']['input'];
  wake_time: Scalars['String']['input'];
};

export type CreateSparkRuleInput = {
  amount: Scalars['Int']['input'];
  daily_cap?: InputMaybe<Scalars['Int']['input']>;
  event: Scalars['String']['input'];
};

export type CreateTapInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  kind: TapKind;
  lesson: Scalars['ID']['input'];
  media_url?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  question?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateTenantInput = {
  orgName: Scalars['String']['input'];
  ownerEmail: Scalars['String']['input'];
  ownerName: Scalars['String']['input'];
};

export type CreateTenantPayload = {
  owner_user_id: Scalars['ID']['output'];
  status: TenantStatus;
  tenant_id: Scalars['ID']['output'];
};

/**
 * Input for `createTenantUser`. Demographics, preferences and consumer-private
 * metadata blobs are intentionally NOT exposed in this iteration.
 */
export type CreateTenantUserInput = {
  date_of_birth?: InputMaybe<Scalars['String']['input']>;
  display_name?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  external_ids?: InputMaybe<Array<ExternalIdInput>>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  grade?: InputMaybe<Scalars['String']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  user_type_id: Scalars['String']['input'];
};

export type CreateTrustedPersonInput = {
  available?: InputMaybe<Scalars['Boolean']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  contact?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  relationship: Scalars['String']['input'];
  role?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['String']['input'];
};

export type CreateUnitInput = {
  course: Scalars['ID']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreateWebhookInput = {
  active: Scalars['Boolean']['input'];
  events: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type CreateWinGratitudeInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  emotion?: InputMaybe<Scalars['String']['input']>;
  related_goal?: InputMaybe<Scalars['String']['input']>;
  shared_with?: InputMaybe<Array<Scalars['String']['input']>>;
  title: Scalars['String']['input'];
  type: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

/** The four things a student can do each day. */
export type DailyCard = {
  done: Scalars['Boolean']['output'];
  family: DailyCardFamily;
};

export const DailyCardFamily = {
  About: 'ABOUT',
  Mood: 'MOOD',
  Wins: 'WINS',
  Write: 'WRITE'
} as const;

export type DailyCardFamily = typeof DailyCardFamily[keyof typeof DailyCardFamily];
export type DailyCards = {
  cards: Array<DailyCard>;
  /**
   * Consecutive days with at least one check-in. Counts from TODAY or YESTERDAY:
   * at 09:00 a student with a week behind them who has not opened the app yet
   * still has their streak.
   */
  streak_days: Scalars['Int']['output'];
};

export type DeleteAlertContactResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteAnalysisResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteCommonQuestionResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteConnectorResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteCopingToolResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteFeedbackResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteJournalResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteMiniSurveyResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteMoodCategoryResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteMoodHistoryResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteMoodResponse = {
  id: Scalars['ID']['output'];
};

export type DeletePersonResponse = {
  id: Scalars['ID']['output'];
};

export type DeletePersonalGoalResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteQuestionOptionPayload = {
  id: Scalars['ID']['output'];
};

export type DeleteQuestionPayload = {
  id: Scalars['ID']['output'];
};

export type DeleteRiskHistoryResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteRuleResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteSchoolInfoResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteSleepProfileResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteTenantUserPayload = {
  id: Scalars['ID']['output'];
};

export type DeleteTrustedPersonResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteWebhookResponse = {
  id: Scalars['ID']['output'];
};

export type DeleteWinGratitudeResponse = {
  id: Scalars['ID']['output'];
};

export type EmailNotification = {
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  recipients: Array<Scalars['String']['output']>;
  sg_message_id: Scalars['String']['output'];
  status: Scalars['String']['output'];
  template_name: Scalars['String']['output'];
  tenant: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type EmotionalState = {
  intensity: Scalars['Float']['output'];
  primary: Scalars['String']['output'];
  secondary: Scalars['String']['output'];
};

export type EngagementMilestone = {
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  kind: MilestoneKind;
  order: Scalars['Int']['output'];
  reward_sparks: Scalars['Int']['output'];
  threshold: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type EnrollPersonInput = {
  grade?: InputMaybe<Scalars['String']['input']>;
  organization_name: Scalars['String']['input'];
  organization_type: Scalars['String']['input'];
  role: Scalars['String']['input'];
  start_date?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['ID']['input'];
};

export type Enrollment = {
  created_at: Scalars['String']['output'];
  end_date?: Maybe<Scalars['String']['output']>;
  grade?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  organization_id: Scalars['String']['output'];
  role: Scalars['String']['output'];
  start_date?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  user: Scalars['ID']['output'];
};

export type ErasePersonResponse = {
  erased_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type EscalationPolicy = {
  ackTimeoutMinutes: Scalars['Int']['output'];
  active: Scalars['Boolean']['output'];
  contacts: Array<PolicyContact>;
  createdAt: Scalars['String']['output'];
  fallbackPolicyId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  targetRoles: Array<Role>;
  tenantId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type EvaluateTrustInput = {
  data_hash?: InputMaybe<Scalars['String']['input']>;
  event_type: Scalars['String']['input'];
  has_consent: Scalars['Boolean']['input'];
  payload?: InputMaybe<Scalars['String']['input']>;
  source: Scalars['String']['input'];
  timestamp: Scalars['String']['input'];
  user: Scalars['ID']['input'];
};

export type EventTimeline = {
  events: Array<BehavioralEvent>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type Explanation = {
  summary: Scalars['String']['output'];
  why: Scalars['String']['output'];
};

export type ExternalId = {
  id: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

export type ExternalIdInput = {
  id: Scalars['String']['input'];
  source: Scalars['String']['input'];
};

/**
 * External identity reference for a tenant-internal User (e.g. SSO subject,
 * LMS identifier).
 */
export type ExternalId = {
  id: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

/** Input variant of ExternalId for create/update mutations. */
export type ExternalIdInput = {
  id: Scalars['String']['input'];
  source: Scalars['String']['input'];
};

export type Feedback = {
  analyze: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  feedback: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  model: Scalars['String']['output'];
  response: Scalars['String']['output'];
  score: Scalars['String']['output'];
  text: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

export type GetAnalysisFromLlmsResponse = {
  llms: Array<Llm>;
};

export type GetBalanceResponse = {
  currency: Scalars['String']['output'];
  current_balance: Scalars['Int64']['output'];
  user_id: Scalars['ID']['output'];
};

export type GrantConsentInput = {
  data_category: Scalars['String']['input'];
  expires_at?: InputMaybe<Scalars['String']['input']>;
  granted_by: Scalars['String']['input'];
  purpose: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

/** A cohort inside one school: a class, a section, an advisory. */
export type Group = {
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /**
   * The owning teacher. A group must be owned by a user whose `user_type_id` is
   * `teacher` AND who belongs to the group's school; both are enforced by
   * activity-ingestor, which is the only place that can join those tables.
   */
  owner: Scalars['ID']['output'];
  school: Scalars['ID']['output'];
  status: OrgStatus;
  updated_at: Scalars['String']['output'];
};

/** Membership of a tenant-internal user in a group. */
export type GroupMember = {
  created_at: Scalars['String']['output'];
  group: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  pending: Scalars['Boolean']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['ID']['output'];
};

export type InferenceOutput = {
  confidence?: Maybe<Confidence>;
  contributingFactors: Array<Scalars['String']['output']>;
  emotionalState?: Maybe<EmotionalState>;
  explanation?: Maybe<Explanation>;
  flags: Array<Scalars['String']['output']>;
  historicalAlignment: Scalars['Float']['output'];
  riskSignal?: Maybe<RiskSignal>;
};

export type IngestEventInput = {
  data_hash?: InputMaybe<Scalars['String']['input']>;
  event_type: Scalars['String']['input'];
  external_ids_id: Array<Scalars['String']['input']>;
  external_ids_source: Array<Scalars['String']['input']>;
  payload: Scalars['String']['input'];
  source: Scalars['String']['input'];
  timestamp: Scalars['String']['input'];
};

export type IngestEventResponse = {
  event: BehavioralEvent;
  routing_decision: Scalars['String']['output'];
};

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
 * Full deterministic intervention payload returned to the client for UI rendering.
 * Pathway assignment is deterministic by risk level (see InterventionPathway docs).
 */
export type InterventionPayload = {
  actionPayload: ActionPayload;
  pathway: InterventionPathway;
  sessionId: Scalars['String']['output'];
  supportBlocks: Array<SupportBlock>;
};

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
/** A coping or action tool in the Action Layer dashboard (SAD §7.4). */
export type InterventionTool = {
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  toolType: Scalars['String']['output'];
};

/**
 * Result of `inviteUser`. The token itself is deliberately absent — it leaves
 * the platform only inside the email.
 */
export type InviteUserPayload = {
  /** ISO-8601 instant after which the invitation link stops working. */
  expires_at: Scalars['String']['output'];
};

export type Journal = {
  content: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  entities: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  keywords: Array<Scalars['String']['output']>;
  mood?: Maybe<Scalars['String']['output']>;
  /**
   * The catalogue prompts this entry was written against. Empty for an
   * unprompted entry, which is the ordinary case.
   */
  question_ids: Array<Scalars['ID']['output']>;
  sentiment?: Maybe<Scalars['Float']['output']>;
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

export type KeyValuePair = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type Llm = {
  analysis: Analysis;
  name: Scalars['String']['output'];
};

export type LmsAssignment = {
  course_external_id: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  due_date?: Maybe<Scalars['String']['output']>;
  external_id: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lms_type: Scalars['String']['output'];
  max_points?: Maybe<Scalars['Float']['output']>;
  state: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  work_type: Scalars['String']['output'];
};

export type LmsAssignmentsPage = {
  assignments: Array<LmsAssignment>;
  next_page_token: Scalars['String']['output'];
};

export type LmsConnectionStatus = {
  expires_at: Scalars['String']['output'];
  lms_type: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type LmsCourse = {
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  external_id: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lms_type: Scalars['String']['output'];
  name: Scalars['String']['output'];
  state: Scalars['String']['output'];
  teacher_email: Scalars['String']['output'];
  teacher_name: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type LmsCoursesPage = {
  courses: Array<LmsCourse>;
  next_page_token: Scalars['String']['output'];
};

export type LmsEnrollment = {
  course_external_id: Scalars['String']['output'];
  current_grade?: Maybe<Scalars['String']['output']>;
  current_score?: Maybe<Scalars['Float']['output']>;
  enrolled_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lms_type: Scalars['String']['output'];
  role: Scalars['String']['output'];
  state: Scalars['String']['output'];
  user_external_id: Scalars['String']['output'];
};

export type LmsEnrollmentsPage = {
  enrollments: Array<LmsEnrollment>;
  next_page_token: Scalars['String']['output'];
};

export type LmsStudent = {
  email: Scalars['String']['output'];
  external_id: Scalars['String']['output'];
  first_name: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  last_name: Scalars['String']['output'];
  lms_type: Scalars['String']['output'];
  photo_url?: Maybe<Scalars['String']['output']>;
};

export type LmsStudentGrades = {
  submissions: Array<LmsSubmission>;
};

export type LmsStudentsPage = {
  next_page_token: Scalars['String']['output'];
  students: Array<LmsStudent>;
};

export type LmsSubmission = {
  assignment_external_id: Scalars['String']['output'];
  external_id: Scalars['String']['output'];
  grade?: Maybe<Scalars['String']['output']>;
  graded_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  late: Scalars['Boolean']['output'];
  lms_type: Scalars['String']['output'];
  max_points?: Maybe<Scalars['Float']['output']>;
  score?: Maybe<Scalars['Float']['output']>;
  state: Scalars['String']['output'];
  student_external_id: Scalars['String']['output'];
  submitted_at: Scalars['String']['output'];
};

export type LmsSubmissionsPage = {
  next_page_token: Scalars['String']['output'];
  submissions: Array<LmsSubmission>;
};

export type Lesson = {
  category: Scalars['String']['output'];
  cover_url?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  duration_seconds: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  order: Scalars['Int']['output'];
  /** What completing this lesson pays. Lives on the lesson because it varies. */
  sparks: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  unit: Scalars['ID']['output'];
  updated_at: Scalars['String']['output'];
  video_url?: Maybe<Scalars['String']['output']>;
};

export type LinkExternalIdInput = {
  external_id: ExternalIdInput;
  user: Scalars['ID']['input'];
};

export type ListAlertContactsResponse = {
  contacts: Array<AlertContact>;
};

export type ListAnalysesResponse = {
  analyses: Array<Analysis>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListAvatarsPayload = {
  avatars: Array<Avatar>;
  next_page_token: Scalars['String']['output'];
};

export type ListCollectiblesPayload = {
  collectibles: Array<Collectible>;
  next_page_token: Scalars['String']['output'];
};

export type ListCommonQuestionsResponse = {
  common_questions: Array<CommonQuestion>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListConnectorsResponse = {
  connectors: Array<Connector>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListConsentsResponse = {
  consents: Array<Consent>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListContentInteractionsPayload = {
  interactions: Array<ContentInteraction>;
  next_page_token: Scalars['String']['output'];
};

export type ListCopingToolUsagesResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  tool_usages: Array<CopingToolUsage>;
};

export type ListCopingToolsResponse = {
  coping_tools: Array<CopingTool>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListCourseCollectionsPayload = {
  collections: Array<CourseCollection>;
  next_page_token: Scalars['String']['output'];
};

export type ListCoursesPayload = {
  courses: Array<Course>;
  next_page_token: Scalars['String']['output'];
};

export type ListEmailNotificationsResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  notifications: Array<EmailNotification>;
};

export type ListEnrollmentsResponse = {
  enrollments: Array<Enrollment>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListFeedbacksResponse = {
  feedbacks: Array<Feedback>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListGroupMembersPayload = {
  group_members: Array<GroupMember>;
  next_page_token: Scalars['String']['output'];
};

export type ListGroupsPayload = {
  groups: Array<Group>;
  next_page_token: Scalars['String']['output'];
};

export type ListJournalsResponse = {
  journals: Array<Journal>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListLessonsPayload = {
  lessons: Array<Lesson>;
  next_page_token: Scalars['String']['output'];
};

export type ListMiniSurveysResponse = {
  mini_surveys: Array<MiniSurvey>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListMoodCategoriesResponse = {
  categories: Array<MoodCategory>;
};

export type ListMoodHistoryResponse = {
  mood_histories: Array<MoodHistory>;
  next_page_token?: Maybe<Scalars['String']['output']>;
};

export type ListMoodsResponse = {
  moods: Array<Mood>;
};

export type ListOwnedCollectiblesPayload = {
  next_page_token: Scalars['String']['output'];
  owned: Array<OwnedCollectible>;
};

export type ListPersonalGoalsResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  personal_goals: Array<PersonalGoal>;
};

export type ListPersonsResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  persons: Array<Person>;
};

export type ListQuestionsPayload = {
  next_page_token: Scalars['String']['output'];
  questions: Array<Question>;
};

export type ListRiskAlertsResponse = {
  alerts: Array<RiskAlert>;
};

export type ListRiskHistoriesResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  risk_histories: Array<RiskHistory>;
};

export type ListRulesResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  rules: Array<Rule>;
};

export type ListSchoolInfosResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  school_infos: Array<SchoolInfo>;
};

export type ListSchoolUsersPayload = {
  next_page_token: Scalars['String']['output'];
  school_users: Array<SchoolUser>;
};

export type ListSchoolsPayload = {
  next_page_token: Scalars['String']['output'];
  schools: Array<School>;
};

export type ListSleepProfilesResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  sleep_profiles: Array<SleepProfile>;
};

export type ListSnapshotsResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  snapshots: Array<Snapshot>;
};

export type ListSparkTransactionsPayload = {
  next_page_token: Scalars['String']['output'];
  transactions: Array<SparkTransaction>;
};

export type ListTapsPayload = {
  next_page_token: Scalars['String']['output'];
  taps: Array<Tap>;
};

/** Filters for `listTenants`. All fields are optional and AND-ed together. */
export type ListTenantsFilterInput = {
  /** RFC 3339 lower bound, INCLUSIVE (`$gte`), on `createdAt`. */
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  /** RFC 3339 upper bound, INCLUSIVE (`$lte`), on `createdAt`. */
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  /** Include soft-deleted tenants. Defaults to false. */
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<TenantStatus>;
};

export type ListTenantsResponse = {
  /** Opaque cursor. Empty string means there are no more pages. */
  nextPageToken: Scalars['String']['output'];
  tenants: Array<TenantSummary>;
};

export type ListTransactionsResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  total_count?: Maybe<Scalars['Int']['output']>;
  transactions: Array<TransactionDetails>;
};

export type ListTrustRelationshipsResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  trust_relationships: Array<TrustRelationship>;
};

export type ListTrustedPeopleResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  trusted_people: Array<TrustedPerson>;
};

export type ListUnitsPayload = {
  next_page_token: Scalars['String']['output'];
  units: Array<Unit>;
};

/**
 * Optional filter for `listUsers`. Only `user_type_id` is supported in this
 * iteration; future fields (status, search) can be added without breaking
 * the existing surface.
 */
export type ListUsersFilterInput = {
  user_type_id?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Paginated response for `listUsers`. `next_page_token` is the opaque cursor
 * to pass back as `pageToken` on the next call; an empty string signals
 * there are no further pages.
 */
export type ListUsersResponse = {
  next_page_token: Scalars['String']['output'];
  users: Array<User>;
};

export type ListWebhooksResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  webhooks: Array<Webhook>;
};

export type ListWinGratitudesResponse = {
  next_page_token?: Maybe<Scalars['String']['output']>;
  win_gratitudes: Array<WinGratitude>;
};

export type MetadataEntry = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type MetricFactor = {
  contribution: Scalars['Float']['output'];
  sourceEventType: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
  trustScore: Scalars['Float']['output'];
  weight: Scalars['Float']['output'];
};

export type MetricFactorsResponse = {
  compositeTrust: Scalars['Float']['output'];
  factors: Array<MetricFactor>;
  metricName: Scalars['String']['output'];
  timeWindow: Scalars['String']['output'];
  user: Scalars['ID']['output'];
};

export type MetricValue = {
  baseline: Scalars['Float']['output'];
  currentWindow: Scalars['Float']['output'];
  delta: Scalars['Float']['output'];
  status: Scalars['String']['output'];
  trustScore: Scalars['Float']['output'];
  volatility: Scalars['Float']['output'];
};

export type Milestone = {
  completed: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

export type MilestoneInput = {
  completed: Scalars['Boolean']['input'];
  title: Scalars['String']['input'];
};

export const MilestoneKind = {
  CheckinsTotal: 'CHECKINS_TOTAL',
  SparksTotal: 'SPARKS_TOTAL',
  StreakDays: 'STREAK_DAYS'
} as const;

export type MilestoneKind = typeof MilestoneKind[keyof typeof MilestoneKind];
export type MiniSurvey = {
  category?: Maybe<Scalars['String']['output']>;
  completed_at?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  duration?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  responses: Array<SurveyResponseEntry>;
  score?: Maybe<Scalars['Int']['output']>;
  survey_type: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

export type Mood = {
  category: MoodCategory;
  color: Scalars['String']['output'];
  cover: Asset;
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
  label: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  text_color: Scalars['String']['output'];
  tips: Array<Tip>;
  video: Asset;
};

export type MoodCategory = {
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
  label: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  platform: Scalars['String']['output'];
};

export type MoodCount = {
  count: Scalars['Int']['output'];
  /** Empty when the mood was deleted from the catalogue after being logged. */
  label: Scalars['String']['output'];
  mood_id: Scalars['ID']['output'];
};

export type MoodCountsResponse = {
  counts: Array<MoodCount>;
  /** Number of history entries in the range, NOT the sum of `counts`. */
  total_checkins: Scalars['Int']['output'];
};

export type MoodEntry = {
  id: Scalars['ID']['output'];
  intensity: Scalars['Int']['output'];
};

export type MoodEntryInput = {
  id: Scalars['ID']['input'];
  intensity: Scalars['Int']['input'];
};

export type MoodHistory = {
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  moods: Array<MoodEntry>;
  note: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

/** Root Mutation type for write operations. */
export type Mutation = {
  /** Placeholder field - mutations are extended in domain-specific schema files */
  _empty?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Redeems an invitation token, sets the password and returns a full session —
   * the invitee is logged in the moment they choose a password.
   *
   * Unauthenticated on purpose: the token IS the credential. Single use; a
   * re-invitation invalidates the previous token.
   */
  acceptInvitation: AuthPayload;
  /**
   * Marks one follow-up as delivered so it stops appearing in `pendingFollowups`.
   *
   * Idempotent: acknowledging an already-consumed follow-up returns
   * `delivered: false` rather than failing. A follow-up belonging to another user
   * is reported as not found, so ids cannot be probed.
   */
  ackFollowup: AckFollowupResponse;
  acknowledgeRiskAlert: RiskAlert;
  /**
   * Adding a member requires that the user already belongs to the group's
   * school. Re-adding somebody who was removed reuses their original row.
   */
  addGroupMember: GroupMember;
  addSchoolUser: SchoolUser;
  addTrustedPerson: TrustRelationship;
  /**
   * Exchange a platform admin's token for a short one scoped to another tenant.
   *
   * This is the ONLY cross-tenant path in the system. The caller must hold a live
   * grant in `main.platform_admin`; anyone else gets `Unauthorized`. The returned
   * access token lasts 5 minutes, carries `role = ADMIN` for the TARGET tenant,
   * and has an EMPTY `refresh_token` — it is deliberately not renewable, and an
   * assumed token cannot assume again.
   *
   * Downstream of this gateway the resulting token is indistinguishable from a
   * real admin of the target tenant; no service can tell them apart. The forensic
   * record of the exchange lives in `main.platform_admin_audit` and nowhere else.
   *
   * Errors: caller not on the allowlist ⇒ `Unauthorized`; unknown or deleted
   * tenant ⇒ `NOT_FOUND`.
   */
  assumeTenant: AuthPayload;
  batchIngestEvents: BatchIngestEventsResponse;
  /** Marks a lesson complete and pays its sparks. Completing twice pays once. */
  completeLesson: CompleteLessonPayload;
  /**
   * Finishes a federated login and returns a session identical to `login`'s.
   *
   * `code` for OIDC (Google, ClassLink, Clever); `samlResponse` + `relayState`
   * for SAML 2.0 — though the SAML IdP normally POSTs straight to the gateway's
   * `/sso/saml/acs`, which redirects with a one-time code for `exchangeSsoCode`.
   */
  completeSso: AuthPayload;
  /**
   * Redeems a magic-link token and returns a session. Never touches the
   * password: a magic link is an alternative to typing one, not a way to change
   * it.
   */
  consumeMagicLink: AuthPayload;
  createAction: CreateActionResponse;
  createAlertContact: AlertContact;
  createAnalysis: Analysis;
  createAnalysisFromLLMS: CreateAnalysisFromLlmsResponse;
  /**
   * Create a new API key for programmatic access.
   * The generated key is shown only once - store it securely.
   * Only the tenant owner (role ADMIN) may create keys; an API key acts with
   * ADMIN role on every `@auth` gate.
   */
  createApiKey: ApiKeyPayload;
  createAvatar: Avatar;
  createBillingSetting: BillingSettingResponse;
  createCard: CreateCardResponse;
  createCollectible: Collectible;
  /**
   * The coping-tool catalogue is tenant-wide content, so it is ADMIN-only — same
   * reasoning, and the same hole, as the mood catalogue (plan 2026-09-14
   * step-15).
   */
  createCopingTool: CopingTool;
  createCourse: Course;
  createCourseCollection: CourseCollection;
  createEscalationPolicy: EscalationPolicy;
  createFeedback: Feedback;
  /**
   * Creating a group needs ADMIN, or SCHOOL_ADMIN **of that school** — the
   * membership check happens in activity-ingestor, because the directive here
   * knows the caller's role but not which schools they belong to.
   */
  createGroup: Group;
  /**
   * Creates a new intervention session in the EXPRESSION state for the given student.
   * SAD ref: §7.5 Intervention FSM.
   */
  createInterventionSession: InterventionPayload;
  createJournal: Journal;
  createLesson: Lesson;
  createMilestone: EngagementMilestone;
  createMiniSurvey: MiniSurvey;
  /**
   * The mood catalogue is what every student in the tenant is offered, so it is
   * ADMIN-only. Until plan 2026-09-14 step-15 these three were `@auth(type: USER)`
   * with no role at all: any student could rename or delete every mood in their
   * school.
   */
  createMood: Mood;
  /** Creates a mood category. `identifier` is what `Mood.category` references. */
  createMoodCategory: MoodCategory;
  createMoodHistory: MoodHistory;
  createPaymentAccount: CreateAccountResponse;
  createPersonalGoal: PersonalGoal;
  /**
   * Creates a question. A MULTISELECT needs `max_selections >= 1`: the answer
   * validator derives how many options an answer may carry from the type alone,
   * so an uncapped multiselect would accept any number.
   */
  createQuestion: Question;
  /** Adds an option. Refused on an OPEN question. */
  createQuestionOption: QuestionOption;
  createRiskHistory: RiskHistory;
  createRule: Rule;
  createSchool: School;
  createSchoolInfo: SchoolInfo;
  createSleepProfile: SleepProfile;
  createSparkRule: SparkRule;
  createTap: Tap;
  /**
   * Provisions a tenant and its owner without a password. Restricted to live
   * members of `main.platform_admin`; the guard lives in the auth service, not
   * in this directive, exactly like `listTenants` and `assumeTenant`.
   *
   * The owner receives an email to set their own password. No session is
   * returned: the platform admin is not the owner, and walking away with one
   * would be an unaudited cross-tenant login — that is what `assumeTenant` is
   * for, and it audits.
   *
   * A token obtained through `assumeTenant` cannot call this.
   */
  createTenant: CreateTenantPayload;
  /**
   * Create a tenant-internal user (admin | school-admin | counselor | teacher | parent | support | tutor | student). The
   * caller's tenant context (from JWT or API key) determines the destination
   * database. Fails with ALREADY_EXISTS if a user with the same email already
   * exists in `<tenantID>.user`.
   *
   * Note: this mutation creates the User document only. It does NOT create a
   * login credential in `auth.main.user` — the created user cannot log in
   * directly until a separate signup/onboarding path is implemented.
   *
   * Access control: requires role ADMIN. JWT callers must carry role `admin`
   * (the tenant owner created by `signup`/`signupCanvas`); API-key callers
   * always act as ADMIN (the key is issued by the owner). activity-ingestor
   * re-checks the `role` metadata as defense in depth.
   */
  createTenantUser: User;
  createTrustedPerson: TrustedPerson;
  createUnit: Unit;
  createWebhook: Webhook;
  createWinGratitude: WinGratitude;
  deleteAlertContact: DeleteAlertContactResponse;
  deleteAnalysis: DeleteAnalysisResponse;
  deleteAvatar: Scalars['Boolean']['output'];
  deleteCollectible: Scalars['Boolean']['output'];
  deleteConnector: DeleteConnectorResponse;
  deleteCopingTool: DeleteCopingToolResponse;
  /** Refused while the course still has units; also pulled from every collection. */
  deleteCourse: Scalars['Boolean']['output'];
  deleteCourseCollection: Scalars['Boolean']['output'];
  deleteEscalationPolicy: Scalars['Boolean']['output'];
  deleteFeedback: DeleteFeedbackResponse;
  /** Refused while the group still has live members. */
  deleteGroup: Scalars['Boolean']['output'];
  deleteJournal: DeleteJournalResponse;
  deleteLesson: Scalars['Boolean']['output'];
  deleteMilestone: Scalars['Boolean']['output'];
  deleteMiniSurvey: DeleteMiniSurveyResponse;
  deleteMood: DeleteMoodResponse;
  /**
   * Deletes a mood category. This one is a PHYSICAL delete — `mood_category` has
   * no soft-delete in the schema — so it is refused while any mood still
   * references it.
   */
  deleteMoodCategory: DeleteMoodCategoryResponse;
  deleteMoodHistory: DeleteMoodHistoryResponse;
  deletePerson: DeletePersonResponse;
  deletePersonalGoal: DeletePersonalGoalResponse;
  /** Deletes a question AND its options — orphan options would still resolve. */
  deleteQuestion: DeleteQuestionPayload;
  deleteQuestionOption: DeleteQuestionOptionPayload;
  deleteRiskHistory: DeleteRiskHistoryResponse;
  deleteRule: DeleteRuleResponse;
  /** Refused while the school still has live members. */
  deleteSchool: Scalars['Boolean']['output'];
  deleteSchoolInfo: DeleteSchoolInfoResponse;
  deleteSleepProfile: DeleteSleepProfileResponse;
  deleteSparkRule: Scalars['Boolean']['output'];
  deleteSsoConnection: Scalars['Boolean']['output'];
  deleteTap: Scalars['Boolean']['output'];
  /**
   * Soft-deletes a user of this tenant AND revokes their access: the
   * `main.login_index` mapping goes to `revoked` and every refresh token of that
   * user is killed. An access token already in their hands survives its
   * remaining ≤15 minutes, same as every other revocation on the platform.
   *
   * A caller cannot delete themselves.
   */
  deleteTenantUser: DeleteTenantUserPayload;
  deleteTrustedPerson: DeleteTrustedPersonResponse;
  deleteUnit: Scalars['Boolean']['output'];
  deleteWebhook: DeleteWebhookResponse;
  deleteWinGratitude: DeleteWinGratitudeResponse;
  enrollPerson: Enrollment;
  erasePerson: ErasePersonResponse;
  evaluateTrust: TrustScore;
  /**
   * Redeems the one-time code the SAML ACS redirect carries.
   *
   * It exists so the redirect never carries a token: a `?token=` would sit in the
   * browser history of a shared school laptop and in every referrer the landing
   * page emits. The code is single-use and lives 60 seconds.
   */
  exchangeSsoCode: AuthPayload;
  grantConsent: Consent;
  ingestEvent: IngestEventResponse;
  /**
   * Emails a single-use invitation to a user that already exists in this tenant
   * but has no credential yet.
   *
   * `role: [ADMIN, SCHOOL_ADMIN]` is the coarse gate; the fine one lives in the
   * auth service, which refuses to invite a user whose `user_type` rank is not
   * STRICTLY below the caller's. That rule cannot be written here: the gateway
   * knows the caller's role but not the invitee's, and the ranks come from the
   * per-tenant `user_type` catalogue.
   *
   * An API-key caller acts with the tenant owner's authority and is not bounded
   * by rank.
   */
  inviteUser: InviteUserPayload;
  linkExternalID: Person;
  /**
   * Authenticate with email and password credentials.
   * Returns a JWT token for subsequent authenticated requests.
   *
   * Example:
   *   mutation {
   *     login(email: "user@example.com", password: "secret") {
   *       token
   *       user_id
   *       tenant
   *     }
   *   }
   */
  login: AuthPayload;
  /**
   * Log out the current session.
   *
   * Revokes the supplied refresh token's whole family and denylists the access
   * token's `jti` (read from the `Authorization` header) for its remaining
   * lifetime, so the still-unexpired access token is immediately rejected. Returns
   * `true` on success.
   */
  logout: Scalars['Boolean']['output'];
  /**
   * Buys a collectible for the CALLER — there is no `user` argument. Charges and
   * delivers together: not enough sparks leaves nothing behind, and buying
   * something you already own is refused without a charge.
   */
  purchaseCollectible: PurchaseCollectiblePayload;
  /**
   * Interactions are ALWAYS the caller's own: there is no `user` argument, and
   * the id comes from the token. Recording a view on somebody else's behalf is
   * not a thing anybody needs.
   */
  recordContentView: ContentInteraction;
  /** Registra que un usuario usó una coping tool (con mood antes/después opcional). */
  recordCopingToolUsage: CopingToolUsage;
  /**
   * Records the outcome of a completed intervention session, closes the learning
   * loop back into PBKG (Phase 3), and schedules a follow-up modal on next login
   * subject to the tenant's re-engagement policy (Phase 4).
   * SAD refs: §7.10 Outcome, §7.4.4 Follow-Up.
   */
  recordInterventionOutcome: RecordOutcomeResult;
  refreshLMSToken: RefreshLmsTokenResponse;
  /**
   * Rotate a refresh token into a fresh access+refresh pair.
   *
   * The gateway forwards the refresh token to `auth.AuthService.RefreshToken`,
   * which validates it against the store, detects reuse (revoking the whole token
   * family if an already-rotated token is presented), rotates the family, and
   * returns new tokens. No prior authentication is required — the refresh token
   * itself is the credential.
   */
  refreshToken: AuthPayload;
  registerConnector: Connector;
  registerLMSConnection: RegisterLmsConnectionResponse;
  removeEnrollment: RemoveEnrollmentResponse;
  removeGroupMember: Scalars['Boolean']['output'];
  removeSchoolUser: Scalars['Boolean']['output'];
  removeTrustRelationship: RemoveTrustRelationshipResponse;
  /**
   * Emails a one-click login link. Same non-disclosure property as
   * `requestPasswordReset`.
   */
  requestMagicLink: Scalars['Boolean']['output'];
  /**
   * Starts a password reset. ALWAYS returns `true`, whether or not the address
   * is registered, and always takes the same minimum time — telling the two
   * apart is an account-enumeration oracle.
   */
  requestPasswordReset: Scalars['Boolean']['output'];
  /**
   * Redeems a password-reset token. Also revokes every refresh token of that
   * user: a reset is what someone does when they think the account is
   * compromised, so live sessions must not survive it. The access token already
   * issued lives out its remaining ≤15 minutes, as with every revocation here.
   */
  resetPassword: Scalars['Boolean']['output'];
  resolvePerson: Person;
  /**
   * Re-run tenant provisioning (`manager.CreateMigration` + `payment.CreateAccount`)
   * for the caller's tenant after a `FAILED`/`DEGRADED` status. Forwarded to
   * `auth.TenantService.RetryProvisioning`; only the tenant owner (ADMIN) may
   * call it, and auth rejects it with FAILED_PRECONDITION while an attempt is
   * still in progress (status `PROVISIONING`, started < 10 min ago).
   */
  retryProvisioning: TenantStatusPayload;
  /**
   * Revoke (soft-delete) an API key so it can no longer authenticate.
   *
   * The gateway derives the tenant from the key format, forwards the revoke to
   * `auth.TenantService.RevokeApiKey`, and on success immediately evicts the
   * key from the gateway's in-memory auth cache so the revocation takes effect
   * without waiting for the 60s cache TTL. Returns `true` when an active key was
   * revoked and `false` when no active key matched (idempotent — already revoked
   * or unknown key); a no-match never errors and never leaks whether the key
   * existed. Only the tenant owner (role ADMIN) may revoke keys.
   */
  revokeApiKey: Scalars['Boolean']['output'];
  revokeConsent: Consent;
  sendChatMessage: SendMessageResponse;
  sendEmail: SendEmailResponse;
  setContentLiked: ContentInteraction;
  setContentSaved: ContentInteraction;
  /**
   * El llamante elige su propio avatar (el único cambio que un no-admin puede
   * hacerse). Cadena vacía lo quita. Un avatar archivado se rechaza.
   */
  setMyAvatar: User;
  /**
   * Sets a tenant user's password directly, without the invitation email —
   * admin provisioning for accounts (students, classroom users) whose password an
   * admin hands out rather than the user choosing it.
   *
   * DELIBERATELY reverses the invitation flow's privacy property (there the user
   * picks the password and the admin never learns it), so it carries the SAME
   * strict rank guard as `inviteUser`: enforced in the auth service, the target's
   * `user_type` rank must be STRICTLY below the caller's — an admin may set a
   * student's password, never a peer's or a superior's. `role: [ADMIN,
   * SCHOOL_ADMIN]` is only the coarse gate. An API-key caller acts with the
   * owner's authority and is not bounded by rank.
   *
   * The user must already exist (`createTenantUser`). `email` is what lands in the
   * login index; the auth service bcrypts the password (min 12 chars).
   */
  setTenantUserPassword: Scalars['Boolean']['output'];
  /**
   * Register a new organization (tenant) and its owner (role ADMIN).
   * Returns a JWT token for immediate authenticated access.
   *
   * `auth.AuthService.Signup` owns the whole flow: it creates `main.user`
   * (role `admin`) + `main.tenant` (`name = org_name || name`,
   * `status = PROVISIONING`) and dispatches `manager.CreateMigration` and
   * `payment.CreateAccount` in the background. The gateway does NOT orchestrate
   * anything — poll `tenantStatus` until the tenant is `ACTIVE`/`DEGRADED`.
   *
   * Errors: a live account with the same email ⇒ `EMAIL_ALREADY_REGISTERED`.
   *
   * Example:
   *   mutation {
   *     signup(email: "user@example.com", password: "secret", name: "John Doe", org_name: "Colegio X") {
   *       token
   *       user_id
   *       tenant
   *     }
   *   }
   */
  signup: AuthPayload;
  /**
   * Sign up a Canvas school as an Agatha tenant from an LTI 1.3 launch.
   *
   * The `ltiToken` argument is the HS256 `lti-claims` JWT minted by
   * `canvas-lti-test` after a verified Canvas LTI 1.3 launch. The gateway
   * forwards the JWT to `lms-connector.LMSAuthService.ValidateCanvasLtiToken`,
   * which verifies the signature and admin role, then forwards the parsed
   * claims to `auth.AuthService.SignupCanvas`, which creates (or returns
   * existing — idempotent on iss+client_id+deployment_id) a tenant and
   * admin user.
   *
   * Like `signup`, auth owns provisioning: a NEW tenant starts in
   * `PROVISIONING` and auth dispatches `manager.CreateMigration` +
   * `payment.CreateAccount` in the background (never on the idempotent
   * existing-tenant branch). The gateway does not orchestrate; poll
   * `tenantStatus`.
   */
  signupCanvas: AuthPayload;
  startSession: Session;
  /**
   * Begins a federated login. Returns the URL to send the browser to.
   *
   * The connection is resolved by `tenant`, or by the domain of `email` — the
   * second is what lets one "Sign in with Google" button work without asking a
   * student which school they belong to. An unknown domain and a known one both
   * answer NOT_FOUND.
   *
   * `redirectUri` must be in the deployment's SSO_ALLOWED_REDIRECTS allowlist,
   * matched exactly. It is where the authorization code gets delivered.
   */
  startSso: StartSsoPayload;
  startTest: Test;
  testModels: TestModelsResponse;
  /**
   * Advances an intervention session through the FSM.
   * Returns an error when the requested transition violates FSM rules
   * (e.g. skipping states, SUPPORT→ACTION before support_screen_viewed=true).
   * SAD ref: §7.5 Intervention FSM.
   */
  transitionInterventionState: TransitionResult;
  /** Trigger immediate Tier A recomputation for a single person (risk-critical) */
  triggerTierARecompute: RecomputeResult;
  /** Trigger Tier B batch recomputation for all active persons in a tenant */
  triggerTierBRecompute: RecomputeResult;
  updateAlertContact: AlertContact;
  updateAnalysis: Analysis;
  updateAvatar: Avatar;
  updateBalance: UpdateBalanceResponse;
  updateBillingSetting: BillingSettingResponse;
  updateCollectible: Collectible;
  updateConnector: Connector;
  updateCopingTool: CopingTool;
  updateCourse: Course;
  updateCourseCollection: CourseCollection;
  updateEscalationPolicy: EscalationPolicy;
  updateFeedback: Feedback;
  updateGroup: Group;
  updateJournal: Journal;
  updateLesson: Lesson;
  updateMilestone: EngagementMilestone;
  updateMiniSurvey: MiniSurvey;
  updateMood: Mood;
  /**
   * Edits a mood category. Renaming `identifier` is REFUSED while moods still
   * reference it: `Mood.category` stores the identifier and nothing rewrites it,
   * so the rename would silently orphan them.
   */
  updateMoodCategory: MoodCategory;
  updateMoodHistory: MoodHistory;
  updatePerson: Person;
  updatePersonalGoal: PersonalGoal;
  /**
   * Edits a question. Changing the type to OPEN while options exist is refused:
   * answers would go on validating against options the new type says cannot
   * exist.
   */
  updateQuestion: Question;
  updateQuestionOption: QuestionOption;
  /**
   * Creates or replaces the re-engagement policy for the authenticated tenant.
   * Only tenant admins should be granted this mutation.
   */
  updateReengagementPolicy: ReengagementPolicy;
  updateRiskHistory: RiskHistory;
  updateRule: Rule;
  updateSchool: School;
  updateSchoolInfo: SchoolInfo;
  updateSleepProfile: SleepProfile;
  updateSparkRule: SparkRule;
  updateTap: Tap;
  /**
   * Edits a user of this tenant. Every field is optional; omitted fields are
   * left alone.
   *
   * Moving someone to a `user_type_id` ranked ABOVE the caller's own is refused
   * by activity-ingestor — handing out a privilege you do not hold. Equal rank is
   * allowed, or a tenant could never gain a second admin.
   */
  updateTenantUser: User;
  updateTrustedPerson: TrustedPerson;
  updateUnit: Unit;
  updateWebhook: Webhook;
  updateWinGratitude: WinGratitude;
  /**
   * Tenant admin: own tenant only. A foreign `scope` (another tenant or "main")
   * needs a live platform admin JWT — authorised and audited by authentication;
   * an API key or an assumed token gets FORBIDDEN.
   */
  uploadAsset: AssetUpload;
  upsertSnapshot: Snapshot;
  /**
   * Creates or replaces this tenant's connection to one identity provider.
   *
   * `clientSecret` is write-only: it is encrypted at rest and NEVER returned.
   * Sending it empty leaves the stored one alone, because a UI that cannot read
   * it cannot send it back either, and treating the blank as a delete would wipe
   * the credential on every unrelated edit.
   */
  upsertSsoConnection: SsoConnection;
  /** Validate an API key and return associated tenant/user information. */
  validateApiKey: ValidateApiKeyPayload;
  /**
   * Validate the current authentication token and return user information.
   * Useful for checking if a token is still valid.
   */
  validateToken: AuthPayload;
};


/** Root Mutation type for write operations. */
export type MutationAcceptInvitationArgs = {
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationAckFollowupArgs = {
  id: Scalars['ID']['input'];
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Mutation type for write operations. */
export type MutationAcknowledgeRiskAlertArgs = {
  acknowledgedBy: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationAddGroupMemberArgs = {
  group: Scalars['ID']['input'];
  pending?: InputMaybe<Scalars['Boolean']['input']>;
  user: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationAddSchoolUserArgs = {
  pending?: InputMaybe<Scalars['Boolean']['input']>;
  school: Scalars['ID']['input'];
  user: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationAddTrustedPersonArgs = {
  input: AddTrustedPersonInput;
};


/** Root Mutation type for write operations. */
export type MutationAssumeTenantArgs = {
  tenant: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationBatchIngestEventsArgs = {
  input: BatchIngestEventsInput;
};


/** Root Mutation type for write operations. */
export type MutationCompleteLessonArgs = {
  lesson: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationCompleteSsoArgs = {
  input: CompleteSsoInput;
};


/** Root Mutation type for write operations. */
export type MutationConsumeMagicLinkArgs = {
  token: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationCreateActionArgs = {
  input: CreateActionInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateAlertContactArgs = {
  input: CreateAlertContactInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateAnalysisArgs = {
  input: CreateAnalysisInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateAnalysisFromLlmsArgs = {
  input: CreateAnalysisFromLlmsInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateAvatarArgs = {
  input: CreateAvatarInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateBillingSettingArgs = {
  input: CreateBillingSettingInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateCardArgs = {
  card: CardInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateCollectibleArgs = {
  input: CreateCollectibleInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateCopingToolArgs = {
  input: CreateCopingToolInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateCourseArgs = {
  input: CreateCourseInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateCourseCollectionArgs = {
  input: CreateCourseCollectionInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateEscalationPolicyArgs = {
  input: CreateEscalationPolicyInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateFeedbackArgs = {
  input: CreateFeedbackInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateInterventionSessionArgs = {
  studentId: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationCreateJournalArgs = {
  input: CreateJournalInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateLessonArgs = {
  input: CreateLessonInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateMilestoneArgs = {
  input: CreateMilestoneInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateMiniSurveyArgs = {
  input: CreateMiniSurveyInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateMoodArgs = {
  input: CreateMoodInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateMoodCategoryArgs = {
  input: CreateMoodCategoryInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateMoodHistoryArgs = {
  input: CreateMoodHistoryInput;
};


/** Root Mutation type for write operations. */
export type MutationCreatePaymentAccountArgs = {
  input: CreateAccountInput;
};


/** Root Mutation type for write operations. */
export type MutationCreatePersonalGoalArgs = {
  input: CreatePersonalGoalInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateQuestionArgs = {
  input: CreateQuestionInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateQuestionOptionArgs = {
  input: CreateQuestionOptionInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateRiskHistoryArgs = {
  input: CreateRiskHistoryInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateRuleArgs = {
  input: CreateRuleInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateSchoolArgs = {
  input: CreateSchoolInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateSchoolInfoArgs = {
  input: CreateSchoolInfoInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateSleepProfileArgs = {
  input: CreateSleepProfileInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateSparkRuleArgs = {
  input: CreateSparkRuleInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateTapArgs = {
  input: CreateTapInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateTenantArgs = {
  input: CreateTenantInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateTenantUserArgs = {
  input: CreateTenantUserInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateTrustedPersonArgs = {
  input: CreateTrustedPersonInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateUnitArgs = {
  input: CreateUnitInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateWebhookArgs = {
  input: CreateWebhookInput;
};


/** Root Mutation type for write operations. */
export type MutationCreateWinGratitudeArgs = {
  input: CreateWinGratitudeInput;
};


/** Root Mutation type for write operations. */
export type MutationDeleteAlertContactArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteAnalysisArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteAvatarArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteCollectibleArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteConnectorArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteCopingToolArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteCourseArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteCourseCollectionArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteEscalationPolicyArgs = {
  id: Scalars['ID']['input'];
  tenantId?: InputMaybe<Scalars['String']['input']>;
};


/** Root Mutation type for write operations. */
export type MutationDeleteFeedbackArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteGroupArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteJournalArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteLessonArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteMilestoneArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteMiniSurveyArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteMoodArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteMoodCategoryArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteMoodHistoryArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeletePersonArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeletePersonalGoalArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteQuestionArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteQuestionOptionArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteRiskHistoryArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteRuleArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteSchoolArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteSchoolInfoArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteSleepProfileArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteSparkRuleArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteSsoConnectionArgs = {
  provider: SsoProvider;
};


/** Root Mutation type for write operations. */
export type MutationDeleteTapArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteTenantUserArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteTrustedPersonArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteUnitArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteWebhookArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationDeleteWinGratitudeArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationEnrollPersonArgs = {
  input: EnrollPersonInput;
};


/** Root Mutation type for write operations. */
export type MutationErasePersonArgs = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationEvaluateTrustArgs = {
  input: EvaluateTrustInput;
};


/** Root Mutation type for write operations. */
export type MutationExchangeSsoCodeArgs = {
  code: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationGrantConsentArgs = {
  input: GrantConsentInput;
};


/** Root Mutation type for write operations. */
export type MutationIngestEventArgs = {
  input: IngestEventInput;
};


/** Root Mutation type for write operations. */
export type MutationInviteUserArgs = {
  email: Scalars['String']['input'];
  user: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationLinkExternalIdArgs = {
  input: LinkExternalIdInput;
};


/** Root Mutation type for write operations. */
export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationLogoutArgs = {
  refresh_token: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationPurchaseCollectibleArgs = {
  collectibleId: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationRecordContentViewArgs = {
  contentId: Scalars['ID']['input'];
  contentKind: ContentKind;
};


/** Root Mutation type for write operations. */
export type MutationRecordCopingToolUsageArgs = {
  input: RecordCopingToolUsageInput;
};


/** Root Mutation type for write operations. */
export type MutationRecordInterventionOutcomeArgs = {
  input: RecordOutcomeInput;
};


/** Root Mutation type for write operations. */
export type MutationRefreshLmsTokenArgs = {
  input: RefreshLmsTokenInput;
};


/** Root Mutation type for write operations. */
export type MutationRefreshTokenArgs = {
  refresh_token: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationRegisterConnectorArgs = {
  input: RegisterConnectorInput;
};


/** Root Mutation type for write operations. */
export type MutationRegisterLmsConnectionArgs = {
  input: RegisterLmsConnectionInput;
};


/** Root Mutation type for write operations. */
export type MutationRemoveEnrollmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationRemoveGroupMemberArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationRemoveSchoolUserArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationRemoveTrustRelationshipArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationRequestMagicLinkArgs = {
  email: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationRequestPasswordResetArgs = {
  email: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationResetPasswordArgs = {
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationResolvePersonArgs = {
  input: ResolvePersonInput;
};


/** Root Mutation type for write operations. */
export type MutationRevokeApiKeyArgs = {
  api_key: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationRevokeConsentArgs = {
  id: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationSendChatMessageArgs = {
  input: SendMessageInput;
};


/** Root Mutation type for write operations. */
export type MutationSendEmailArgs = {
  input: SendEmailInput;
};


/** Root Mutation type for write operations. */
export type MutationSetContentLikedArgs = {
  contentId: Scalars['ID']['input'];
  contentKind: ContentKind;
  liked: Scalars['Boolean']['input'];
};


/** Root Mutation type for write operations. */
export type MutationSetContentSavedArgs = {
  contentId: Scalars['ID']['input'];
  contentKind: ContentKind;
  saved: Scalars['Boolean']['input'];
};


/** Root Mutation type for write operations. */
export type MutationSetMyAvatarArgs = {
  avatarId: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationSetTenantUserPasswordArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  user: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationSignupArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  org_name?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationSignupCanvasArgs = {
  ltiToken: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationStartSessionArgs = {
  user: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationStartSsoArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  provider: SsoProvider;
  redirectUri: Scalars['String']['input'];
  tenant?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Mutation type for write operations. */
export type MutationStartTestArgs = {
  user: Scalars['String']['input'];
};


/** Root Mutation type for write operations. */
export type MutationTestModelsArgs = {
  input: TestModelsInput;
};


/** Root Mutation type for write operations. */
export type MutationTransitionInterventionStateArgs = {
  sessionId: Scalars['ID']['input'];
  toState: InterventionState;
};


/** Root Mutation type for write operations. */
export type MutationTriggerTierARecomputeArgs = {
  eventId: Scalars['String']['input'];
  eventType: Scalars['String']['input'];
  user: Scalars['ID']['input'];
};


/** Root Mutation type for write operations. */
export type MutationUpdateAlertContactArgs = {
  input: UpdateAlertContactInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateAnalysisArgs = {
  input: UpdateAnalysisInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateAvatarArgs = {
  input: UpdateAvatarInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateBalanceArgs = {
  input: UpdateBalanceInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateBillingSettingArgs = {
  input: UpdateBillingSettingInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateCollectibleArgs = {
  input: UpdateCollectibleInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateConnectorArgs = {
  id: Scalars['ID']['input'];
  input: UpdateConnectorInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateCopingToolArgs = {
  input: UpdateCopingToolInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateCourseArgs = {
  input: UpdateCourseInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateCourseCollectionArgs = {
  input: UpdateCourseCollectionInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateEscalationPolicyArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEscalationPolicyInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateFeedbackArgs = {
  input: UpdateFeedbackInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateGroupArgs = {
  input: UpdateGroupInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateJournalArgs = {
  input: UpdateJournalInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateLessonArgs = {
  input: UpdateLessonInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateMilestoneArgs = {
  input: UpdateMilestoneInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateMiniSurveyArgs = {
  input: UpdateMiniSurveyInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateMoodArgs = {
  input: UpdateMoodInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateMoodCategoryArgs = {
  input: UpdateMoodCategoryInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateMoodHistoryArgs = {
  input: UpdateMoodHistoryInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdatePersonArgs = {
  input: UpdatePersonInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdatePersonalGoalArgs = {
  input: UpdatePersonalGoalInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateQuestionArgs = {
  input: UpdateQuestionInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateQuestionOptionArgs = {
  input: UpdateQuestionOptionInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateReengagementPolicyArgs = {
  input: ReengagementPolicyInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateRiskHistoryArgs = {
  input: UpdateRiskHistoryInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateRuleArgs = {
  input: UpdateRuleInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateSchoolArgs = {
  input: UpdateSchoolInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateSchoolInfoArgs = {
  input: UpdateSchoolInfoInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateSleepProfileArgs = {
  input: UpdateSleepProfileInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateSparkRuleArgs = {
  input: UpdateSparkRuleInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateTapArgs = {
  input: UpdateTapInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateTenantUserArgs = {
  input: UpdateTenantUserInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateTrustedPersonArgs = {
  input: UpdateTrustedPersonInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateUnitArgs = {
  input: UpdateUnitInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateWebhookArgs = {
  input: UpdateWebhookInput;
};


/** Root Mutation type for write operations. */
export type MutationUpdateWinGratitudeArgs = {
  input: UpdateWinGratitudeInput;
};


/** Root Mutation type for write operations. */
export type MutationUploadAssetArgs = {
  input: UploadAssetInput;
};


/** Root Mutation type for write operations. */
export type MutationUpsertSnapshotArgs = {
  input: UpsertSnapshotInput;
};


/** Root Mutation type for write operations. */
export type MutationUpsertSsoConnectionArgs = {
  input: SsoConnectionInput;
};


/** Root Mutation type for write operations. */
export type MutationValidateApiKeyArgs = {
  api_key: Scalars['String']['input'];
};

export const OrgStatus = {
  Active: 'ACTIVE',
  Archived: 'ARCHIVED'
} as const;

export type OrgStatus = typeof OrgStatus[keyof typeof OrgStatus];
export type OwnedCollectible = {
  acquired_at: Scalars['String']['output'];
  collectible: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  /** The receipt: which spark movement paid for it. Empty for a free item. */
  spark_transaction?: Maybe<Scalars['ID']['output']>;
  user: Scalars['ID']['output'];
};

export type PaymentAccount = {
  account: Scalars['String']['output'];
  agreement_free: Scalars['Boolean']['output'];
  amount: Scalars['String']['output'];
  deleted_at?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  tenant: Scalars['String']['output'];
};

/**
 * A follow-up modal waiting to be shown to a user.
 *
 * Follow-ups are scheduled with `scheduled_for: "next_login"` — deliberately not
 * wall-clock scheduled, because the modal belongs on the student's next visit and
 * no server-side moment is the right one. The client therefore PULLS: it asks for
 * its pending follow-ups at login and acknowledges each one it shows.
 */
export type PendingFollowup = {
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  session_id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  user: Scalars['ID']['output'];
};

export type PendingFollowupsResponse = {
  schedules: Array<PendingFollowup>;
};

export type Person = {
  created_at: Scalars['String']['output'];
  date_of_birth?: Maybe<Scalars['String']['output']>;
  external_ids: Array<ExternalId>;
  first_name: Scalars['String']['output'];
  grade?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  last_name: Scalars['String']['output'];
  status: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type PersonalGoal = {
  category?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  milestones: Array<Milestone>;
  next_check_in?: Maybe<Scalars['String']['output']>;
  progress?: Maybe<Scalars['Int']['output']>;
  status: Scalars['String']['output'];
  streak?: Maybe<Scalars['Int']['output']>;
  target?: Maybe<Scalars['String']['output']>;
  target_date?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

/** Outcome of one `manager.CreateMigration` phase. */
export type PhaseResult = {
  /** Wall-clock duration of the phase in milliseconds */
  duration_ms: Scalars['Int']['output'];
  /** Human-readable detail (error text on failure) */
  message?: Maybe<Scalars['String']['output']>;
  /** Phase name (e.g. `mongodb`, `seeds`, `vector`, `neo4j`, `kms`) */
  name: Scalars['String']['output'];
  /** Whether a failure of this phase leaves the tenant `FAILED` (true) or `DEGRADED` (false) */
  required: Scalars['Boolean']['output'];
  /** `PHASE_SUCCESS` | `PHASE_FAILED` | `PHASE_SKIPPED` */
  status: Scalars['String']['output'];
};

export type PolicyContact = {
  email: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  role: Role;
  webhookUrl: Scalars['String']['output'];
};

export type PolicyContactInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  role: Role;
  webhookUrl?: InputMaybe<Scalars['String']['input']>;
};

export type PurchaseCollectiblePayload = {
  balance: Scalars['Int']['output'];
  /** False for a free collectible, which writes no spark movement at all. */
  charged: Scalars['Boolean']['output'];
  owned: OwnedCollectible;
};

/** Root Query type for read operations. */
export type Query = {
  /**
   * Get the current account information for the authenticated user or API key.
   * Returns billing and subscription details.
   *
   * Example:
   *   query {
   *     account {
   *       id
   *       agreement_free
   *     }
   *   }
   */
  account: AccountPayload;
  checkConsent: Scalars['Boolean']['output'];
  /** Aggregated metrics for a cohort (tenant/organization/district/classroom) */
  cohortMetrics: CohortMetricsResponse;
  connector?: Maybe<Connector>;
  connectors: ListConnectorsResponse;
  consents: ListConsentsResponse;
  dailyCards: DailyCards;
  escalationPolicies: Array<EscalationPolicy>;
  escalationPolicy?: Maybe<EscalationPolicy>;
  event?: Maybe<BehavioralEvent>;
  eventTimeline: EventTimeline;
  getAlertContact: AlertContact;
  getAnalysis: Analysis;
  getAnalysisFromLLMS: GetAnalysisFromLlmsResponse;
  getBalance: GetBalanceResponse;
  getBillingSetting: BillingSettingResponse;
  getCommonQuestion: CommonQuestion;
  getConsent: Consent;
  getCopingTool: CopingTool;
  getCourse: Course;
  getCourseCollection: CourseCollection;
  getEmailNotification: EmailNotification;
  getEnrollment: Enrollment;
  getFeedback: Feedback;
  getGroup: Group;
  getJournal: Journal;
  getLMSAssignment: LmsAssignment;
  getLMSConnectionStatus: LmsConnectionStatus;
  getLMSCourse: LmsCourse;
  getLMSCourseStudents: LmsStudentsPage;
  getLMSStudentGrades: LmsStudentGrades;
  getLesson: Lesson;
  getMiniSurvey: MiniSurvey;
  getMood: Mood;
  getMoodHistory: MoodHistory;
  getPersonalGoal: PersonalGoal;
  getQuestion: Question;
  getRiskAlert: RiskAlert;
  getRiskHistory: RiskHistory;
  getRule: Rule;
  getSchool: School;
  getSchoolInfo: SchoolInfo;
  getSleepProfile: SleepProfile;
  getSourceStats: SourceStats;
  getTransaction: TransactionDetails;
  getTrustRelationship: TrustRelationship;
  getTrustedPerson: TrustedPerson;
  getUnit: Unit;
  /**
   * Fetch a single tenant-internal user by ID. Returns NOT_FOUND if the user
   * does not exist in `<tenantID>.user`.
   */
  getUser: User;
  getWebhook: Webhook;
  getWinGratitude: WinGratitude;
  /** Health check endpoint - returns 'ok' if the service is running */
  health: Scalars['String']['output'];
  /**
   * Returns a deterministic intervention payload for the given student.
   * Pathway is assigned by current risk level:
   *   0-2 → ROUTINE, 3 → OBSERVATION, 4-6 → IMMEDIATE_SAFETY
   */
  intervention: InterventionPayload;
  latestSnapshot?: Maybe<Snapshot>;
  listAlertContacts: ListAlertContactsResponse;
  listAnalyses: ListAnalysesResponse;
  listAvatars: ListAvatarsPayload;
  listCollectibles: ListCollectiblesPayload;
  listCommonQuestions: ListCommonQuestionsResponse;
  listCopingToolUsages: ListCopingToolUsagesResponse;
  listCopingTools: ListCopingToolsResponse;
  listCourseCollections: ListCourseCollectionsPayload;
  listCourses: ListCoursesPayload;
  listEmailNotifications: ListEmailNotificationsResponse;
  listEnrollments: ListEnrollmentsResponse;
  listFeedbacks: ListFeedbacksResponse;
  listGroupMembers: ListGroupMembersPayload;
  listGroups: ListGroupsPayload;
  listGroupsForUser: ListGroupsPayload;
  listJournals: ListJournalsResponse;
  listLMSAssignments: LmsAssignmentsPage;
  listLMSCourses: LmsCoursesPage;
  listLMSEnrollments: LmsEnrollmentsPage;
  listLMSSubmissions: LmsSubmissionsPage;
  listLessons: ListLessonsPayload;
  listMilestones: Array<EngagementMilestone>;
  listMiniSurveys: ListMiniSurveysResponse;
  listMoodCategories: ListMoodCategoriesResponse;
  listMoodHistory: ListMoodHistoryResponse;
  listMoods: ListMoodsResponse;
  listOwnedCollectibles: ListOwnedCollectiblesPayload;
  listPersonalGoals: ListPersonalGoalsResponse;
  /**
   * The catalogue, optionally narrowed to one category. Options come embedded —
   * there is no second round trip per question.
   */
  listQuestions: ListQuestionsPayload;
  /**
   * Lessons the student has not completed, preferring the category they have
   * watched most in the last 30 days. With no history, catalogue order — which is
   * the editor's own opinion of where to start.
   */
  listRecommendedContent: Array<Lesson>;
  listRiskAlerts: ListRiskAlertsResponse;
  listRiskHistories: ListRiskHistoriesResponse;
  listRules: ListRulesResponse;
  listSavedContent: ListContentInteractionsPayload;
  listSchoolInfos: ListSchoolInfosResponse;
  /**
   * Members of one school. Pending memberships are excluded unless asked for:
   * a pending membership is an invitation, not a fact.
   */
  listSchoolUsers: ListSchoolUsersPayload;
  /** Schools of this tenant. */
  listSchools: ListSchoolsPayload;
  /**
   * The schools one user belongs to. Asking about somebody else requires the
   * caller to be allowed to see them.
   */
  listSchoolsForUser: ListSchoolsPayload;
  listSleepProfiles: ListSleepProfilesResponse;
  /** Readable by anyone: a student can see what each action is worth. */
  listSparkRules: Array<SparkRule>;
  listSparkTransactions: ListSparkTransactionsPayload;
  /** This tenant's SSO connections. Client secrets are never included. */
  listSsoConnections: Array<SsoConnection>;
  listTaps: ListTapsPayload;
  /**
   * List the platform's tenants. Restricted to live members of
   * `main.platform_admin`: the gateway CANNOT express that condition in `@auth`
   * (the directive only knows roles), so `auth.AuthService.ListTenants` validates
   * it — exactly like `assumeTenant`. A caller without a live allowlist row gets
   * PERMISSION_DENIED regardless of their role.
   *
   * `search` runs through MongoDB Atlas Search. On a non-Atlas deployment (local,
   * CI) it does NOT return an empty list — the whole query FAILS with gRPC
   * Unimplemented naming the index script. The other filters work everywhere.
   *
   * Example:
   *   query {
   *     listTenants(filter: { status: FAILED }, pageSize: 25) {
   *       tenants { id name status owner { email } }
   *       nextPageToken
   *     }
   *   }
   */
  listTenants: ListTenantsResponse;
  listTransactions: ListTransactionsResponse;
  listTrustRelationships: ListTrustRelationshipsResponse;
  listTrustedPeople: ListTrustedPeopleResponse;
  listUnits: ListUnitsPayload;
  listUserMilestones: Array<UserMilestone>;
  /**
   * Returns the seeded UserType catalog for the caller's tenant
   * (admin | school-admin | counselor | teacher | parent | support | tutor | student).
   */
  listUserTypes: Array<UserType>;
  /**
   * List tenant-internal users with optional filter and cursor pagination.
   * `pageSize` defaults backend-side (typically 50). `next_page_token` is
   * empty when there are no further pages; pass it back as `pageToken` on
   * the next call to continue.
   *
   * The response exposes every listed user's email, names, date of birth and
   * grade, so it is gated on role AND filtered by scope.
   *
   * An ADMIN (or API key) sees the whole tenant. A teacher sees the members of
   * the groups they own; a school-admin or counselor, the users of their
   * schools. Everybody else is refused by the role gate.
   *
   * **Pages can come back short.** The scope filter is applied to the page the
   * backend returned, so a page of 50 may yield fewer rows — and an empty page
   * does NOT mean the listing is over. Page until `next_page_token` is empty.
   */
  listUsers: ListUsersResponse;
  /** What the caller has viewed, newest first. */
  listViewedContent: ListContentInteractionsPayload;
  listWebhooks: ListWebhooksResponse;
  listWinGratitudes: ListWinGratitudesResponse;
  /** Get explainability factors for a specific metric */
  metricFactors: MetricFactorsResponse;
  /**
   * How often a user logged each mood in a window.
   *
   * Aggregated server-side: counting in the client would mean paging the whole
   * history, and `listMoodHistory` pages by `_id` (a UUIDv4, so not in
   * chronological order), which makes a partial count simply wrong.
   *
   * `total_checkins` counts ENTRIES, not the sum of `counts` — one entry can
   * carry several moods, and each of those counts once per mood.
   *
   * `from`/`to` are RFC 3339. Absent ⇒ the last 30 days. The range may span at
   * most 366 days.
   */
  moodCounts: MoodCountsResponse;
  paymentAccount: PaymentAccount;
  /**
   * Follow-up modals awaiting delivery to the caller, oldest first.
   *
   * `user` follows the ownership policy: omit it and it resolves to the
   * authenticated caller. Only an ADMIN principal may name somebody else.
   */
  pendingFollowups: PendingFollowupsResponse;
  person?: Maybe<Person>;
  persons: ListPersonsResponse;
  /**
   * Returns the re-engagement policy for the authenticated tenant.
   * Falls back to the system default when no tenant policy is configured.
   */
  reengagementPolicy?: Maybe<ReengagementPolicy>;
  runInference: RunInferenceResponse;
  /**
   * Lessons whose title matches. At least 2 characters.
   *
   * **Pages can come back short**: the draft filter runs after the match, so a
   * page of 20 may yield fewer rows.
   */
  searchContent: SearchContentPayload;
  /**
   * Finds users by email PREFIX across every tenant. Restricted to live members
   * of `main.platform_admin` (guard in the auth service); a token obtained
   * through `assumeTenant` cannot call it.
   *
   * **Users with no login method are not indexed.** The sources are
   * `main.login_index` — everyone who has a password or a federated identity —
   * and `main.user`, which holds tenant owners. Somebody created by an admin and
   * never invited appears in neither, because the index is written when a
   * credential is set. Enumerating those would mean opening every tenant
   * database on every keystroke.
   *
   * The query must be at least 3 characters and matches as a prefix, so it rides
   * the email indexes instead of scanning every login on the platform.
   */
  searchUsers: SearchUsersResponse;
  /** Get the latest Tier 1 behavioral snapshot for a person */
  snapshot: Tier1Snapshot;
  snapshots: ListSnapshotsResponse;
  sparkBalance: SparkBalance;
  /**
   * Provisioning status of the caller's tenant. Forwarded to
   * `auth.TenantService.GetTenantStatus` with the JWT's `tenant` + `user_id`;
   * auth only answers the tenant owner (others get PERMISSION_DENIED).
   *
   * Poll this after `signup` until `status` is `ACTIVE` (or `DEGRADED`).
   *
   * Example:
   *   query {
   *     tenantStatus { status attempt phases { name status } last_error }
   *   }
   */
  tenantStatus: TenantStatusPayload;
};


/** Root Query type for read operations. */
export type QueryCheckConsentArgs = {
  data_category: Scalars['String']['input'];
  user: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryCohortMetricsArgs = {
  metricNames: Array<Scalars['String']['input']>;
  scopeId?: InputMaybe<Scalars['String']['input']>;
  scopeType: CohortScopeType;
  window?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryConnectorArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryConnectorsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryConsentsArgs = {
  data_category?: InputMaybe<Scalars['String']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryDailyCardsArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryEscalationPoliciesArgs = {
  tenantId?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryEscalationPolicyArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryEventArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryEventTimelineArgs = {
  event_type?: InputMaybe<Scalars['String']['input']>;
  from_timestamp?: InputMaybe<Scalars['String']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  to_timestamp?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryGetAlertContactArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetAnalysisArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetAnalysisFromLlmsArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryGetBalanceArgs = {
  user_id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetCommonQuestionArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetConsentArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetCopingToolArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetCourseArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetCourseCollectionArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetEmailNotificationArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetEnrollmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetFeedbackArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetGroupArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetJournalArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetLmsAssignmentArgs = {
  assignment_external_id: Scalars['String']['input'];
  course_external_id: Scalars['String']['input'];
  lms_type: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryGetLmsConnectionStatusArgs = {
  lms_type: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryGetLmsCourseArgs = {
  external_id: Scalars['String']['input'];
  lms_type: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryGetLmsCourseStudentsArgs = {
  course_external_id: Scalars['String']['input'];
  lms_type: Scalars['String']['input'];
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryGetLmsStudentGradesArgs = {
  course_external_id: Scalars['String']['input'];
  lms_type: Scalars['String']['input'];
  student_external_id: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryGetLessonArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetMiniSurveyArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetMoodArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetMoodHistoryArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetPersonalGoalArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetQuestionArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetRiskAlertArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetRiskHistoryArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetRuleArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetSchoolArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetSchoolInfoArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetSleepProfileArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetSourceStatsArgs = {
  connector_id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetTransactionArgs = {
  transaction_id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetTrustRelationshipArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetTrustedPersonArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetUnitArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetUserArgs = {
  id: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryGetWebhookArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryGetWinGratitudeArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryInterventionArgs = {
  studentId: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryLatestSnapshotArgs = {
  user: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QueryListAnalysesArgs = {
  created_from?: InputMaybe<Scalars['String']['input']>;
  created_to?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  score?: InputMaybe<Scalars['Int']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListAvatarsArgs = {
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListCollectiblesArgs = {
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  section?: InputMaybe<CollectibleSection>;
};


/** Root Query type for read operations. */
export type QueryListCommonQuestionsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListCopingToolUsagesArgs = {
  coping_tool_id?: InputMaybe<Scalars['ID']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListCopingToolsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListCourseCollectionsArgs = {
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListCoursesArgs = {
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ContentStatus>;
};


/** Root Query type for read operations. */
export type QueryListEmailNotificationsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  status_filter?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListEnrollmentsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryListFeedbacksArgs = {
  analyze: Scalars['String']['input'];
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListGroupMembersArgs = {
  group: Scalars['ID']['input'];
  includePending?: InputMaybe<Scalars['Boolean']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListGroupsArgs = {
  owner?: InputMaybe<Scalars['ID']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  school?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<OrgStatus>;
};


/** Root Query type for read operations. */
export type QueryListGroupsForUserArgs = {
  includePending?: InputMaybe<Scalars['Boolean']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListJournalsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListLmsAssignmentsArgs = {
  course_external_id: Scalars['String']['input'];
  lms_type: Scalars['String']['input'];
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListLmsCoursesArgs = {
  lms_type: Scalars['String']['input'];
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListLmsEnrollmentsArgs = {
  course_external_id: Scalars['String']['input'];
  lms_type: Scalars['String']['input'];
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListLmsSubmissionsArgs = {
  assignment_external_id: Scalars['String']['input'];
  course_external_id: Scalars['String']['input'];
  lms_type: Scalars['String']['input'];
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListLessonsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListMiniSurveysArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListMoodHistoryArgs = {
  mood?: InputMaybe<Scalars['String']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListMoodsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListOwnedCollectiblesArgs = {
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListPersonalGoalsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListQuestionsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListRecommendedContentArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListRiskAlertsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListRiskHistoriesArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListRulesArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListSavedContentArgs = {
  contentKind?: InputMaybe<ContentKind>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListSchoolInfosArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListSchoolUsersArgs = {
  includePending?: InputMaybe<Scalars['Boolean']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  school: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryListSchoolsArgs = {
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<OrgStatus>;
};


/** Root Query type for read operations. */
export type QueryListSchoolsForUserArgs = {
  includePending?: InputMaybe<Scalars['Boolean']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListSleepProfilesArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListSparkTransactionsArgs = {
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListTapsArgs = {
  lesson: Scalars['ID']['input'];
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListTenantsArgs = {
  filter?: InputMaybe<ListTenantsFilterInput>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListTransactionsArgs = {
  end_time?: InputMaybe<Scalars['String']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  start_time?: InputMaybe<Scalars['String']['input']>;
  user_id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryListTrustRelationshipsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryListTrustedPeopleArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListUnitsArgs = {
  course?: InputMaybe<Scalars['ID']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListUserMilestonesArgs = {
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListUsersArgs = {
  filter?: InputMaybe<ListUsersFilterInput>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListViewedContentArgs = {
  contentKind?: InputMaybe<ContentKind>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryListWebhooksArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryListWinGratitudesArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryMetricFactorsArgs = {
  metricName: Scalars['String']['input'];
  user: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryMoodCountsArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryPendingFollowupsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  user?: InputMaybe<Scalars['ID']['input']>;
};


/** Root Query type for read operations. */
export type QueryPersonArgs = {
  id: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QueryPersonsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
};


/** Root Query type for read operations. */
export type QueryRunInferenceArgs = {
  input: RunInferenceInput;
};


/** Root Query type for read operations. */
export type QuerySearchContentArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QuerySearchUsersArgs = {
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QuerySnapshotArgs = {
  user: Scalars['ID']['input'];
};


/** Root Query type for read operations. */
export type QuerySnapshotsArgs = {
  page_size?: InputMaybe<Scalars['Int']['input']>;
  page_token?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['String']['input'];
};


/** Root Query type for read operations. */
export type QuerySparkBalanceArgs = {
  user?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * The question catalogue: the prompts a tenant asks its students, and the
 * predefined answers for the ones that are not free text.
 *
 * Source of truth in activity-ingestor. knowledge-graph mirrors it as
 * `:CommonQuestion` nodes — read those through `listCommonQuestions`, but write
 * HERE: the mirror is a projection and its write RPCs refuse.
 */
export type Question = {
  /** Groups questions by surface: `journal`, `sleep`, `mood_reason`, … */
  category: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  /** Only meaningful for MULTISELECT; 0 otherwise. */
  max_selections: Scalars['Int']['output'];
  /** Always empty for an OPEN question. */
  options: Array<QuestionOption>;
  order: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  type: QuestionType;
  updated_at: Scalars['String']['output'];
};

export type QuestionOption = {
  created_at: Scalars['String']['output'];
  emoji?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  question: Scalars['ID']['output'];
  updated_at: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export const QuestionType = {
  /** Between one and `max_selections` options. */
  Multiselect: 'MULTISELECT',
  /** Free text. Cannot have options. */
  Open: 'OPEN',
  /** Exactly one option. */
  SelectOne: 'SELECT_ONE'
} as const;

export type QuestionType = typeof QuestionType[keyof typeof QuestionType];
export type RecomputeResult = {
  message: Scalars['String']['output'];
  recomputedAt: Scalars['String']['output'];
  snapshot?: Maybe<Tier1Snapshot>;
  success: Scalars['Boolean']['output'];
};

export type RecordCopingToolUsageInput = {
  after_mood?: InputMaybe<Scalars['Float']['input']>;
  before_mood?: InputMaybe<Scalars['Float']['input']>;
  coping_tool_id: Scalars['ID']['input'];
  risk_context?: InputMaybe<Scalars['String']['input']>;
  /** RFC3339; omitido ⇒ ahora. */
  timestamp?: InputMaybe<Scalars['String']['input']>;
  /** Omitido ⇒ el llamante. Otro usuario sólo si es ADMIN o está en su scope. */
  user?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * Input for recording the outcome of a completed intervention session.
 * SAD ref: §7.10 Outcome & Effectiveness.
 */
export type RecordOutcomeInput = {
  engagementRecovery: Scalars['Float']['input'];
  humanRating?: InputMaybe<Scalars['Float']['input']>;
  moodDelta: Scalars['Float']['input'];
  sessionId: Scalars['ID']['input'];
  studentId: Scalars['ID']['input'];
  toolId: Scalars['ID']['input'];
  toolReuseRate: Scalars['Float']['input'];
};

/** Result of the recordInterventionOutcome mutation. */
export type RecordOutcomeResult = {
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/**
 * Per-tenant re-engagement policy controlling when follow-up modals are shown
 * after an intervention session (SAD §7.11).
 */
export type ReengagementPolicy = {
  /**
   * Minimum number of minutes that must elapse between consecutive modals for
   * the same student (cooldown gate).
   */
  cooldownMinBetweenModals: Scalars['Int']['output'];
  /**
   * When true, follow-up modals are suppressed for students currently at risk
   * level 4–6 (IMMEDIATE_SAFETY); the crisis flow handles those cases instead.
   */
  criticalSuppressionFlag: Scalars['Boolean']['output'];
  /**
   * Maximum number of intervention modals a student may receive in any rolling
   * 24-hour window.
   */
  frequencyCap24h: Scalars['Int']['output'];
  /** Tenant identifier this policy belongs to. */
  tenant: Scalars['ID']['output'];
};

/** Input for creating or replacing a tenant re-engagement policy. */
export type ReengagementPolicyInput = {
  cooldownMinBetweenModals: Scalars['Int']['input'];
  criticalSuppressionFlag: Scalars['Boolean']['input'];
  frequencyCap24h: Scalars['Int']['input'];
};

export type RefreshLmsTokenInput = {
  lms_type: Scalars['String']['input'];
};

export type RefreshLmsTokenResponse = {
  expires_at: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type RegisterConnectorInput = {
  name: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type RegisterLmsConnectionInput = {
  auth_code: Scalars['String']['input'];
  client_id: Scalars['String']['input'];
  client_secret: Scalars['String']['input'];
  instance_url?: InputMaybe<Scalars['String']['input']>;
  lms_type: Scalars['String']['input'];
  user_email: Scalars['String']['input'];
  user_external_id: Scalars['String']['input'];
};

export type RegisterLmsConnectionResponse = {
  message: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type RemoveEnrollmentResponse = {
  id: Scalars['ID']['output'];
};

export type RemoveTrustRelationshipResponse = {
  id: Scalars['ID']['output'];
};

export type ResolvePersonInput = {
  date_of_birth?: InputMaybe<Scalars['String']['input']>;
  external_ids: Array<ExternalIdInput>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  grade?: InputMaybe<Scalars['String']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
};

export type RiskAlert = {
  acknowledged_at?: Maybe<Scalars['String']['output']>;
  acknowledged_by?: Maybe<Scalars['String']['output']>;
  categorical: Scalars['String']['output'];
  compound_score: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  pathway: Scalars['String']['output'];
  requires_ack: Scalars['Boolean']['output'];
  risk_level: Scalars['Int']['output'];
  sla_minutes: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  urgency: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

export type RiskHistory = {
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  flagged: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  recommendations: Array<Scalars['String']['output']>;
  resolved_at?: Maybe<Scalars['String']['output']>;
  risk_level: Scalars['Int']['output'];
  risk_type: Scalars['String']['output'];
  severity?: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

export type RiskSignal = {
  category: Scalars['String']['output'];
  level: Scalars['Int']['output'];
  trajectory: Scalars['String']['output'];
  urgencyScore: Scalars['Float']['output'];
};

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
export type Rule = {
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_default: Scalars['Boolean']['output'];
  rule: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type RunInferenceInput = {
  trigger_event_id?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['ID']['input'];
};

export type RunInferenceResponse = {
  inference_output_json: Scalars['String']['output'];
  pipeline_version: Scalars['String']['output'];
};

/**
 * Org structure: a tenant is made of schools, a school is made of groups.
 *
 * There is no organization tier — the tenant IS the org. See the header of
 * `org_structure.proto`, which these types mirror field for field.
 */
export type School = {
  created_at: Scalars['String']['output'];
  external_ids: Array<ExternalId>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Lifecycle status: ACTIVE or ARCHIVED. */
  status: OrgStatus;
  updated_at: Scalars['String']['output'];
};

export type SchoolInfo = {
  attendance?: Maybe<Scalars['Float']['output']>;
  created_at: Scalars['String']['output'];
  grade: Scalars['String']['output'];
  grades: Array<SubjectGrade>;
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  performance?: Maybe<Scalars['String']['output']>;
  school_name: Scalars['String']['output'];
  semester?: Maybe<Scalars['String']['output']>;
  subjects: Array<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
  year?: Maybe<Scalars['Int']['output']>;
};

/** Membership of a tenant-internal user in a school. */
export type SchoolUser = {
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** True while the membership is invited but not yet accepted. */
  pending: Scalars['Boolean']['output'];
  school: Scalars['ID']['output'];
  updated_at: Scalars['String']['output'];
  /** FK to the tenant-internal user. */
  user: Scalars['ID']['output'];
};

export type SearchContentPayload = {
  next_page_token: Scalars['String']['output'];
  results: Array<ContentSearchResult>;
};

export type SearchUsersResponse = {
  /** Opaque. Absent or empty when there is no further page. */
  next_page_token: Scalars['String']['output'];
  results: Array<UserSearchResult>;
};

export type SendEmailInput = {
  dynamic_data?: InputMaybe<Array<KeyValuePair>>;
  from_name?: InputMaybe<Scalars['String']['input']>;
  recipients?: InputMaybe<Array<Scalars['String']['input']>>;
  template_name: Scalars['String']['input'];
};

export type SendEmailResponse = {
  notification_id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
};

export type SendMessageInput = {
  message: Scalars['String']['input'];
  metadata?: InputMaybe<Array<MetadataEntry>>;
  session_id: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

export type SendMessageResponse = {
  session_id: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Session = {
  session_id: Scalars['String']['output'];
};

export type SleepProfile = {
  bed_time: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  disruptions?: Maybe<Scalars['Int']['output']>;
  environment?: Maybe<Scalars['String']['output']>;
  hours_slept: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  quality: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
  wake_time: Scalars['String']['output'];
};

export type Snapshot = {
  attendance_rate?: Maybe<Scalars['Float']['output']>;
  created_at: Scalars['String']['output'];
  engagement_trend?: Maybe<Scalars['Float']['output']>;
  full_recomputed_at?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  mood_baseline?: Maybe<Scalars['Float']['output']>;
  mood_volatility?: Maybe<Scalars['Float']['output']>;
  risk_recomputed_at?: Maybe<Scalars['String']['output']>;
  routine_consistency?: Maybe<Scalars['Float']['output']>;
  sleep_trend?: Maybe<Scalars['Float']['output']>;
  support_index?: Maybe<Scalars['Float']['output']>;
  tenant_id: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

export type SourceStats = {
  accepted_rate: Scalars['Float']['output'];
  connector_id: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  event_types: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  last_event_at?: Maybe<Scalars['String']['output']>;
  source_key: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  total_events: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
};

/**
 * Sparks: what a student earns by showing up, and what they spend it on.
 *
 * There is NO mutation that credits or debits. Earning is a consequence of doing
 * something — a check-in, a journal entry, a finished lesson — and spending goes
 * through the thing being bought.
 */
export type SparkBalance = {
  balance: Scalars['Int']['output'];
  total_earned: Scalars['Int']['output'];
  total_spent: Scalars['Int']['output'];
};

export const SparkKind = {
  Earn: 'EARN',
  Spend: 'SPEND'
} as const;

export type SparkKind = typeof SparkKind[keyof typeof SparkKind];
/** How much one kind of event pays, and how often. */
export type SparkRule = {
  /** May be 0: a rule that pays nothing still marks the event as tracked. */
  amount: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  /** How many times a day the event may pay. 0 = unlimited. */
  daily_cap: Scalars['Int']['output'];
  event: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  updated_at: Scalars['String']['output'];
};

export type SparkTransaction = {
  amount: Scalars['Int']['output'];
  balance_after: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: SparkKind;
  /** What the movement was for: `mood_checkin`, `write`, `collectible_purchase`… */
  source: Scalars['String']['output'];
  /** The thing it was for: the journal written, the collectible bought. */
  source_id: Scalars['ID']['output'];
  user: Scalars['ID']['output'];
};

export type SsoConnection = {
  /** SAML ACS URL override (see `SsoConnectionInput.acsUrl`); empty when none. */
  acsUrl: Scalars['String']['output'];
  /** Whether unsolicited (IdP-initiated) SAML responses are accepted. */
  allowIdpInitiated: Scalars['Boolean']['output'];
  clientId: Scalars['String']['output'];
  /**
   * Whether a client secret is stored. The secret itself is never returned: it
   * can impersonate the whole tenant at the IdP, and `role: [ADMIN]` is a lower
   * bar than the IdP console it came from.
   */
  clientSecretSet: Scalars['Boolean']['output'];
  defaultUserTypeId?: Maybe<Scalars['ID']['output']>;
  emailDomains: Array<Scalars['String']['output']>;
  /** SAML IdP signing certificate, PEM. Public. */
  idpCertificate: Scalars['String']['output'];
  /** SAML IdP entity id when configured by certificate; empty otherwise. */
  idpEntityId: Scalars['String']['output'];
  /** SAML IdP single sign-on URL when configured by certificate. */
  idpSsoUrl: Scalars['String']['output'];
  issuer: Scalars['String']['output'];
  jitProvisioning: Scalars['Boolean']['output'];
  provider: SsoProvider;
  samlMetadataUrl: Scalars['String']['output'];
  /** `externalIds.source` a `SchoolCode` is looked up under; empty = no check. */
  schoolSource: Scalars['String']['output'];
  /** SAML SP entity id override; empty when the deployment default applies. */
  spEntityId: Scalars['String']['output'];
  status: SsoConnectionStatus;
  /**
   * `Title → user_type` map, sorted by title. Matching is case-insensitive and
   * an unknown `Title` denies the login. Empty = no check.
   */
  titleUserTypes: Array<TitleUserType>;
};

export type SsoConnectionInput = {
  /**
   * SAML only. ACS URL this connection is reached at instead of the deployment's
   * `SSO_SAML_ACS_URL` (e.g. `https://…/webapi/saml/alaia/acs`). It must be https
   * and unique across tenants, and authentication only accepts it when
   * `SSO_SAML_ACS_TENANTS` maps it to this tenant — otherwise the upsert fails
   * with an invalid-argument error. It is also the key IdP-initiated logins are
   * routed by.
   */
  acsUrl?: InputMaybe<Scalars['String']['input']>;
  /**
   * SAML only. Accept unsolicited (IdP-initiated) responses. Requires `acsUrl`:
   * the connection is found by the response's Destination. Replayed assertions
   * are refused.
   */
  allowIdpInitiated?: InputMaybe<Scalars['Boolean']['input']>;
  clientId?: InputMaybe<Scalars['String']['input']>;
  /** Write-only. Never returned. Empty means "keep the stored secret". */
  clientSecret?: InputMaybe<Scalars['String']['input']>;
  /**
   * The `user_type` a just-in-time provisioned user is born with. Required when
   * `jitProvisioning` is on: without it those users have no role, which resolves
   * to STUDENT downstream — a privilege decision nobody made.
   */
  defaultUserTypeId?: InputMaybe<Scalars['ID']['input']>;
  /**
   * Email domains that resolve to this connection, e.g. "colegio.edu". A domain
   * may belong to exactly one tenant; claiming one that is taken is an error.
   */
  emailDomains?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * SAML only. The IdP's signing certificate, PEM. Public, so it is returned by
   * `listSsoConnections`. An expired certificate makes every login fail.
   */
  idpCertificate?: InputMaybe<Scalars['String']['input']>;
  /**
   * SAML only. IdP configured by certificate instead of `samlMetadataUrl`: set
   * `idpEntityId`, `idpSsoUrl` and `idpCertificate` together, never alongside a
   * metadata URL.
   */
  idpEntityId?: InputMaybe<Scalars['String']['input']>;
  /** SAML only. The IdP's HTTP-Redirect single sign-on URL. See `idpEntityId`. */
  idpSsoUrl?: InputMaybe<Scalars['String']['input']>;
  /** OIDC issuer override. Empty for SAML. */
  issuer?: InputMaybe<Scalars['String']['input']>;
  /** When false, a federated subject with no user in this tenant is refused. */
  jitProvisioning?: InputMaybe<Scalars['Boolean']['input']>;
  provider: SsoProvider;
  /** SAML IdP metadata URL. Empty for OIDC. */
  samlMetadataUrl?: InputMaybe<Scalars['String']['input']>;
  /**
   * SAML only. When set, the assertion's `SchoolCode` must match a school of this
   * tenant with `externalIds: [{source: <schoolSource>, id: <SchoolCode>}]`; no
   * match denies the login. The user is added to that school if missing.
   */
  schoolSource?: InputMaybe<Scalars['String']['input']>;
  /**
   * SAML only. SP entity id this connection asserts instead of the deployment's
   * `<SSO_SAML_SP_ENTITY_ID>/<tenant>`. Goes together with `acsUrl`: both or
   * neither.
   */
  spEntityId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<SsoConnectionStatus>;
  /**
   * SAML only. Maps the assertion's `Title` to a `user_type` (case-insensitive).
   * When non-empty, a `Title` that is not in the list denies the login, and a
   * just-in-time user is born with the mapped type instead of
   * `defaultUserTypeId`. An existing user's role is never changed. Titles that
   * collide ignoring case are rejected.
   */
  titleUserTypes?: InputMaybe<Array<TitleUserTypeInput>>;
};

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
export type StartSsoPayload = {
  /** Send the browser here. */
  authorization_url: Scalars['String']['output'];
  /**
   * Opaque, signed, single-handshake. Five-minute lifetime. Return it in
   * `completeSso`; for SAML the IdP carries it as RelayState instead.
   */
  state: Scalars['String']['output'];
};

export type SubjectGrade = {
  grade?: Maybe<Scalars['String']['output']>;
  score: Scalars['Float']['output'];
  subject: Scalars['String']['output'];
};

export type SubjectGradeInput = {
  grade?: InputMaybe<Scalars['String']['input']>;
  score: Scalars['Float']['input'];
  subject: Scalars['String']['input'];
};

/** Root Subscription type for real-time updates via WebSocket. */
export type Subscription = {
  /** Placeholder field - subscriptions are extended in domain-specific schema files */
  _empty?: Maybe<Scalars['Boolean']['output']>;
  chatMessages: ChatChunk;
};


/** Root Subscription type for real-time updates via WebSocket. */
export type SubscriptionChatMessagesArgs = {
  session_id: Scalars['String']['input'];
};

/** A single rendered support layer card (SAD §7.3). */
export type SupportBlock = {
  content: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  type: SupportBlockType;
};

/** Support block rendering type (SAD §7.3 Support Layer). */
export const SupportBlockType = {
  Normalization: 'NORMALIZATION',
  Psychoeducation: 'PSYCHOEDUCATION',
  Validation: 'VALIDATION'
} as const;

export type SupportBlockType = typeof SupportBlockType[keyof typeof SupportBlockType];
export type SurveyResponseEntry = {
  answer: Scalars['String']['output'];
  option_ids: Array<Scalars['ID']['output']>;
  question: Scalars['String']['output'];
  /** The catalogue question this answer belongs to, when it came from one. */
  question_id?: Maybe<Scalars['ID']['output']>;
  score?: Maybe<Scalars['Int']['output']>;
};

export type SurveyResponseInput = {
  answer: Scalars['String']['input'];
  /**
   * The chosen options. Each must belong to THIS question, and the count must fit
   * the question's type: exactly one for SELECT_ONE, one to `max_selections` for
   * MULTISELECT, none for OPEN.
   */
  option_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /**
   * The prompt in free text. Kept for answers that do not come from the
   * catalogue, and what a reader renders when `question_id` is absent.
   */
  question: Scalars['String']['input'];
  /** Links this answer to the catalogue. Absent ⇒ free text, validated as before. */
  question_id?: InputMaybe<Scalars['ID']['input']>;
  score?: InputMaybe<Scalars['Int']['input']>;
};

export type Tap = {
  body?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: TapKind;
  lesson: Scalars['ID']['output'];
  media_url?: Maybe<Scalars['String']['output']>;
  order: Scalars['Int']['output'];
  /** Set only on a QUESTION tap. Must point at a live catalogue question. */
  question?: Maybe<Scalars['ID']['output']>;
  updated_at: Scalars['String']['output'];
};

export const TapKind = {
  Question: 'QUESTION',
  Text: 'TEXT',
  Video: 'VIDEO'
} as const;

export type TapKind = typeof TapKind[keyof typeof TapKind];
/**
 * Owner of a tenant (`main.tenant.user` joined against `main.user`).
 * Absent when the owner row was deleted.
 */
export type TenantOwner = {
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/**
 * Provisioning detail of a tenant — same shape as `TenantStatusPayload`, but
 * for an arbitrary tenant rather than the caller's own.
 */
export type TenantProvisioning = {
  /** Number of provisioning attempts (signup = 1, each `retryProvisioning` +1) */
  attempt: Scalars['Int']['output'];
  /** RFC 3339 timestamp of the current/last attempt end */
  finishedAt?: Maybe<Scalars['String']['output']>;
  /** Last provisioning error (transport error or failing required phase) */
  lastError?: Maybe<Scalars['String']['output']>;
  phases: Array<PhaseResult>;
  /** RFC 3339 timestamp of the current/last attempt start */
  startedAt?: Maybe<Scalars['String']['output']>;
};

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
 * Provisioning status of the caller's tenant, as tracked by auth in
 * `main.tenant.status` / `main.tenant.provisioning`.
 */
export type TenantStatusPayload = {
  /** Number of provisioning attempts (signup = 1, each `retryProvisioning` +1) */
  attempt: Scalars['Int']['output'];
  /** RFC 3339 timestamp of the current/last attempt end */
  finished_at?: Maybe<Scalars['String']['output']>;
  /** Last provisioning error (transport error or failing required phase) */
  last_error?: Maybe<Scalars['String']['output']>;
  phases: Array<PhaseResult>;
  /** RFC 3339 timestamp of the current/last attempt start */
  started_at?: Maybe<Scalars['String']['output']>;
  status: TenantStatus;
  tenant: Scalars['String']['output'];
};

/**
 * One tenant as returned by `listTenants`. The `canvas` subdocument is
 * deliberately not exposed.
 */
export type TenantSummary = {
  /** RFC 3339 */
  createdAt: Scalars['String']['output'];
  /** RFC 3339. Non-null only for soft-deleted tenants (`includeDeleted: true`). */
  deletedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Null when the owner user row no longer exists. */
  owner?: Maybe<TenantOwner>;
  provisioning?: Maybe<TenantProvisioning>;
  /** A tenant with no persisted `status` is reported as `ACTIVE`. */
  status: TenantStatus;
  /** RFC 3339 */
  updatedAt: Scalars['String']['output'];
};

export type Test = {
  test_id: Scalars['String']['output'];
};

export type TestModelsInput = {
  models: Array<Scalars['String']['input']>;
};

export type TestModelsResponse = {
  report: Scalars['String']['output'];
};

export type Tier1Snapshot = {
  compositeTrustScore: Scalars['Float']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  engagementDelta?: Maybe<MetricValue>;
  fullRecomputedAt?: Maybe<Scalars['String']['output']>;
  moodBaseline?: Maybe<MetricValue>;
  riskRecomputedAt?: Maybe<Scalars['String']['output']>;
  routineConsistency?: Maybe<MetricValue>;
  sleepTrend?: Maybe<MetricValue>;
  status: Scalars['String']['output'];
  supportIndex?: Maybe<MetricValue>;
  tenantId: Scalars['ID']['output'];
  user: Scalars['ID']['output'];
};

export type Tip = {
  description: Scalars['String']['output'];
  link: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type TipInput = {
  description: Scalars['String']['input'];
  link: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type TitleUserType = {
  title: Scalars['String']['output'];
  userTypeId: Scalars['ID']['output'];
};

/** One `Title → user_type` entry. GraphQL has no maps. */
export type TitleUserTypeInput = {
  title: Scalars['String']['input'];
  userTypeId: Scalars['ID']['input'];
};

export type TransactionDetails = {
  amount: Scalars['Int64']['output'];
  created_at: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  transaction_id: Scalars['ID']['output'];
  type: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/**
 * Result of a transitionInterventionState mutation.
 * success=false means the FSM guard rejected the transition; error describes why.
 */
export type TransitionResult = {
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type TrustDimension = {
  name: Scalars['String']['output'];
  score: Scalars['Float']['output'];
  weight: Scalars['Float']['output'];
};

export type TrustRelationship = {
  available?: Maybe<Scalars['Boolean']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  status: Scalars['String']['output'];
  tenant_id: Scalars['String']['output'];
  trusted_user: Scalars['ID']['output'];
  user: Scalars['ID']['output'];
};

export type TrustScore = {
  composite_score: Scalars['Float']['output'];
  consent_gate: Scalars['Boolean']['output'];
  dimensions: Array<TrustDimension>;
  status: Scalars['String']['output'];
};

export type TrustedPerson = {
  available?: Maybe<Scalars['Boolean']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  contact?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  relationship: Scalars['String']['output'];
  role?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};

export type Unit = {
  course: Scalars['ID']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  order: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type UpdateAlertContactInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  /** Optional: repoint the contact at a different <tenantID>.user._id. */
  user?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateAnalysisInput = {
  context?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  model?: InputMaybe<Scalars['String']['input']>;
  response?: InputMaybe<Scalars['String']['input']>;
  score?: InputMaybe<Scalars['String']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  update_mask?: InputMaybe<Array<Scalars['String']['input']>>;
  updated_at?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAvatarInput = {
  background?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  image_url?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBalanceInput = {
  amount: Scalars['Int64']['input'];
  metadata?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBalanceResponse = {
  status: Scalars['String']['output'];
  transaction_id: Scalars['ID']['output'];
};

export type UpdateBillingSettingInput = {
  auto_charge_amount: Scalars['Boolean']['input'];
  not_paid_limit: Scalars['Boolean']['input'];
  paid_limit: Scalars['Int64']['input'];
};

export type UpdateCollectibleInput = {
  cost?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  image_url?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  section?: InputMaybe<CollectibleSection>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCommonQuestionInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateConnectorInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  reliability_score?: InputMaybe<Scalars['Float']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCopingToolInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCourseCollectionInput = {
  course_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCourseInput = {
  cover_url?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<ContentStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEscalationPolicyInput = {
  ackTimeoutMinutes?: InputMaybe<Scalars['Int']['input']>;
  active?: InputMaybe<Scalars['Boolean']['input']>;
  contacts?: InputMaybe<Array<PolicyContactInput>>;
  fallbackPolicyId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  targetRoles: Array<Role>;
  /** @deprecated tenant is derived from the authenticated context */
  tenantId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateFeedbackInput = {
  analyze?: InputMaybe<Scalars['String']['input']>;
  feedback?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  model?: InputMaybe<Scalars['String']['input']>;
  response?: InputMaybe<Scalars['String']['input']>;
  score?: InputMaybe<Scalars['String']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  update_mask?: InputMaybe<Array<Scalars['String']['input']>>;
  user?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGroupInput = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  owner?: InputMaybe<Scalars['ID']['input']>;
  school?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<OrgStatus>;
};

/**
 * A PARTIAL update: only the fields present are written.
 *
 * `title` and `content` are deliberately nullable. They used to be non-null, so a
 * client that wanted to change only the title had to resend the whole body — and
 * if it did not, the service wrote an empty string over the entry. Omitting a
 * field now means "leave it alone"; sending an explicit empty string still clears
 * it.
 *
 * Note the list fields keep the weaker rule the gRPC contract documents: a
 * non-empty list replaces, an empty or absent list leaves the stored one alone,
 * so a partial update cannot clear tags/keywords/entities.
 */
export type UpdateJournalInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  entities?: InputMaybe<Array<Scalars['String']['input']>>;
  id: Scalars['ID']['input'];
  keywords?: InputMaybe<Array<Scalars['String']['input']>>;
  mood?: InputMaybe<Scalars['String']['input']>;
  sentiment?: InputMaybe<Scalars['Float']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLessonInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  cover_url?: InputMaybe<Scalars['String']['input']>;
  duration_seconds?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  sparks?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  video_url?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMilestoneInput = {
  id: Scalars['ID']['input'];
  kind?: InputMaybe<MilestoneKind>;
  order?: InputMaybe<Scalars['Int']['input']>;
  reward_sparks?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMiniSurveyInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  completed_at?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
  responses?: InputMaybe<Array<SurveyResponseInput>>;
  score?: InputMaybe<Scalars['Int']['input']>;
  survey_type: Scalars['String']['input'];
};

export type UpdateMoodCategoryInput = {
  id: Scalars['ID']['input'];
  identifier?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMoodHistoryInput = {
  id: Scalars['ID']['input'];
  moods?: InputMaybe<Array<MoodEntryInput>>;
  note?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMoodInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
  cover?: InputMaybe<AssetInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  identifier?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  text_color?: InputMaybe<Scalars['String']['input']>;
  tips?: InputMaybe<Array<TipInput>>;
  video?: InputMaybe<AssetInput>;
};

export type UpdatePersonInput = {
  date_of_birth?: InputMaybe<Scalars['String']['input']>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  grade?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  last_name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePersonalGoalInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  milestones?: InputMaybe<Array<MilestoneInput>>;
  next_check_in?: InputMaybe<Scalars['String']['input']>;
  progress?: InputMaybe<Scalars['Int']['input']>;
  status: Scalars['String']['input'];
  streak?: InputMaybe<Scalars['Int']['input']>;
  target?: InputMaybe<Scalars['String']['input']>;
  target_date?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type UpdateQuestionInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  max_selections?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<QuestionType>;
};

export type UpdateQuestionOptionInput = {
  emoji?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRiskHistoryInput = {
  description: Scalars['String']['input'];
  flagged: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
  recommendations?: InputMaybe<Array<Scalars['String']['input']>>;
  resolved_at?: InputMaybe<Scalars['String']['input']>;
  risk_level: Scalars['Int']['input'];
  risk_type: Scalars['String']['input'];
  severity?: InputMaybe<Scalars['String']['input']>;
  source: Scalars['String']['input'];
};

export type UpdateRuleInput = {
  id: Scalars['ID']['input'];
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  rule?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSchoolInfoInput = {
  attendance?: InputMaybe<Scalars['Float']['input']>;
  grade: Scalars['String']['input'];
  grades?: InputMaybe<Array<SubjectGradeInput>>;
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  performance?: InputMaybe<Scalars['String']['input']>;
  school_name: Scalars['String']['input'];
  semester?: InputMaybe<Scalars['String']['input']>;
  subjects?: InputMaybe<Array<Scalars['String']['input']>>;
  year?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateSchoolInput = {
  external_ids?: InputMaybe<Array<ExternalIdInput>>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<OrgStatus>;
};

export type UpdateSleepProfileInput = {
  bed_time: Scalars['String']['input'];
  disruptions?: InputMaybe<Scalars['Int']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  hours_slept: Scalars['Float']['input'];
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  quality: Scalars['Int']['input'];
  wake_time: Scalars['String']['input'];
};

export type UpdateSparkRuleInput = {
  amount?: InputMaybe<Scalars['Int']['input']>;
  daily_cap?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};

export type UpdateTapInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  kind?: InputMaybe<TapKind>;
  media_url?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  question?: InputMaybe<Scalars['ID']['input']>;
};

/** Input for `updateTenantUser`. Only the fields present are changed. */
export type UpdateTenantUserInput = {
  date_of_birth?: InputMaybe<Scalars['String']['input']>;
  display_name?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  external_ids?: InputMaybe<Array<ExternalIdInput>>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  grade?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  last_name?: InputMaybe<Scalars['String']['input']>;
  user_type_id?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTrustedPersonInput = {
  available?: InputMaybe<Scalars['Boolean']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  contact?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  relationship: Scalars['String']['input'];
  role?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUnitInput = {
  id: Scalars['ID']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWebhookInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  events?: InputMaybe<Array<Scalars['String']['input']>>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWinGratitudeInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  emotion?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  related_goal?: InputMaybe<Scalars['String']['input']>;
  shared_with?: InputMaybe<Array<Scalars['String']['input']>>;
  title: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type UploadAssetInput = {
  /**
   * Registry collection of the scope (main.asset_target). Required without `id`
   * (key <scope>/<collection>/general/<uuid>-<name>; missing ⇒ COLLECTION_REQUIRED);
   * with `id` it narrows the lookup to that collection. Unknown ⇒ INVALID_COLLECTION.
   */
  collection?: InputMaybe<Scalars['String']['input']>;
  /** Allowlist: image/png|jpeg|webp|gif, video/mp4. */
  contentType: Scalars['String']['input'];
  /** Required when the target collection registers more than one field. */
  field?: InputMaybe<Scalars['String']['input']>;
  /** Target document (optional). Only [A-Za-z0-9_-]: it becomes a key path segment. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Original file name. */
  name: Scalars['String']['input'];
  /** A tenant id or "main"; omitted = the caller's tenant. */
  scope?: InputMaybe<Scalars['String']['input']>;
};

export type UploadHeader = {
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type UpsertSnapshotInput = {
  attendance_rate?: InputMaybe<Scalars['Float']['input']>;
  engagement_trend?: InputMaybe<Scalars['Float']['input']>;
  mood_baseline?: InputMaybe<Scalars['Float']['input']>;
  mood_volatility?: InputMaybe<Scalars['Float']['input']>;
  recomputation_type?: InputMaybe<Scalars['String']['input']>;
  routine_consistency?: InputMaybe<Scalars['Float']['input']>;
  sleep_trend?: InputMaybe<Scalars['Float']['input']>;
  support_index?: InputMaybe<Scalars['Float']['input']>;
  user: Scalars['ID']['input'];
};

/**
 * Tenant-internal user identity. Owned by the activity-ingestor service and
 * stored in the per-tenant `<tenantID>.user` collection. Demographics,
 * preferences and consumer-private metadata are intentionally NOT exposed
 * in this iteration (encrypted blobs).
 */
export type User = {
  /** Avatar elegido de la biblioteca (`listAvatars`). Null ⇒ ninguno. */
  avatar_id?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  date_of_birth?: Maybe<Scalars['String']['output']>;
  display_name?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  external_ids: Array<ExternalId>;
  first_name?: Maybe<Scalars['String']['output']>;
  grade?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  last_name?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user_type_id: Scalars['String']['output'];
};

export type UserMilestone = {
  achieved_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  milestone: Scalars['ID']['output'];
  user: Scalars['ID']['output'];
};

export type UserSearchResult = {
  email: Scalars['String']['output'];
  status: Scalars['String']['output'];
  tenant_id: Scalars['ID']['output'];
  tenant_name: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/**
 * Seeded user-type catalog entry (read-only). Provisioned by
 * `manager.CreatorService` Phase 1 with the 8 canonical roles:
 * admin, school-admin, counselor, teacher, parent, support, tutor, student.
 */
export type UserType = {
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/** API key validation response with tenant and user information. */
export type ValidateApiKeyPayload = {
  /** API key identifier */
  id?: Maybe<Scalars['String']['output']>;
  /** Tenant identifier associated with the key */
  tenant?: Maybe<Scalars['String']['output']>;
  /** User identifier who created the key */
  user?: Maybe<Scalars['String']['output']>;
  /** Whether the API key is valid */
  valid: Scalars['Boolean']['output'];
};

export type Webhook = {
  active: Scalars['Boolean']['output'];
  created_at: Scalars['String']['output'];
  deleted_at?: Maybe<Scalars['String']['output']>;
  events: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tenant: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type WinGratitude = {
  category?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  emotion?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  related_goal?: Maybe<Scalars['String']['output']>;
  shared_with: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: Scalars['String']['output'];
};
