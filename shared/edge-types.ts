export type WorkspacePerspective =
  "partner" | "sales" | "practice_leader" | "admin";

export type EdgePillar =
  "home" | "engage" | "develop" | "grow" | "extend" | "admin";

export interface EdgeJourneyProgress {
  pillar: EdgePillar;
  title: string;
  stage: string;
  progressPercent: number;
  pviScore?: number;
  pviTarget?: number;
  pviGap?: string;
  nextAction: string;
  nextActionRoute: string;
}

export interface InboxItem {
  id: string;
  type: "approval" | "agent_run" | "renewal" | "eol" | "pvi" | "learning";
  title: string;
  subtitle: string;
  description: string;
  source: string;
  timestamp: string;
  freshness: "fresh" | "aging" | "stale";
  freshnessLabel: string;
  priority: "high" | "medium" | "low";
  status: "unread" | "read" | "done" | "snoozed";
  actionRequired?: boolean;
  approvalDetails?: {
    agentName: string;
    actionType: string;
    rationale: string;
    impact: string;
    reversibility:
      "Reversible" | "Hard gate (writes upstream)" | "Requires vendor approval";
    beforeText: string;
    afterText: string;
    decision?: "approved" | "rejected" | "pending";
    reviewNote?: string;
  };
}

export interface CustomerInstallBaseItem {
  id: string;
  serial: string;
  pid: string;
  family: string;
  site: string;
  ldos: string;
  contract: string;
  status: "Covered" | "Expiring" | "Uncovered";
}

export interface Customer360 {
  id: string;
  company: string;
  guName: string;
  guId: string;
  healthScore: number;
  healthBand: "Stalled" | "At Risk" | "In Progress";
  activeEa: boolean;
  eaTrueForwardEstimate: string;
  lastSync: string;
  freshnessLabel: string;
  tags: string[];
  installBase: CustomerInstallBaseItem[];
  merakiDevices: number;
  webexLicenses: number;
  openOpportunityCards: Array<{
    id: string;
    title: string;
    category: "Renewal" | "EoL Refresh" | "Security Attach" | "EA Expansion";
    value: string;
    evidence: string;
    status: "New" | "In Playbook" | "Dismissed";
  }>;
  playbooks: Array<{
    id: string;
    title: string;
    stage: string;
    totalTasks: number;
    completedTasks: number;
  }>;
}

export interface CourseClassInstance {
  id: string;
  date: string;
  modality: "Self-paced" | "Video" | "SCORM" | "Webinar" | "Instructor-led";
  instructor: string;
  seatsLeft: number;
  classPrice: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  pillar: "Engage" | "Develop" | "Grow" | "Extend";
  portfolio:
    | "Networking"
    | "Security"
    | "Collaboration"
    | "Cloud and AI Infrastructure"
    | "Services"
    | "Splunk";
  format: "Self-paced" | "Video" | "SCORM" | "Webinar" | "ILT";
  registrationModel: "quick" | "order" | "funded" | "none";
  coursePrice: string;
  eventPrice: string;
  duration: string;
  pviDimension: string;
  pviImpact: string;
  description: string;
  isRegistered?: boolean;
  classes: CourseClassInstance[];
}

export interface VirtualLab {
  id: string;
  title: string;
  topology: string;
  category: string;
  devices: string[];
  durationHours: number;
  state: "stopped" | "provisioning" | "running" | "idle";
  serverStatus: "Off (Saved)" | "Waking (Booting)" | "Active" | "Idle Standby";
  idleMinutesRemaining?: number;
  scheduledTime?: string;
  consoleUrl?: string;
}

export interface Citation {
  pillText: string;
  source: string;
  passage: string;
}

export interface ProgramQuestion {
  id: string;
  question: string;
  category: string;
  answer: string;
  citations: Citation[];
  verifiedDate: string;
  freshness: string;
}

export interface AgentControl {
  id: string;
  name: string;
  role: string;
  autonomy: "Observe & Suggest" | "Supervised" | "Autonomous";
  runsTotal: number;
  approvalRate: string;
  lastRunOutcome: string;
  isPaused: boolean;
  allowedTools: string[];
}
