/**
 * `/preview/counselor/insights` — dev-only Support Mission Control preview.
 */

import { SupportMissionControl } from '~/components/dashboard/views/SupportMissionControl'

export function meta() {
  return [
    { title: 'Insights · Counselor (preview) · Blueprint' },
    { name: 'description', content: 'Counselor support mission control preview.' },
  ]
}

export default function PreviewCounselorInsightsRoute() {
  return <SupportMissionControl />
}
