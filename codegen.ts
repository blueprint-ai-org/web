import type { CodegenConfig } from '@graphql-codegen/cli'

/**
 * Types and documents generated from the gateway's published SDL.
 *
 * Replaces the hand-written types in `app/lib/bp-ai/types.ts`, which were
 * written from *observed* behaviour and therefore drifted: `AuthPayload` had
 * every field nullable while the schema declares `String!`, so every caller
 * carried a null branch that could not happen.
 *
 * `documentMode: 'string'` on purpose: the two clients are plain `fetch`, and
 * a `TypedDocumentString` carries its types while still being a string at
 * runtime. No GraphQL runtime reaches the bundle — the dependencies here are
 * development-only.
 *
 * `gqlTagName: 'gql'` because this repo already exports a function called
 * `graphql` — the fetch client in `app/lib/bp-ai/client.server.ts`. A module
 * that both declares a document and sends it would otherwise import two
 * different `graphql`s.
 */
const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: ['app/**/*.{ts,tsx}', '!app/lib/bp-ai/gql/**'],
  ignoreNoDocuments: true,
  generates: {
    'app/lib/bp-ai/gql/': {
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
        gqlTagName: 'gql',
      },
      config: {
        documentMode: 'string',
        enumsAsConst: true,
        scalars: { Int64: 'number', ID: 'string' },
        useTypeImports: true,
      },
    },
    // Every enum and input of the schema, whether an operation selects it or
    // not. The `client` preset only emits what the documents reach, and a UI
    // label map has to be keyed by the WHOLE enum — that is what makes `tsc`
    // fail when the backend adds a value, instead of the UI rendering a blank.
    'app/lib/bp-ai/gql/schema.ts': {
      plugins: ['typescript'],
      config: {
        enumsAsConst: true,
        scalars: { Int64: 'number', ID: 'string' },
        useTypeImports: true,
        skipTypename: true,
      },
    },
  },
}

export default config
