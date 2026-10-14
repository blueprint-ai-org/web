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
    "fragment AuthPayloadFields on AuthPayload {\n  token\n  refresh_token\n  user_id\n  tenant\n  role\n  expiresAt\n  refreshExpiresAt\n}": typeof types.AuthPayloadFieldsFragmentDoc,
    "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) { ...AuthPayloadFields }\n}": typeof types.LoginDocument,
    "mutation JoinTenant($code: String!, $email: String!, $name: String!) {\n  joinTenant(code: $code, email: $email, name: $name)\n}": typeof types.JoinTenantDocument,
    "mutation AcceptInvitation($token: String!, $password: String!) {\n  acceptInvitation(token: $token, password: $password) { ...AuthPayloadFields }\n}": typeof types.AcceptInvitationDocument,
    "mutation Refresh($refresh_token: String!) {\n  refreshToken(refresh_token: $refresh_token) { ...AuthPayloadFields }\n}": typeof types.RefreshDocument,
    "mutation Logout($refresh_token: String!) {\n  logout(refresh_token: $refresh_token)\n}": typeof types.LogoutDocument,
    "query MyGrades {\n  myGrades {\n    lmsConnected\n    studentMatched\n    courses {\n      lmsType\n      courseExternalId\n      courseName\n      teacherName\n      currentScore\n      currentGrade\n      attendancePercent\n    }\n  }\n}": typeof types.MyGradesDocument,
    "query LtiLaunchRole($ltiToken: String!) {\n  ltiLaunchRole(ltiToken: $ltiToken) { role }\n}": typeof types.LtiLaunchRoleDocument,
    "query Me {\n  me {\n    preferredName\n    user {\n      avatar_id\n      avatar { id name image_url background }\n      onboardingCompletedAt\n    }\n  }\n}": typeof types.MeDocument,
    "query ListCheckinMoods {\n  listMoods(curatedOnly: true) {\n    moods {\n      id\n      identifier\n      label\n      level\n      emoji\n      color\n      secondaryColor\n      chips\n      order\n      category { id identifier label order }\n    }\n  }\n}": typeof types.ListCheckinMoodsDocument,
    "mutation SubmitCheckIn($input: SubmitCheckInInput!) {\n  submitCheckIn(input: $input) {\n    moodHistory { id note }\n    answers { id questionId }\n  }\n}": typeof types.SubmitCheckInDocument,
    "query PasswordPolicy {\n  passwordPolicy { minLength maxBytes }\n}": typeof types.PasswordPolicyDocument,
    "query MyPrivacySettings {\n  myPrivacySettings { key label description hint enabled editable }\n}": typeof types.MyPrivacySettingsDocument,
    "mutation UpdateMyPrivacySettings($input: PrivacySettingsInput!) {\n  updateMyPrivacySettings(input: $input) { key label description hint enabled editable }\n}": typeof types.UpdateMyPrivacySettingsDocument,
    "mutation CompleteOnboarding {\n  completeOnboarding { id onboardingCompletedAt }\n}": typeof types.CompleteOnboardingDocument,
    "query ListQuestions(\n  $category: String\n  $keys: [String!]\n  $type: QuestionType\n  $unansweredBy: ID\n  $pageSize: Int\n) {\n  listQuestions(\n    category: $category\n    keys: $keys\n    type: $type\n    unansweredBy: $unansweredBy\n    status: ACTIVE\n    pageSize: $pageSize\n  ) {\n    questions {\n      id key label category type display max_selections\n      options { id label value emoji imageUrl order }\n    }\n  }\n}": typeof types.ListQuestionsDocument,
};
const documents: Documents = {
    "fragment AuthPayloadFields on AuthPayload {\n  token\n  refresh_token\n  user_id\n  tenant\n  role\n  expiresAt\n  refreshExpiresAt\n}": types.AuthPayloadFieldsFragmentDoc,
    "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) { ...AuthPayloadFields }\n}": types.LoginDocument,
    "mutation JoinTenant($code: String!, $email: String!, $name: String!) {\n  joinTenant(code: $code, email: $email, name: $name)\n}": types.JoinTenantDocument,
    "mutation AcceptInvitation($token: String!, $password: String!) {\n  acceptInvitation(token: $token, password: $password) { ...AuthPayloadFields }\n}": types.AcceptInvitationDocument,
    "mutation Refresh($refresh_token: String!) {\n  refreshToken(refresh_token: $refresh_token) { ...AuthPayloadFields }\n}": types.RefreshDocument,
    "mutation Logout($refresh_token: String!) {\n  logout(refresh_token: $refresh_token)\n}": types.LogoutDocument,
    "query MyGrades {\n  myGrades {\n    lmsConnected\n    studentMatched\n    courses {\n      lmsType\n      courseExternalId\n      courseName\n      teacherName\n      currentScore\n      currentGrade\n      attendancePercent\n    }\n  }\n}": types.MyGradesDocument,
    "query LtiLaunchRole($ltiToken: String!) {\n  ltiLaunchRole(ltiToken: $ltiToken) { role }\n}": types.LtiLaunchRoleDocument,
    "query Me {\n  me {\n    preferredName\n    user {\n      avatar_id\n      avatar { id name image_url background }\n      onboardingCompletedAt\n    }\n  }\n}": types.MeDocument,
    "query ListCheckinMoods {\n  listMoods(curatedOnly: true) {\n    moods {\n      id\n      identifier\n      label\n      level\n      emoji\n      color\n      secondaryColor\n      chips\n      order\n      category { id identifier label order }\n    }\n  }\n}": types.ListCheckinMoodsDocument,
    "mutation SubmitCheckIn($input: SubmitCheckInInput!) {\n  submitCheckIn(input: $input) {\n    moodHistory { id note }\n    answers { id questionId }\n  }\n}": types.SubmitCheckInDocument,
    "query PasswordPolicy {\n  passwordPolicy { minLength maxBytes }\n}": types.PasswordPolicyDocument,
    "query MyPrivacySettings {\n  myPrivacySettings { key label description hint enabled editable }\n}": types.MyPrivacySettingsDocument,
    "mutation UpdateMyPrivacySettings($input: PrivacySettingsInput!) {\n  updateMyPrivacySettings(input: $input) { key label description hint enabled editable }\n}": types.UpdateMyPrivacySettingsDocument,
    "mutation CompleteOnboarding {\n  completeOnboarding { id onboardingCompletedAt }\n}": types.CompleteOnboardingDocument,
    "query ListQuestions(\n  $category: String\n  $keys: [String!]\n  $type: QuestionType\n  $unansweredBy: ID\n  $pageSize: Int\n) {\n  listQuestions(\n    category: $category\n    keys: $keys\n    type: $type\n    unansweredBy: $unansweredBy\n    status: ACTIVE\n    pageSize: $pageSize\n  ) {\n    questions {\n      id key label category type display max_selections\n      options { id label value emoji imageUrl order }\n    }\n  }\n}": types.ListQuestionsDocument,
};

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
export function gql(source: "query MyGrades {\n  myGrades {\n    lmsConnected\n    studentMatched\n    courses {\n      lmsType\n      courseExternalId\n      courseName\n      teacherName\n      currentScore\n      currentGrade\n      attendancePercent\n    }\n  }\n}"): typeof import('./graphql').MyGradesDocument;
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


export function gql(source: string) {
  return (documents as any)[source] ?? {};
}
