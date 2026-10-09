/**
 * `/counselor/insights` — Support Mission Control view.
 */

import { SupportMissionControl } from '~/components/dashboard/views/SupportMissionControl'

export function meta() {
  return [
    { title: 'Insights · Counselor · Blueprint' },
    { name: 'description', content: 'Counselor support mission control.' },
  ]
}

export default function CounselorInsightsRoute() {
  return <SupportMissionControl />
}
