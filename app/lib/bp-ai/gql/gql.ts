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
    "mutation Signup($email: String!, $password: String!, $name: String!) {\n  signup(email: $email, password: $password, name: $name) { ...AuthPayloadFields }\n}": typeof types.SignupDocument,
    "mutation AcceptInvitation($token: String!, $password: String!) {\n  acceptInvitation(token: $token, password: $password) { ...AuthPayloadFields }\n}": typeof types.AcceptInvitationDocument,
    "mutation Refresh($refresh_token: String!) {\n  refreshToken(refresh_token: $refresh_token) { ...AuthPayloadFields }\n}": typeof types.RefreshDocument,
    "mutation Logout($refresh_token: String!) {\n  logout(refresh_token: $refresh_token)\n}": typeof types.LogoutDocument,
    "query LtiLaunchRole($ltiToken: String!) {\n  ltiLaunchRole(ltiToken: $ltiToken) { role }\n}": typeof types.LtiLaunchRoleDocument,
    "query Me {\n  me {\n    preferredName\n    user { avatar_id }\n  }\n}": typeof types.MeDocument,
    "query ListCheckinMoods {\n  listMoods(curatedOnly: true) {\n    moods {\n      id\n      identifier\n      label\n      level\n      emoji\n      color\n      secondaryColor\n      chips\n      order\n      category { id identifier label order }\n    }\n  }\n}": typeof types.ListCheckinMoodsDocument,
    "mutation CreateMoodHistory($input: CreateMoodHistoryInput!) {\n  createMoodHistory(input: $input) { id note }\n}": typeof types.CreateMoodHistoryDocument,
};
const documents: Documents = {
    "fragment AuthPayloadFields on AuthPayload {\n  token\n  refresh_token\n  user_id\n  tenant\n  role\n  expiresAt\n  refreshExpiresAt\n}": types.AuthPayloadFieldsFragmentDoc,
    "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) { ...AuthPayloadFields }\n}": types.LoginDocument,
    "mutation Signup($email: String!, $password: String!, $name: String!) {\n  signup(email: $email, password: $password, name: $name) { ...AuthPayloadFields }\n}": types.SignupDocument,
    "mutation AcceptInvitation($token: String!, $password: String!) {\n  acceptInvitation(token: $token, password: $password) { ...AuthPayloadFields }\n}": types.AcceptInvitationDocument,
    "mutation Refresh($refresh_token: String!) {\n  refreshToken(refresh_token: $refresh_token) { ...AuthPayloadFields }\n}": types.RefreshDocument,
    "mutation Logout($refresh_token: String!) {\n  logout(refresh_token: $refresh_token)\n}": types.LogoutDocument,
    "query LtiLaunchRole($ltiToken: String!) {\n  ltiLaunchRole(ltiToken: $ltiToken) { role }\n}": types.LtiLaunchRoleDocument,
    "query Me {\n  me {\n    preferredName\n    user { avatar_id }\n  }\n}": types.MeDocument,
    "query ListCheckinMoods {\n  listMoods(curatedOnly: true) {\n    moods {\n      id\n      identifier\n      label\n      level\n      emoji\n      color\n      secondaryColor\n      chips\n      order\n      category { id identifier label order }\n    }\n  }\n}": types.ListCheckinMoodsDocument,
    "mutation CreateMoodHistory($input: CreateMoodHistoryInput!) {\n  createMoodHistory(input: $input) { id note }\n}": types.CreateMoodHistoryDocument,
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
export function gql(source: "mutation Signup($email: String!, $password: String!, $name: String!) {\n  signup(email: $email, password: $password, name: $name) { ...AuthPayloadFields }\n}"): typeof import('./graphql').SignupDocument;
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
export function gql(source: "query LtiLaunchRole($ltiToken: String!) {\n  ltiLaunchRole(ltiToken: $ltiToken) { role }\n}"): typeof import('./graphql').LtiLaunchRoleDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query Me {\n  me {\n    preferredName\n    user { avatar_id }\n  }\n}"): typeof import('./graphql').MeDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query ListCheckinMoods {\n  listMoods(curatedOnly: true) {\n    moods {\n      id\n      identifier\n      label\n      level\n      emoji\n      color\n      secondaryColor\n      chips\n      order\n      category { id identifier label order }\n    }\n  }\n}"): typeof import('./graphql').ListCheckinMoodsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation CreateMoodHistory($input: CreateMoodHistoryInput!) {\n  createMoodHistory(input: $input) { id note }\n}"): typeof import('./graphql').CreateMoodHistoryDocument;


export function gql(source: string) {
  return (documents as any)[source] ?? {};
}
