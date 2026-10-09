export const moodData = [
  { day: "Mon", score: 72, baseline: 68 },
  { day: "Tue", score: 65, baseline: 68 },
  { day: "Wed", score: 58, baseline: 68 },
  { day: "Thu", score: 61, baseline: 68 },
  { day: "Fri", score: 54, baseline: 68 },
  { day: "Sat", score: 63, baseline: 68 },
  { day: "Sun", score: 67, baseline: 68 },
];

export const engagementData = [
  { week: "W1", login: 85, assignment: 90, participation: 78 },
  { week: "W2", login: 82, assignment: 85, participation: 72 },
  { week: "W3", login: 78, assignment: 75, participation: 65 },
  { week: "W4", login: 70, assignment: 68, participation: 58 },
  { week: "W5", login: 65, assignment: 60, participation: 52 },
  { week: "W6", login: 58, assignment: 55, participation: 48 },
];

export const classClimateData = [
  { name: "Emotional\nSafety", value: 72, fullMark: 100 },
  { name: "Engagement", value: 65, fullMark: 100 },
  { name: "Stress\nLevel", value: 45, fullMark: 100 },
  { name: "Resilience", value: 58, fullMark: 100 },
  { name: "Connection", value: 70, fullMark: 100 },
];

export const sleepData = [
  { day: "M", hours: 7.2, quality: 75 },
  { day: "T", hours: 6.1, quality: 55 },
  { day: "W", hours: 5.8, quality: 48 },
  { day: "T", hours: 6.5, quality: 62 },
  { day: "F", hours: 5.2, quality: 40 },
  { day: "S", hours: 8.5, quality: 82 },
  { day: "S", hours: 7.8, quality: 78 },
];

export const attendanceData = [
  { week: "W1", rate: 98, variability: 2 },
  { week: "W2", rate: 95, variability: 5 },
  { week: "W3", rate: 88, variability: 12 },
  { week: "W4", rate: 82, variability: 18 },
  { week: "W5", rate: 78, variability: 22 },
  { week: "W6", rate: 72, variability: 28 },
];

export const gradeTrajectoryData = [
  { month: "Sep", gpa: 3.6, trend: 3.5 },
  { month: "Oct", gpa: 3.5, trend: 3.5 },
  { month: "Nov", gpa: 3.3, trend: 3.5 },
  { month: "Dec", gpa: 3.1, trend: 3.5 },
  { month: "Jan", gpa: 2.8, trend: 3.5 },
  { month: "Feb", gpa: 2.6, trend: 3.5 },
];

export const effortPatternsData = [
  { subject: "Math", effort: 72, completion: 68, participation: 55 },
  { subject: "English", effort: 85, completion: 82, participation: 78 },
  { subject: "Science", effort: 45, completion: 42, participation: 38 },
  { subject: "History", effort: 68, completion: 65, participation: 60 },
  { subject: "Art", effort: 92, completion: 95, participation: 88 },
];

export const environmentalContext = {
  setting: "Urban",
  socioeconomic: "Mixed",
  schoolSize: "Large (1,200+)",
  classSize: 28,
  resourceAccess: 72,
  communitySupport: 65,
  transitTime: "25 min avg",
};

export const disengagementIndicators = [
  { indicator: "Screen Time Drop", value: 42, baseline: 75, trend: "declining" },
  { indicator: "Response Latency", value: 68, baseline: 45, trend: "increasing" },
  { indicator: "Help-Seeking", value: 28, baseline: 60, trend: "declining" },
  { indicator: "Peer Interaction", value: 35, baseline: 70, trend: "declining" },
  { indicator: "Task Switching", value: 82, baseline: 40, trend: "increasing" },
];

export const sociologicalPatterns = [
  { pattern: "Peer Network", current: 45, previous: 72, change: -27 },
  { pattern: "Group Work", current: 38, previous: 65, change: -27 },
  { pattern: "Extracurricular", current: 52, previous: 80, change: -28 },
  { pattern: "Lunch Social", current: 40, previous: 75, change: -35 },
  { pattern: "Online Presence", current: 62, previous: 58, change: 4 },
];

export interface Student {
  id: number;
  name: string;
  grade: string;
  mood: number;
  engagement: number;
  risk: "urgent" | "elevated" | "moderate" | "monitor";
  riskScore: number;
  trend: "declining" | "stable" | "improving";
  avatar: string;
  factors: string[];
  protective: string[];
  confidence: number;
}

export const students: Student[] = [
  { id: 1, name: "Emily Martinez", grade: "10th", mood: 42, engagement: 38, risk: "elevated", riskScore: 78, trend: "declining", avatar: "EM", factors: ["Sleep disruption", "Social withdrawal", "Grade decline"], protective: ["Strong family support", "Art club engagement"], confidence: 87 },
  { id: 2, name: "Josten Thompson", grade: "11th", mood: 55, engagement: 52, risk: "moderate", riskScore: 62, trend: "declining", avatar: "JT", factors: ["Attendance variability", "Mood volatility"], protective: ["Peer connections", "Athletic participation"], confidence: 74 },
  { id: 3, name: "Wi Evans", grade: "9th", mood: 61, engagement: 58, risk: "moderate", riskScore: 56, trend: "stable", avatar: "WE", factors: ["New student transition", "Low help-seeking"], protective: ["Academic strength", "Teacher rapport"], confidence: 69 },
  { id: 4, name: "Dani Garcia", grade: "12th", mood: 48, engagement: 45, risk: "elevated", riskScore: 71, trend: "declining", avatar: "DG", factors: ["Burnout indicators", "Perfectionism spiral", "Sleep decline"], protective: ["College acceptance", "Counselor relationship"], confidence: 82 },
  { id: 5, name: "Marcus Chen", grade: "10th", mood: 75, engagement: 82, risk: "monitor", riskScore: 28, trend: "improving", avatar: "MC", factors: ["Minor routine inconsistency"], protective: ["Strong peer group", "High self-regulation", "Family stability"], confidence: 91 },
];

export interface TierMetric {
  name: string;
  value: number;
  delta: number;
  trust: number;
  status: "critical" | "warning" | "stable";
}

export const tierMetrics: TierMetric[] = [
  { name: "Mood Baseline", value: 62, delta: -8, trust: 0.91, status: "warning" },
  { name: "Engagement Delta", value: -42, delta: -15, trust: 0.95, status: "critical" },
  { name: "Support Index", value: 7.8, delta: 0, trust: 0.88, status: "stable" },
];

export const views = [
  { id: "support", label: "Counselor Insights" },
  { id: "class", label: "Class Health" },
  { id: "student", label: "Student Wellbeing" },
] as const;

export type ViewId = typeof views[number]["id"];
