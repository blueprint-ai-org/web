/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query JourneyActivity($from: String!, $to: String!, $timeZone: String, $fromInstant: String, $toInstant: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    days { date moodHistories { id } }\n    totals { checkinDays moodsNamed lessonsCompleted lessonsByCategory { category count } sparksEarned }\n  }\n  moodCounts(from: $fromInstant, to: $toInstant) { counts { label count } }\n  listContentCategories { key title }\n  listMilestones { id title }\n  listUserMilestones { milestone achieved_at }\n}": typeof types.JourneyActivityDocument,
    "query RecapActivity($from: String!, $to: String!, $timeZone: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    totals { moodsNamed journals lessonsViewed lessonsCompleted }\n  }\n}": typeof types.RecapActivityDocument,
    "query SummaryActivity($from: String!, $to: String!, $timeZone: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    days {\n      date\n      moodHistories { id moods { id } created_at }\n      journals { content created_at }\n      wins { title description created_at }\n      miniSurveys { moodHistory category responses { question answer option_ids } created_at }\n    }\n  }\n}": typeof types.SummaryActivityDocument,
    "fragment AuthPayloadFields on AuthPayload {\n  token\n  refresh_token\n  user_id\n  tenant\n  role\n  expiresAt\n  refreshExpiresAt\n}": typeof types.AuthPayloadFieldsFragmentDoc,
    "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) { ...AuthPayloadFields }\n}": typeof types.LoginDocument,
    "mutation JoinTenant($code: String!, $email: String!, $name: String!) {\n  joinTenant(code: $code, email: $email, name: $name)\n}": typeof types.JoinTenantDocument,
    "mutation AcceptInvitation($token: String!, $password: String!) {\n  acceptInvitation(token: $token, password: $password) { ...AuthPayloadFields }\n}": typeof types.AcceptInvitationDocument,
    "mutation Refresh($refresh_token: String!) {\n  refreshToken(refresh_token: $refresh_token) { ...AuthPayloadFields }\n}": typeof types.RefreshDocument,
    "mutation Logout($refresh_token: String!) {\n  logout(refresh_token: $refresh_token)\n}": typeof types.LogoutDocument,
    "query Toolkit {\n  listContentCategories { key title emoji color }\n  listRecommendedContent(limit: 3) { id title duration_seconds video_url cover_url category sparks }\n  viewed: listViewedContent(contentKind: LESSON, pageSize: 20) {\n    interactions { lesson { id title duration_seconds video_url cover_url category sparks } }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) {\n    interactions { lesson { id title duration_seconds video_url cover_url category sparks } }\n  }\n}": typeof types.ToolkitDocument,
    "query ToolkitCategory($category: String!) {\n  listContentCategories { key title emoji color }\n  listLessons(category: $category, pageSize: 50) {\n    lessons { id title duration_seconds video_url cover_url category sparks }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) { interactions { content_id } }\n}": typeof types.ToolkitCategoryDocument,
    "query ToolkitLesson($id: ID!) {\n  getLesson(id: $id) { id title duration_seconds video_url cover_url category sparks }\n}": typeof types.ToolkitLessonDocument,
    "query SavedLessonIds($category: String!) {\n  listLessons(category: $category, pageSize: 10) {\n    lessons { id title duration_seconds video_url cover_url category sparks }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) { interactions { content_id } }\n}": typeof types.SavedLessonIdsDocument,
    "mutation SetLessonSaved($id: ID!, $saved: Boolean!) {\n  setContentSaved(contentKind: LESSON, contentId: $id, saved: $saved) { saved }\n}": typeof types.SetLessonSavedDocument,
    "mutation RecordLessonView($id: ID!) {\n  recordContentView(contentKind: LESSON, contentId: $id) { view_count }\n}": typeof types.RecordLessonViewDocument,
    "mutation CompleteLesson($id: ID!) {\n  completeLesson(lesson: $id) { sparks_awarded }\n}": typeof types.CompleteLessonDocument,
    "query MySchools {\n  listSchoolsForUser(pageSize: 5) { schools { id name } }\n}": typeof types.MySchoolsDocument,
    "query CohortRiskWatchlist($school: ID!) {\n  cohortRisk(scopeType: SCHOOL, scopeId: $school) {\n    watchlist {\n      user\n      alertId\n      alertStatus\n      alertCreatedAt\n      tier\n      riskLevel\n      riskScore\n      confidence\n      direction\n      grade\n      student { first_name last_name display_name }\n    }\n  }\n}": typeof types.CohortRiskWatchlistDocument,
    "query SchoolClimate($school: ID!) {\n  cohortMetrics(\n    scopeType: SCHOOL\n    scopeId: $school\n    metrics: [MOOD_BASELINE, ENGAGEMENT_DELTA, SLEEP_TREND, SUPPORT_INDEX, ROUTINE_CONSISTENCY]\n  ) {\n    cohortSize\n    metrics { metricName score }\n  }\n  metricDefinitions { name label description }\n}": typeof types.SchoolClimateDocument,
    "mutation AcknowledgeRiskAlert($id: ID!) {\n  acknowledgeRiskAlert(id: $id) { id }\n}": typeof types.AcknowledgeRiskAlertDocument,
    "query SparkRules { listSparkRules { event amount } }": typeof types.SparkRulesDocument,
    "query Hub($date: String) {\n  sparkBalance { balance }\n  dailyCards(date: $date) { cards { family done } }\n}": typeof types.HubDocument,
    "query Collectibles($section: CollectibleSection) {\n  listCollectibles(section: $section, status: ACTIVE, pageSize: 100) {\n    collectibles { id name description image_url cost section owned affordable }\n  }\n}": typeof types.CollectiblesDocument,
    "mutation PurchaseCollectible($id: ID!) {\n  purchaseCollectible(collectibleId: $id) { balance }\n}": typeof types.PurchaseCollectibleDocument,
    "query Milestones {\n  listMilestones { id reward_sparks order }\n  listUserMilestones { milestone }\n}": typeof types.MilestonesDocument,
    "query MyGrades {\n  myGrades {\n    lmsConnected\n    studentMatched\n    courses {\n      lmsType\n      courseExternalId\n      courseName\n      teacherName\n      currentScore\n      currentGrade\n      attendancePercent\n    }\n  }\n}": typeof types.MyGradesDocument,
    "mutation CreateInterventionSession($studentId: ID!) {\n  createInterventionSession(studentId: $studentId) {\n    sessionId\n    pathway\n    supportBlocks { type content order }\n    actionPayload { tools { id name description toolType } }\n    uiMode\n    requiresAcknowledgment\n    safetyMessage\n    crisisResources { hotline textLine }\n  }\n}": typeof types.CreateInterventionSessionDocument,
    "mutation TransitionIntervention($sessionId: ID!, $toState: InterventionState!) {\n  transitionInterventionState(sessionId: $sessionId, toState: $toState) { success error }\n}": typeof types.TransitionInterventionDocument,
    "mutation ContinueSupport($sessionId: ID!) {\n  continueSupport(sessionId: $sessionId) { success error }\n}": typeof types.ContinueSupportDocument,
    "mutation RecordInterventionOutcome($input: RecordOutcomeInput!) {\n  recordInterventionOutcome(input: $input) { success message }\n}": typeof types.RecordInterventionOutcomeDocument,
    "mutation ReportInterventionEvent($input: InterventionEventInput!) {\n  reportInterventionEvent(input: $input)\n}": typeof types.ReportInterventionEventDocument,
    "query Journals($user: String, $pageSize: Int) {\n  listJournals(user: $user, page_size: $pageSize) {\n    journals { id title content question_ids created_at }\n    next_page_token\n  }\n}": typeof types.JournalsDocument,
    "query JournalHome($user: String, $pageSize: Int, $date: String!, $timeZone: String) {\n  dailyQuestions(category: \"journal\", date: $date, count: 2, timeZone: $timeZone) { id label }\n  listJournals(user: $user, page_size: $pageSize) {\n    journals { id title content question_ids created_at }\n    next_page_token\n  }\n  studentActivity(from: $date, to: $date, timeZone: $timeZone) {\n    days { moodHistories { moods { id } created_at } }\n  }\n}": typeof types.JournalHomeDocument,
    "mutation LoginLti($ltiToken: String!) {\n  loginLti(ltiToken: $ltiToken) { ...AuthPayloadFields }\n}": typeof types.LoginLtiDocument,
    "query LtiLaunchRole($ltiToken: String!) {\n  ltiLaunchRole(ltiToken: $ltiToken) { role }\n}": typeof types.LtiLaunchRoleDocument,
    "query Me {\n  me {\n    preferredName\n    user {\n      avatar_id\n      avatar { id name image_url background }\n      onboardingCompletedAt\n    }\n  }\n}": typeof types.MeDocument,
    "query ListCheckinMoods {\n  listMoods(curatedOnly: true) {\n    moods {\n      id\n      identifier\n      label\n      level\n      emoji\n      color\n      secondaryColor\n      chips\n      order\n      category { id identifier label order }\n    }\n  }\n}": typeof types.ListCheckinMoodsDocument,
    "mutation SubmitCheckIn($input: SubmitCheckInInput!) {\n  submitCheckIn(input: $input) {\n    moodHistory { id note }\n    answers { id questionId }\n  }\n}": typeof types.SubmitCheckInDocument,
    "query PasswordPolicy {\n  passwordPolicy { minLength maxBytes }\n}": typeof types.PasswordPolicyDocument,
    "query MyPrivacySettings {\n  myPrivacySettings { key label description hint enabled editable }\n}": typeof types.MyPrivacySettingsDocument,
    "mutation UpdateMyPrivacySettings($input: PrivacySettingsInput!) {\n  updateMyPrivacySettings(input: $input) { key label description hint enabled editable }\n}": typeof types.UpdateMyPrivacySettingsDocument,
    "mutation CompleteOnboarding {\n  completeOnboarding { id onboardingCompletedAt }\n}": typeof types.CompleteOnboardingDocument,
    "query ListQuestions(\n  $category: String\n  $keys: [String!]\n  $type: QuestionType\n  $unansweredBy: ID\n  $pageSize: Int\n) {\n  listQuestions(\n    category: $category\n    keys: $keys\n    type: $type\n    unansweredBy: $unansweredBy\n    status: ACTIVE\n    pageSize: $pageSize\n  ) {\n    questions {\n      id key label category type display max_selections\n      options { id label value emoji imageUrl order }\n    }\n  }\n}": typeof types.ListQuestionsDocument,
    "query DailyQuestions(\n  $category: String!\n  $topic: String\n  $date: String!\n  $count: Int\n  $timeZone: String\n) {\n  dailyQuestions(category: $category, topic: $topic, date: $date, count: $count, timeZone: $timeZone) {\n    id key label category type display max_selections\n    options { id label value emoji imageUrl order }\n  }\n}": typeof types.DailyQuestionsDocument,
    "query NoticeWins($date: String!, $timeZone: String, $category: String!, $topic: String) {\n  dailyQuestions(category: $category, topic: $topic, date: $date, count: 1, timeZone: $timeZone) { id label }\n  studentActivity(from: $date, to: $date, timeZone: $timeZone) {\n    days { wins { id title description question created_at } }\n  }\n  listSparkRules { event amount }\n}": typeof types.NoticeWinsDocument,
    "mutation CreateWin($input: CreateWinGratitudeInput!) {\n  createWinGratitude(input: $input) { id sparksAwarded }\n}": typeof types.CreateWinDocument,
    "mutation UpdateWin($input: UpdateWinGratitudeInput!) {\n  updateWinGratitude(input: $input) { id }\n}": typeof types.UpdateWinDocument,
};
const documents: Documents = {
    "query JourneyActivity($from: String!, $to: String!, $timeZone: String, $fromInstant: String, $toInstant: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    days { date moodHistories { id } }\n    totals { checkinDays moodsNamed lessonsCompleted lessonsByCategory { category count } sparksEarned }\n  }\n  moodCounts(from: $fromInstant, to: $toInstant) { counts { label count } }\n  listContentCategories { key title }\n  listMilestones { id title }\n  listUserMilestones { milestone achieved_at }\n}": types.JourneyActivityDocument,
    "query RecapActivity($from: String!, $to: String!, $timeZone: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    totals { moodsNamed journals lessonsViewed lessonsCompleted }\n  }\n}": types.RecapActivityDocument,
    "query SummaryActivity($from: String!, $to: String!, $timeZone: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    days {\n      date\n      moodHistories { id moods { id } created_at }\n      journals { content created_at }\n      wins { title description created_at }\n      miniSurveys { moodHistory category responses { question answer option_ids } created_at }\n    }\n  }\n}": types.SummaryActivityDocument,
    "fragment AuthPayloadFields on AuthPayload {\n  token\n  refresh_token\n  user_id\n  tenant\n  role\n  expiresAt\n  refreshExpiresAt\n}": types.AuthPayloadFieldsFragmentDoc,
    "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) { ...AuthPayloadFields }\n}": types.LoginDocument,
    "mutation JoinTenant($code: String!, $email: String!, $name: String!) {\n  joinTenant(code: $code, email: $email, name: $name)\n}": types.JoinTenantDocument,
    "mutation AcceptInvitation($token: String!, $password: String!) {\n  acceptInvitation(token: $token, password: $password) { ...AuthPayloadFields }\n}": types.AcceptInvitationDocument,
    "mutation Refresh($refresh_token: String!) {\n  refreshToken(refresh_token: $refresh_token) { ...AuthPayloadFields }\n}": types.RefreshDocument,
    "mutation Logout($refresh_token: String!) {\n  logout(refresh_token: $refresh_token)\n}": types.LogoutDocument,
    "query Toolkit {\n  listContentCategories { key title emoji color }\n  listRecommendedContent(limit: 3) { id title duration_seconds video_url cover_url category sparks }\n  viewed: listViewedContent(contentKind: LESSON, pageSize: 20) {\n    interactions { lesson { id title duration_seconds video_url cover_url category sparks } }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) {\n    interactions { lesson { id title duration_seconds video_url cover_url category sparks } }\n  }\n}": types.ToolkitDocument,
    "query ToolkitCategory($category: String!) {\n  listContentCategories { key title emoji color }\n  listLessons(category: $category, pageSize: 50) {\n    lessons { id title duration_seconds video_url cover_url category sparks }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) { interactions { content_id } }\n}": types.ToolkitCategoryDocument,
    "query ToolkitLesson($id: ID!) {\n  getLesson(id: $id) { id title duration_seconds video_url cover_url category sparks }\n}": types.ToolkitLessonDocument,
    "query SavedLessonIds($category: String!) {\n  listLessons(category: $category, pageSize: 10) {\n    lessons { id title duration_seconds video_url cover_url category sparks }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) { interactions { content_id } }\n}": types.SavedLessonIdsDocument,
    "mutation SetLessonSaved($id: ID!, $saved: Boolean!) {\n  setContentSaved(contentKind: LESSON, contentId: $id, saved: $saved) { saved }\n}": types.SetLessonSavedDocument,
    "mutation RecordLessonView($id: ID!) {\n  recordContentView(contentKind: LESSON, contentId: $id) { view_count }\n}": types.RecordLessonViewDocument,
    "mutation CompleteLesson($id: ID!) {\n  completeLesson(lesson: $id) { sparks_awarded }\n}": types.CompleteLessonDocument,
    "query MySchools {\n  listSchoolsForUser(pageSize: 5) { schools { id name } }\n}": types.MySchoolsDocument,
    "query CohortRiskWatchlist($school: ID!) {\n  cohortRisk(scopeType: SCHOOL, scopeId: $school) {\n    watchlist {\n      user\n      alertId\n      alertStatus\n      alertCreatedAt\n      tier\n      riskLevel\n      riskScore\n      confidence\n      direction\n      grade\n      student { first_name last_name display_name }\n    }\n  }\n}": types.CohortRiskWatchlistDocument,
    "query SchoolClimate($school: ID!) {\n  cohortMetrics(\n    scopeType: SCHOOL\n    scopeId: $school\n    metrics: [MOOD_BASELINE, ENGAGEMENT_DELTA, SLEEP_TREND, SUPPORT_INDEX, ROUTINE_CONSISTENCY]\n  ) {\n    cohortSize\n    metrics { metricName score }\n  }\n  metricDefinitions { name label description }\n}": types.SchoolClimateDocument,
    "mutation AcknowledgeRiskAlert($id: ID!) {\n  acknowledgeRiskAlert(id: $id) { id }\n}": types.AcknowledgeRiskAlertDocument,
    "query SparkRules { listSparkRules { event amount } }": types.SparkRulesDocument,
    "query Hub($date: String) {\n  sparkBalance { balance }\n  dailyCards(date: $date) { cards { family done } }\n}": types.HubDocument,
    "query Collectibles($section: CollectibleSection) {\n  listCollectibles(section: $section, status: ACTIVE, pageSize: 100) {\n    collectibles { id name description image_url cost section owned affordable }\n  }\n}": types.CollectiblesDocument,
    "mutation PurchaseCollectible($id: ID!) {\n  purchaseCollectible(collectibleId: $id) { balance }\n}": types.PurchaseCollectibleDocument,
    "query Milestones {\n  listMilestones { id reward_sparks order }\n  listUserMilestones { milestone }\n}": types.MilestonesDocument,
    "query MyGrades {\n  myGrades {\n    lmsConnected\n    studentMatched\n    courses {\n      lmsType\n      courseExternalId\n      courseName\n      teacherName\n      currentScore\n      currentGrade\n      attendancePercent\n    }\n  }\n}": types.MyGradesDocument,
    "mutation CreateInterventionSession($studentId: ID!) {\n  createInterventionSession(studentId: $studentId) {\n    sessionId\n    pathway\n    supportBlocks { type content order }\n    actionPayload { tools { id name description toolType } }\n    uiMode\n    requiresAcknowledgment\n    safetyMessage\n    crisisResources { hotline textLine }\n  }\n}": types.CreateInterventionSessionDocument,
    "mutation TransitionIntervention($sessionId: ID!, $toState: InterventionState!) {\n  transitionInterventionState(sessionId: $sessionId, toState: $toState) { success error }\n}": types.TransitionInterventionDocument,
    "mutation ContinueSupport($sessionId: ID!) {\n  continueSupport(sessionId: $sessionId) { success error }\n}": types.ContinueSupportDocument,
    "mutation RecordInterventionOutcome($input: RecordOutcomeInput!) {\n  recordInterventionOutcome(input: $input) { success message }\n}": types.RecordInterventionOutcomeDocument,
    "mutation ReportInterventionEvent($input: InterventionEventInput!) {\n  reportInterventionEvent(input: $input)\n}": types.ReportInterventionEventDocument,
    "query Journals($user: String, $pageSize: Int) {\n  listJournals(user: $user, page_size: $pageSize) {\n    journals { id title content question_ids created_at }\n    next_page_token\n  }\n}": types.JournalsDocument,
    "query JournalHome($user: String, $pageSize: Int, $date: String!, $timeZone: String) {\n  dailyQuestions(category: \"journal\", date: $date, count: 2, timeZone: $timeZone) { id label }\n  listJournals(user: $user, page_size: $pageSize) {\n    journals { id title content question_ids created_at }\n    next_page_token\n  }\n  studentActivity(from: $date, to: $date, timeZone: $timeZone) {\n    days { moodHistories { moods { id } created_at } }\n  }\n}": types.JournalHomeDocument,
    "mutation LoginLti($ltiToken: String!) {\n  loginLti(ltiToken: $ltiToken) { ...AuthPayloadFields }\n}": types.LoginLtiDocument,
    "query LtiLaunchRole($ltiToken: String!) {\n  ltiLaunchRole(ltiToken: $ltiToken) { role }\n}": types.LtiLaunchRoleDocument,
    "query Me {\n  me {\n    preferredName\n    user {\n      avatar_id\n      avatar { id name image_url background }\n      onboardingCompletedAt\n    }\n  }\n}": types.MeDocument,
    "query ListCheckinMoods {\n  listMoods(curatedOnly: true) {\n    moods {\n      id\n      identifier\n      label\n      level\n      emoji\n      color\n      secondaryColor\n      chips\n      order\n      category { id identifier label order }\n    }\n  }\n}": types.ListCheckinMoodsDocument,
    "mutation SubmitCheckIn($input: SubmitCheckInInput!) {\n  submitCheckIn(input: $input) {\n    moodHistory { id note }\n    answers { id questionId }\n  }\n}": types.SubmitCheckInDocument,
    "query PasswordPolicy {\n  passwordPolicy { minLength maxBytes }\n}": types.PasswordPolicyDocument,
    "query MyPrivacySettings {\n  myPrivacySettings { key label description hint enabled editable }\n}": types.MyPrivacySettingsDocument,
    "mutation UpdateMyPrivacySettings($input: PrivacySettingsInput!) {\n  updateMyPrivacySettings(input: $input) { key label description hint enabled editable }\n}": types.UpdateMyPrivacySettingsDocument,
    "mutation CompleteOnboarding {\n  completeOnboarding { id onboardingCompletedAt }\n}": types.CompleteOnboardingDocument,
    "query ListQuestions(\n  $category: String\n  $keys: [String!]\n  $type: QuestionType\n  $unansweredBy: ID\n  $pageSize: Int\n) {\n  listQuestions(\n    category: $category\n    keys: $keys\n    type: $type\n    unansweredBy: $unansweredBy\n    status: ACTIVE\n    pageSize: $pageSize\n  ) {\n    questions {\n      id key label category type display max_selections\n      options { id label value emoji imageUrl order }\n    }\n  }\n}": types.ListQuestionsDocument,
    "query DailyQuestions(\n  $category: String!\n  $topic: String\n  $date: String!\n  $count: Int\n  $timeZone: String\n) {\n  dailyQuestions(category: $category, topic: $topic, date: $date, count: $count, timeZone: $timeZone) {\n    id key label category type display max_selections\n    options { id label value emoji imageUrl order }\n  }\n}": types.DailyQuestionsDocument,
    "query NoticeWins($date: String!, $timeZone: String, $category: String!, $topic: String) {\n  dailyQuestions(category: $category, topic: $topic, date: $date, count: 1, timeZone: $timeZone) { id label }\n  studentActivity(from: $date, to: $date, timeZone: $timeZone) {\n    days { wins { id title description question created_at } }\n  }\n  listSparkRules { event amount }\n}": types.NoticeWinsDocument,
    "mutation CreateWin($input: CreateWinGratitudeInput!) {\n  createWinGratitude(input: $input) { id sparksAwarded }\n}": types.CreateWinDocument,
    "mutation UpdateWin($input: UpdateWinGratitudeInput!) {\n  updateWinGratitude(input: $input) { id }\n}": types.UpdateWinDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query JourneyActivity($from: String!, $to: String!, $timeZone: String, $fromInstant: String, $toInstant: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    days { date moodHistories { id } }\n    totals { checkinDays moodsNamed lessonsCompleted lessonsByCategory { category count } sparksEarned }\n  }\n  moodCounts(from: $fromInstant, to: $toInstant) { counts { label count } }\n  listContentCategories { key title }\n  listMilestones { id title }\n  listUserMilestones { milestone achieved_at }\n}"): typeof import('./graphql').JourneyActivityDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query RecapActivity($from: String!, $to: String!, $timeZone: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    totals { moodsNamed journals lessonsViewed lessonsCompleted }\n  }\n}"): typeof import('./graphql').RecapActivityDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query SummaryActivity($from: String!, $to: String!, $timeZone: String) {\n  studentActivity(from: $from, to: $to, timeZone: $timeZone) {\n    days {\n      date\n      moodHistories { id moods { id } created_at }\n      journals { content created_at }\n      wins { title description created_at }\n      miniSurveys { moodHistory category responses { question answer option_ids } created_at }\n    }\n  }\n}"): typeof import('./graphql').SummaryActivityDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "fragment AuthPayloadFields on AuthPayload {\n  token\n  refresh_token\n  user_id\n  tenant\n  role\n  expiresAt\n  refreshExpiresAt\n}"): typeof import('./graphql').AuthPayloadFieldsFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) { ...AuthPayloadFields }\n}"): typeof import('./graphql').LoginDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation JoinTenant($code: String!, $email: String!, $name: String!) {\n  joinTenant(code: $code, email: $email, name: $name)\n}"): typeof import('./graphql').JoinTenantDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation AcceptInvitation($token: String!, $password: String!) {\n  acceptInvitation(token: $token, password: $password) { ...AuthPayloadFields }\n}"): typeof import('./graphql').AcceptInvitationDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation Refresh($refresh_token: String!) {\n  refreshToken(refresh_token: $refresh_token) { ...AuthPayloadFields }\n}"): typeof import('./graphql').RefreshDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation Logout($refresh_token: String!) {\n  logout(refresh_token: $refresh_token)\n}"): typeof import('./graphql').LogoutDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query Toolkit {\n  listContentCategories { key title emoji color }\n  listRecommendedContent(limit: 3) { id title duration_seconds video_url cover_url category sparks }\n  viewed: listViewedContent(contentKind: LESSON, pageSize: 20) {\n    interactions { lesson { id title duration_seconds video_url cover_url category sparks } }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) {\n    interactions { lesson { id title duration_seconds video_url cover_url category sparks } }\n  }\n}"): typeof import('./graphql').ToolkitDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query ToolkitCategory($category: String!) {\n  listContentCategories { key title emoji color }\n  listLessons(category: $category, pageSize: 50) {\n    lessons { id title duration_seconds video_url cover_url category sparks }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) { interactions { content_id } }\n}"): typeof import('./graphql').ToolkitCategoryDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query ToolkitLesson($id: ID!) {\n  getLesson(id: $id) { id title duration_seconds video_url cover_url category sparks }\n}"): typeof import('./graphql').ToolkitLessonDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query SavedLessonIds($category: String!) {\n  listLessons(category: $category, pageSize: 10) {\n    lessons { id title duration_seconds video_url cover_url category sparks }\n  }\n  saved: listSavedContent(contentKind: LESSON, pageSize: 50) { interactions { content_id } }\n}"): typeof import('./graphql').SavedLessonIdsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation SetLessonSaved($id: ID!, $saved: Boolean!) {\n  setContentSaved(contentKind: LESSON, contentId: $id, saved: $saved) { saved }\n}"): typeof import('./graphql').SetLessonSavedDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation RecordLessonView($id: ID!) {\n  recordContentView(contentKind: LESSON, contentId: $id) { view_count }\n}"): typeof import('./graphql').RecordLessonViewDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation CompleteLesson($id: ID!) {\n  completeLesson(lesson: $id) { sparks_awarded }\n}"): typeof import('./graphql').CompleteLessonDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query MySchools {\n  listSchoolsForUser(pageSize: 5) { schools { id name } }\n}"): typeof import('./graphql').MySchoolsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query CohortRiskWatchlist($school: ID!) {\n  cohortRisk(scopeType: SCHOOL, scopeId: $school) {\n    watchlist {\n      user\n      alertId\n      alertStatus\n      alertCreatedAt\n      tier\n      riskLevel\n      riskScore\n      confidence\n      direction\n      grade\n      student { first_name last_name display_name }\n    }\n  }\n}"): typeof import('./graphql').CohortRiskWatchlistDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query SchoolClimate($school: ID!) {\n  cohortMetrics(\n    scopeType: SCHOOL\n    scopeId: $school\n    metrics: [MOOD_BASELINE, ENGAGEMENT_DELTA, SLEEP_TREND, SUPPORT_INDEX, ROUTINE_CONSISTENCY]\n  ) {\n    cohortSize\n    metrics { metricName score }\n  }\n  metricDefinitions { name label description }\n}"): typeof import('./graphql').SchoolClimateDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation AcknowledgeRiskAlert($id: ID!) {\n  acknowledgeRiskAlert(id: $id) { id }\n}"): typeof import('./graphql').AcknowledgeRiskAlertDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query SparkRules { listSparkRules { event amount } }"): typeof import('./graphql').SparkRulesDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query Hub($date: String) {\n  sparkBalance { balance }\n  dailyCards(date: $date) { cards { family done } }\n}"): typeof import('./graphql').HubDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query Collectibles($section: CollectibleSection) {\n  listCollectibles(section: $section, status: ACTIVE, pageSize: 100) {\n    collectibles { id name description image_url cost section owned affordable }\n  }\n}"): typeof import('./graphql').CollectiblesDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation PurchaseCollectible($id: ID!) {\n  purchaseCollectible(collectibleId: $id) { balance }\n}"): typeof import('./graphql').PurchaseCollectibleDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query Milestones {\n  listMilestones { id reward_sparks order }\n  listUserMilestones { milestone }\n}"): typeof import('./graphql').MilestonesDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query MyGrades {\n  myGrades {\n    lmsConnected\n    studentMatched\n    courses {\n      lmsType\n      courseExternalId\n      courseName\n      teacherName\n      currentScore\n      currentGrade\n      attendancePercent\n    }\n  }\n}"): typeof import('./graphql').MyGradesDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation CreateInterventionSession($studentId: ID!) {\n  createInterventionSession(studentId: $studentId) {\n    sessionId\n    pathway\n    supportBlocks { type content order }\n    actionPayload { tools { id name description toolType } }\n    uiMode\n    requiresAcknowledgment\n    safetyMessage\n    crisisResources { hotline textLine }\n  }\n}"): typeof import('./graphql').CreateInterventionSessionDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation TransitionIntervention($sessionId: ID!, $toState: InterventionState!) {\n  transitionInterventionState(sessionId: $sessionId, toState: $toState) { success error }\n}"): typeof import('./graphql').TransitionInterventionDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation ContinueSupport($sessionId: ID!) {\n  continueSupport(sessionId: $sessionId) { success error }\n}"): typeof import('./graphql').ContinueSupportDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation RecordInterventionOutcome($input: RecordOutcomeInput!) {\n  recordInterventionOutcome(input: $input) { success message }\n}"): typeof import('./graphql').RecordInterventionOutcomeDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation ReportInterventionEvent($input: InterventionEventInput!) {\n  reportInterventionEvent(input: $input)\n}"): typeof import('./graphql').ReportInterventionEventDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query Journals($user: String, $pageSize: Int) {\n  listJournals(user: $user, page_size: $pageSize) {\n    journals { id title content question_ids created_at }\n    next_page_token\n  }\n}"): typeof import('./graphql').JournalsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query JournalHome($user: String, $pageSize: Int, $date: String!, $timeZone: String) {\n  dailyQuestions(category: \"journal\", date: $date, count: 2, timeZone: $timeZone) { id label }\n  listJournals(user: $user, page_size: $pageSize) {\n    journals { id title content question_ids created_at }\n    next_page_token\n  }\n  studentActivity(from: $date, to: $date, timeZone: $timeZone) {\n    days { moodHistories { moods { id } created_at } }\n  }\n}"): typeof import('./graphql').JournalHomeDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation LoginLti($ltiToken: String!) {\n  loginLti(ltiToken: $ltiToken) { ...AuthPayloadFields }\n}"): typeof import('./graphql').LoginLtiDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query LtiLaunchRole($ltiToken: String!) {\n  ltiLaunchRole(ltiToken: $ltiToken) { role }\n}"): typeof import('./graphql').LtiLaunchRoleDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query Me {\n  me {\n    preferredName\n    user {\n      avatar_id\n      avatar { id name image_url background }\n      onboardingCompletedAt\n    }\n  }\n}"): typeof import('./graphql').MeDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query ListCheckinMoods {\n  listMoods(curatedOnly: true) {\n    moods {\n      id\n      identifier\n      label\n      level\n      emoji\n      color\n      secondaryColor\n      chips\n      order\n      category { id identifier label order }\n    }\n  }\n}"): typeof import('./graphql').ListCheckinMoodsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation SubmitCheckIn($input: SubmitCheckInInput!) {\n  submitCheckIn(input: $input) {\n    moodHistory { id note }\n    answers { id questionId }\n  }\n}"): typeof import('./graphql').SubmitCheckInDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query PasswordPolicy {\n  passwordPolicy { minLength maxBytes }\n}"): typeof import('./graphql').PasswordPolicyDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query MyPrivacySettings {\n  myPrivacySettings { key label description hint enabled editable }\n}"): typeof import('./graphql').MyPrivacySettingsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation UpdateMyPrivacySettings($input: PrivacySettingsInput!) {\n  updateMyPrivacySettings(input: $input) { key label description hint enabled editable }\n}"): typeof import('./graphql').UpdateMyPrivacySettingsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation CompleteOnboarding {\n  completeOnboarding { id onboardingCompletedAt }\n}"): typeof import('./graphql').CompleteOnboardingDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query ListQuestions(\n  $category: String\n  $keys: [String!]\n  $type: QuestionType\n  $unansweredBy: ID\n  $pageSize: Int\n) {\n  listQuestions(\n    category: $category\n    keys: $keys\n    type: $type\n    unansweredBy: $unansweredBy\n    status: ACTIVE\n    pageSize: $pageSize\n  ) {\n    questions {\n      id key label category type display max_selections\n      options { id label value emoji imageUrl order }\n    }\n  }\n}"): typeof import('./graphql').ListQuestionsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query DailyQuestions(\n  $category: String!\n  $topic: String\n  $date: String!\n  $count: Int\n  $timeZone: String\n) {\n  dailyQuestions(category: $category, topic: $topic, date: $date, count: $count, timeZone: $timeZone) {\n    id key label category type display max_selections\n    options { id label value emoji imageUrl order }\n  }\n}"): typeof import('./graphql').DailyQuestionsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query NoticeWins($date: String!, $timeZone: String, $category: String!, $topic: String) {\n  dailyQuestions(category: $category, topic: $topic, date: $date, count: 1, timeZone: $timeZone) { id label }\n  studentActivity(from: $date, to: $date, timeZone: $timeZone) {\n    days { wins { id title description question created_at } }\n  }\n  listSparkRules { event amount }\n}"): typeof import('./graphql').NoticeWinsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation CreateWin($input: CreateWinGratitudeInput!) {\n  createWinGratitude(input: $input) { id sparksAwarded }\n}"): typeof import('./graphql').CreateWinDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation UpdateWin($input: UpdateWinGratitudeInput!) {\n  updateWinGratitude(input: $input) { id }\n}"): typeof import('./graphql').UpdateWinDocument;


export function gql(source: string) {
  return (documents as any)[source] ?? {};
}
