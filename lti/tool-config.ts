// Shared LTI tool-configuration shape.
//
// Both `/lti-config.json` (manual JSON-paste install) and `/lti/register`
// (LTI 1.3 Dynamic Registration) need the same placement payload — same
// text, same icon, same scopes, same custom fields. Defining the shape
// once in pure functions ensures the two install paths cannot drift.
//
// Consumers pass a `baseUrl` (e.g. `https://spark.example.com`); these
// builders interpolate it into every absolute URL the tool advertises.

export type Placement = {
  text: string
  placement: string
  message_type: string
  target_link_uri: string
  icon_url?: string
  icon_svg_path_64?: string
  custom_fields?: Record<string, string>
}

export type ToolConfigExtension = {
  domain: string
  tool_id: string
  privacy_level: string
  platform: string
  settings: {
    platform: string
    placements: Placement[]
  }
}

export type ToolConfig = {
  title: string
  description: string
  target_link_uri: string
  oidc_initiation_url: string
  oidc_initiation_urls: Record<string, string>
  public_jwk_url: string
  public_jwk: null
  custom_fields: Record<string, string>
  scopes: string[]
  extensions: ToolConfigExtension[]
}

export function buildPlacements(baseUrl: string): Placement[] {
  return [
    {
      text: 'Spark EQ',
      placement: 'course_navigation',
      message_type: 'LtiResourceLinkRequest',
      target_link_uri: `${baseUrl}/lti/launch`,
    },
    {
      text: 'Spark EQ',
      // The Spark EQ logo, served as a raster image from `public/icon.png`.
      // No `icon_svg_path_64` here on purpose: Canvas renders the inline SVG
      // path in preference to the image when both are present, so advertising
      // one would hide the logo on JSON-paste installs.
      icon_url: `${baseUrl}/icon.png`,
      placement: 'global_navigation',
      message_type: 'LtiResourceLinkRequest',
      target_link_uri: `${baseUrl}/lti/launch`,
    },
    {
      text: 'Spark EQ — Counselor',
      placement: 'course_navigation',
      message_type: 'LtiResourceLinkRequest',
      target_link_uri: `${baseUrl}/lti/launch`,
      custom_fields: { lti_role: 'counselor' },
    },
  ]
}

export function buildToolConfig(baseUrl: string): ToolConfig {
  return {
    title: 'Spark EQ',
    description: 'Spark EQ — Blueprint LTI 1.3 tool for Canvas.',
    target_link_uri: `${baseUrl}/lti/launch`,
    oidc_initiation_url: `${baseUrl}/lti/login`,
    oidc_initiation_urls: {},
    public_jwk_url: `${baseUrl}/.well-known/jwks.json`,
    public_jwk: null,
    custom_fields: {},
    scopes: [],
    extensions: [
      {
        domain: '',
        tool_id: '',
        privacy_level: 'public',
        platform: 'canvas.instructure.com',
        settings: {
          platform: 'canvas.instructure.com',
          placements: buildPlacements(baseUrl),
        },
      },
    ],
  }
}
