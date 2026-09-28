import type { Solution, UseCase, LearningTrack } from "./types.ts";
// Catalog descriptions and planning estimates originate in the supplied program brief.
// Availability, licensing, and commercial pricing are not verified by this application.
export const CATALOG: Solution[] = [
  {
    id: "meraki",
    name: "Meraki AI Ops Dashboard",
    category: "Networking",
    icon: "network",
    summary: "Turn network questions into clear answers and approved actions.",
    outcome:
      "Give operations teams one place to understand site health, investigate issues, and prepare network changes.",
    automations: [
      "Summarize health across sites",
      "Surface anomalies and configuration drift",
      "Prepare changes for human approval",
    ],
    products: ["Meraki", "MCP", "Ansible"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "meraki",
      "network",
      "site",
      "sites",
      "retail",
      "store",
      "stores",
      "branch",
      "outage",
      "wifi",
      "wi-fi",
      "configuration",
      "drift",
      "switch",
      "router",
    ],
    priorities: ["Save time", "Improve visibility"],
    industries: ["Retail", "Manufacturing", "Education"],
    requirements: [
      "Meraki Dashboard API access",
      "A pilot network and an operations owner",
      "Defined read and change permissions",
    ],
    questions: [
      "How many sites and networks are in scope?",
      "Which recurring task takes the most time?",
      "Who approves changes to a production network?",
    ],
    sales:
      "Start with the time spent checking sites and investigating repeat incidents. Show a health summary, then demonstrate a proposed change with approval.",
    pilot: "$150–400",
    production: "$600–1,500",
    onprem: "Existing VM + shared inference host",
    onpremRun: "≈$50/month power",
    whiteLabel: true,
    track: "Network Automation",
  },
  {
    id: "nso",
    name: "NSO AI Dashboard",
    category: "Networking",
    icon: "workflow",
    summary:
      "Translate service intent into a reviewable network configuration.",
    outcome:
      "Help engineers deliver consistent services and investigate service state across an NSO-managed network.",
    automations: [
      "Draft service configuration from intent",
      "Check service state and explain drift",
      "Prepare rollback steps for review",
    ],
    products: ["Cisco NSO", "NETCONF", "MCP"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "nso",
      "netconf",
      "orchestration",
      "rollback",
      "intent",
      "multivendor",
      "multi-vendor",
      "configuration",
      "service assurance",
    ],
    priorities: ["Save time", "Reduce risk"],
    industries: [],
    requirements: [
      "An accessible Cisco NSO instance",
      "Service models and a nonproduction test environment",
      "An engineer to validate generated changes",
    ],
    questions: [
      "Which NSO services and devices are in scope?",
      "Is there an existing service model?",
      "How are changes tested and rolled back today?",
    ],
    sales:
      "Find a repeatable service change that requires several manual steps. Demonstrate how an engineer can review the proposed configuration before applying it.",
    pilot: "$200–500",
    production: "$800–2,000",
    onprem: "Existing VM + shared inference host",
    onpremRun: "≈$50/month power",
    whiteLabel: true,
    track: "Network Automation",
  },
  {
    id: "mcp",
    name: "Cisco Platform MCP Tools",
    category: "Integration",
    icon: "plug",
    summary:
      "Connect an AI assistant to the Cisco tools your team already uses.",
    outcome:
      "Give assistants a consistent way to retrieve platform data and propose actions through scoped tools.",
    automations: [
      "Retrieve data across Cisco platforms",
      "Reuse packaged tools and runbooks",
      "Prepare approved actions from a conversation",
    ],
    products: ["MCP", "Catalyst Center", "ThousandEyes"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "mcp",
      "api",
      "apis",
      "integration",
      "integrations",
      "catalyst",
      "thousandeyes",
      "tools",
      "connectors",
      "assistant",
    ],
    priorities: ["Save time"],
    industries: [],
    requirements: [
      "API access to the selected platforms",
      "An MCP-compatible client",
      "Scoped service accounts and tool permissions",
    ],
    questions: [
      "Which systems need to exchange information?",
      "Which tasks should be read-only?",
      "Which client or agent will use the tools?",
    ],
    sales:
      "Ask which dashboards an engineer opens to answer one customer question. Position scoped tools as the connection between those systems and their assistant.",
    pilot: "$0–50",
    production: "$0–50",
    onprem: "Local process on an existing host",
    onpremRun: "No additional infrastructure estimate",
    whiteLabel: true,
    track: "Network Automation",
  },
  {
    id: "knowledge",
    name: "Partner Knowledge Bot",
    category: "Knowledge & service",
    icon: "book",
    summary:
      "Find answers in program documents, product information, and runbooks.",
    outcome:
      "Help sellers and engineers answer repeat questions using a curated collection of their own reference material.",
    automations: [
      "Search approved documents",
      "Draft answers with source references",
      "Surface information missing from the knowledge base",
    ],
    products: ["RAG", "Cisco 360", "pgvector"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "knowledge",
      "documents",
      "document",
      "docs",
      "search",
      "answers",
      "runbook",
      "runbooks",
      "pvi",
      "360",
      "sku",
      "rfp",
      "policies",
      "policy",
      "information",
    ],
    priorities: ["Save time", "Improve customer experience"],
    industries: ["Healthcare", "Financial services", "Government", "Education"],
    requirements: [
      "A curated document collection",
      "Document owners and access rules",
      "A process for updating and evaluating answers",
    ],
    questions: [
      "Which questions are repeated most often?",
      "Where is the authoritative information stored?",
      "Who may access each document collection?",
    ],
    sales:
      "Find the questions that slow down a quote or customer response. Show an answer with a document reference and make the knowledge owner part of discovery.",
    pilot: "$100–300",
    production: "$400–1,200",
    onprem: "Existing VM + pgvector + inference host",
    onpremRun: "≈$50/month",
    whiteLabel: true,
    track: "Private & Hybrid AI",
  },
  {
    id: "voice",
    name: "LiveKit Voice / Video Agent",
    category: "Knowledge & service",
    icon: "phone",
    summary: "Keep customer conversations moving, including after hours.",
    outcome:
      "Capture intent, answer defined questions, and hand customers to the right team through a voice or video agent.",
    automations: [
      "Capture caller needs and contact details",
      "Answer approved service questions",
      "Prepare call summaries and route handoffs",
    ],
    products: ["LiveKit", "SIP", "Webex Calling"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "voice",
      "video",
      "phone",
      "call",
      "calls",
      "calling",
      "receptionist",
      "after-hours",
      "after hours",
      "appointment",
      "appointments",
      "contact center",
      "missed calls",
      "patient",
      "patients",
      "clinic",
      "dental",
    ],
    priorities: ["Improve customer experience", "Grow revenue"],
    industries: ["Healthcare", "Retail", "Financial services"],
    requirements: [
      "Telephony or WebRTC access",
      "A defined conversation and human handoff flow",
      "Access to the systems used for each approved task",
    ],
    questions: [
      "Which calls should the agent handle?",
      "How many minutes and languages are expected?",
      "When should the agent transfer to a person?",
    ],
    sales:
      "Start with missed calls and the questions that occupy the front desk. Demonstrate a complete interaction and a clear handoff, then scope the system integrations.",
    pilot: "$150–400",
    production: "$500–3,000",
    onprem: "$2–5k media host + telephony",
    onpremRun: "$100–300/month",
    whiteLabel: true,
    track: "Webex Bots & Agents",
  },
  {
    id: "webex",
    name: "Webex Bot & Agent Kit",
    category: "Collaboration",
    icon: "message",
    summary: "Bring service requests and approvals into the conversation.",
    outcome:
      "Reduce the switching between chat, ticketing, and support tools during everyday work.",
    automations: [
      "Look up tickets from a conversation",
      "Prepare meeting summaries",
      "Route approvals and on-call notifications",
    ],
    products: ["Webex", "Webhooks", "MCP"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "webex",
      "meeting",
      "meetings",
      "summary",
      "summaries",
      "ticket",
      "tickets",
      "helpdesk",
      "on-call",
      "chat",
      "collaboration",
      "approvals",
    ],
    priorities: ["Save time", "Improve customer experience"],
    industries: [],
    requirements: [
      "A Webex bot and workspace",
      "Ticketing or workflow API access",
      "Defined notification and approval owners",
    ],
    questions: [
      "Which ticketing system is in use?",
      "Which actions belong in Webex?",
      "Who owns the approval or escalation?",
    ],
    sales:
      "Ask where a service request stalls between teams. Show ticket lookup and a decision in Webex, with the system of record still owning the workflow.",
    pilot: "$50–150",
    production: "$200–600",
    onprem: "Existing VM",
    onpremRun: "≈$20/month",
    whiteLabel: true,
    track: "Webex Bots & Agents",
  },
  {
    id: "splunk",
    name: "Splunk AI Integration Kit",
    category: "Security & observability",
    icon: "activity",
    summary: "Make operational data easier to query and act on.",
    outcome:
      "Help analysts investigate alerts, understand telemetry, and prepare runbook actions using Splunk data.",
    automations: [
      "Draft SPL from plain-language questions",
      "Summarize and group related alerts",
      "Prepare investigation notes and runbook actions",
    ],
    products: ["Splunk", "SPL", "MLTK"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "splunk",
      "spl",
      "telemetry",
      "log",
      "logs",
      "observability",
      "anomaly",
      "anomalies",
      "monitoring",
      "mltk",
    ],
    priorities: ["Improve visibility", "Save time"],
    industries: ["Manufacturing", "Financial services"],
    requirements: [
      "Splunk access and relevant data sources",
      "An analyst to validate SPL and investigations",
      "Approved runbooks for each action",
    ],
    questions: [
      "Which logs and alerts are available?",
      "Which investigations take the most time?",
      "Who validates generated SPL and runbook actions?",
    ],
    sales:
      "Find an investigation that requires an experienced SPL user. Show how an analyst can draft a query, validate the result, and prepare a case summary.",
    pilot: "$200–500",
    production: "$800–2,500",
    onprem: "Existing Splunk + inference host",
    onpremRun: "≈$50/month",
    whiteLabel: true,
    track: "Splunk Integration + AI",
  },
  {
    id: "security",
    name: "Security AI Ops Kit",
    category: "Security & observability",
    icon: "shield",
    summary: "Give the SOC a clearer starting point for every incident.",
    outcome:
      "Bring related security signals into an investigation brief and help analysts decide what to do next.",
    automations: [
      "Correlate signals across security tools",
      "Draft incident briefs and investigation steps",
      "Apply defined policies to agent actions",
    ],
    products: ["Cisco XDR", "ISE", "AI Defense"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "security",
      "soc",
      "xdr",
      "ise",
      "threat",
      "threats",
      "incident",
      "incidents",
      "triage",
      "alert",
      "alerts",
      "defense",
      "secure access",
    ],
    priorities: ["Reduce risk", "Improve visibility"],
    industries: ["Government", "Financial services", "Healthcare"],
    requirements: [
      "Access to the relevant security platforms",
      "An incident process and SOC owner",
      "A test environment and approved response actions",
    ],
    questions: [
      "Which security tools feed the SOC?",
      "Where do analysts lose time during triage?",
      "Which response actions need approval?",
    ],
    sales:
      "Lead with analyst workload and incomplete incident context. Show a concise investigation brief, then identify the sources and permissions required for a pilot.",
    pilot: "$250–600",
    production: "$1,000–3,000",
    onprem: "Existing SOC infrastructure + inference host",
    onpremRun: "≈$50/month",
    whiteLabel: true,
    track: "Security AI",
  },
  {
    id: "datacenter",
    name: "Data Center AI Kit",
    category: "Infrastructure",
    icon: "server",
    summary: "Plan AI infrastructure around the workloads it needs to run.",
    outcome:
      "Help teams understand infrastructure telemetry and prepare a workload-based AI capacity discussion.",
    automations: [
      "Summarize infrastructure telemetry",
      "Prepare GPU sizing inputs",
      "Draft a bill of materials for engineering review",
    ],
    products: ["UCS", "Nexus", "Intersight"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "ucs",
      "nexus",
      "intersight",
      "gpu",
      "gpus",
      "data center",
      "datacenter",
      "sizing",
      "bom",
      "nvidia",
      "capacity",
      "infrastructure",
    ],
    priorities: ["Improve visibility", "Grow revenue"],
    industries: ["Manufacturing", "Government"],
    requirements: [
      "Workload and concurrency assumptions",
      "Infrastructure telemetry access",
      "An engineer to validate sizing and the bill of materials",
    ],
    questions: [
      "Which models and workloads will run?",
      "What latency and concurrency are required?",
      "What compute, network, and storage already exist?",
    ],
    sales:
      "Move the discussion from buying a GPU to supporting a workload. Capture model size, concurrency, and data location before proposing a bill of materials.",
    pilot: "$150–400",
    production: "$600–1,500",
    onprem: "Existing VM",
    onpremRun: "≈$20/month",
    whiteLabel: true,
    track: "Data Center AI",
  },
  {
    id: "netdojo",
    name: "NetDojo Training Platform",
    category: "Enablement",
    icon: "graduation",
    summary: "Build engineering confidence through practice and hands-on labs.",
    outcome:
      "Give partners a structured way to develop networking and automation skills with practice, labs, and a partner-branded academy.",
    automations: [
      "Sequence relevant practice and labs",
      "Grade supported lab activities",
      "Track progress through a learning path",
    ],
    products: ["CML", "Cisco certifications", "Labs"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "netdojo",
      "cml",
      "ccna",
      "ccnp",
      "certification",
      "certifications",
      "certified",
      "training",
      "engineers",
      "engineer",
      "lab",
      "labs",
      "academy",
      "skills",
      "learn",
      "learning",
    ],
    priorities: ["Build team skills"],
    industries: ["Education"],
    requirements: [
      "A learner group and a defined learning goal",
      "CML capacity and applicable licenses for live labs",
      "An owner for the partner learning program",
    ],
    questions: [
      "Which skills or certifications are the goal?",
      "How many learners and concurrent labs are needed?",
      "How will progress be reviewed with the team?",
    ],
    sales:
      "Start with the skills missing from the partner practice. Demonstrate one complete lab and the learning path around it; confirm program requirements separately.",
    pilot: "$300–800",
    production: "$1,500–4,000",
    onprem: "CML host $3–10k + licenses",
    onpremRun: "$100–300/month",
    whiteLabel: true,
    track: "Network Automation",
  },
  {
    id: "salesdojo",
    name: "SalesDojo",
    category: "Enablement",
    icon: "target",
    summary:
      "Help sellers recognize an AI opportunity and ask better questions.",
    outcome:
      "Build sales confidence with relevant solution plays, discovery practice, and objection handling.",
    automations: [
      "Guide sellers through AI fundamentals",
      "Sequence scenario-based practice",
      "Help prepare a customer discovery conversation",
    ],
    products: ["Sales plays", "Scenario drills", "Discovery"],
    deployments: ["Cloud", "Hybrid", "On-premises"],
    keywords: [
      "salesdojo",
      "seller",
      "sellers",
      "sales",
      "objection",
      "objections",
      "discovery",
      "literacy",
      "pitch",
      "enablement",
      "reps",
      "rep",
    ],
    priorities: ["Build team skills", "Grow revenue"],
    industries: [],
    requirements: [
      "A seller group and a target customer profile",
      "Access to the NetDojo learning platform",
      "A manager to review practice and live-deal outcomes",
    ],
    questions: [
      "Which AI conversations do sellers struggle with?",
      "Which customer segments should the team focus on?",
      "What should a seller be able to do after training?",
    ],
    sales:
      "Position this as the first step for reps who need a credible AI conversation. Use one customer scenario and the discovery questions that lead to a scoped opportunity.",
    pilot: "Included in NetDojo",
    production: "Included in NetDojo",
    onprem: "Included in NetDojo",
    onpremRun: "Included in NetDojo",
    whiteLabel: true,
    track: "SalesDojo",
  },
  {
    id: "privateai",
    name: "Private AI Starter",
    category: "Infrastructure",
    icon: "lock",
    summary: "Create a shared foundation for private and hybrid AI workloads.",
    outcome:
      "Give multiple applications a common inference and retrieval layer with deployment choices around customer requirements.",
    automations: [
      "Route requests to approved models",
      "Provide shared local inference",
      "Connect applications to document retrieval",
    ],
    products: ["vLLM / Ollama", "LiteLLM", "pgvector"],
    deployments: ["Hybrid", "On-premises"],
    keywords: [
      "private",
      "hybrid",
      "on-prem",
      "on-premises",
      "local",
      "inference",
      "residency",
      "sovereign",
      "ollama",
      "vllm",
      "sensitive",
      "regulated",
      "phi",
      "pii",
    ],
    priorities: ["Reduce risk"],
    industries: ["Healthcare", "Government", "Financial services"],
    requirements: [
      "Model, workload, and data-location requirements",
      "Appropriate compute and storage",
      "An operations owner and a control design for the actual environment",
    ],
    questions: [
      "Which data must remain in which environment?",
      "What model quality and response time are required?",
      "Who will operate and maintain the inference layer?",
    ],
    sales:
      "Ask why a customer needs private deployment and which data is involved. Use those requirements to scope a shared foundation, rather than treating local hosting as a compliance claim.",
    pilot: "Not applicable",
    production: "Not applicable",
    onprem: "$8–25k single GPU / $25–80k AI POD",
    onpremRun: "$150–600/month power",
    whiteLabel: false,
    track: "Private & Hybrid AI",
  },
];

const USE_CASE_LINES = [
  {
    line: "Meraki",
    icon: "network",
    deliverable: "Branch and site operations assistant",
    problem:
      "distributed sites need a faster way to see health, investigate issues, and standardize changes",
    automation:
      "site health summaries, anomaly triage, and approval-ready network changes",
    systems: "Meraki Dashboard, service desk, identity, and notification tools",
    keywords: ["meraki", "branch", "site", "wifi", "store", "location"],
  },
  {
    line: "Catalyst Center",
    icon: "network",
    deliverable: "Campus network assurance workflow",
    problem:
      "campus teams spend too much time moving between assurance views and device details",
    automation:
      "client and device health summaries, issue correlation, and guided remediation",
    systems: "Catalyst Center, ITSM, identity, and change management",
    keywords: [
      "catalyst",
      "campus",
      "assurance",
      "switch",
      "wireless",
      "device",
    ],
  },
  {
    line: "Cisco NSO",
    icon: "workflow",
    deliverable: "Intent-based service orchestration",
    problem:
      "service changes are repeated manually across devices and are difficult to review consistently",
    automation:
      "intent capture, service configuration drafts, validation, and rollback guidance",
    systems: "NSO, service models, inventory, and change management",
    keywords: [
      "nso",
      "orchestration",
      "intent",
      "service",
      "multivendor",
      "rollback",
    ],
  },
  {
    line: "Webex",
    icon: "message",
    deliverable: "Collaboration and workflow assistant",
    problem:
      "requests, approvals, and knowledge are scattered across meetings, messages, and service queues",
    automation:
      "meeting summaries, ticket lookup, approvals, and routed notifications",
    systems: "Webex, ticketing, calendars, CRM, and knowledge sources",
    keywords: [
      "webex",
      "meeting",
      "chat",
      "approval",
      "helpdesk",
      "collaboration",
    ],
  },
  {
    line: "Webex Calling",
    icon: "phone",
    deliverable: "Voice intake and customer handoff",
    problem:
      "front-line teams miss calls or spend time capturing the same information repeatedly",
    automation:
      "intent capture, approved answers, scheduling intake, summaries, and human handoff",
    systems: "Webex Calling or SIP, CRM, scheduling, and knowledge sources",
    keywords: [
      "calling",
      "voice",
      "phone",
      "contact center",
      "after hours",
      "handoff",
    ],
  },
  {
    line: "Splunk",
    icon: "activity",
    deliverable: "Operations and security investigation assistant",
    problem:
      "analysts need experienced people to turn telemetry and alerts into an actionable starting point",
    automation:
      "plain-language query drafting, alert grouping, investigation briefs, and runbook suggestions",
    systems: "Splunk, data sources, ITSM, and approved runbooks",
    keywords: ["splunk", "alert", "logs", "telemetry", "observability", "spl"],
  },
  {
    line: "Cisco Security",
    icon: "shield",
    deliverable: "Security operations triage workflow",
    problem:
      "security teams need better incident context before they decide what to investigate or contain",
    automation:
      "signal correlation, incident briefs, guided triage, and response approvals",
    systems: "Cisco XDR, Secure Access, ISE, endpoint, and ITSM",
    keywords: ["security", "soc", "xdr", "ise", "incident", "threat", "access"],
  },
  {
    line: "ThousandEyes",
    icon: "activity",
    deliverable: "Digital experience monitoring workflow",
    problem:
      "teams cannot quickly explain whether a customer experience issue is local, provider-related, or application-related",
    automation:
      "path summaries, outage correlation, experience alerts, and stakeholder updates",
    systems: "ThousandEyes, service desk, cloud, and application telemetry",
    keywords: [
      "thousandeyes",
      "internet",
      "path",
      "provider",
      "experience",
      "outage",
      "saas",
    ],
  },
  {
    line: "Cisco Data Center",
    icon: "server",
    deliverable: "Data center capacity and operations assistant",
    problem:
      "infrastructure decisions are made across disconnected telemetry, inventory, and workload data",
    automation:
      "capacity summaries, incident context, workload mapping, and change preparation",
    systems: "UCS, Nexus, Intersight, storage, and ITSM",
    keywords: [
      "ucs",
      "nexus",
      "intersight",
      "data center",
      "datacenter",
      "capacity",
      "server",
    ],
  },
  {
    line: "Private and Hybrid AI",
    icon: "lock",
    deliverable: "Private AI foundation and governance workflow",
    problem:
      "customers need useful AI while controlling data location, model routing, and operating responsibilities",
    automation:
      "approved model routing, retrieval, prompt controls, and usage reporting",
    systems: "vLLM or Ollama, LiteLLM, pgvector, identity, and logging",
    keywords: [
      "private",
      "hybrid",
      "local",
      "inference",
      "data residency",
      "governance",
      "regulated",
    ],
  },
];
const USE_CASE_VERTICALS = [
  {
    name: "Healthcare",
    context:
      "protect patient and operational information while improving staff response time",
  },
  {
    name: "Retail",
    context:
      "support many locations, associates, and customer interactions with consistent operations",
  },
  {
    name: "Manufacturing",
    context:
      "connect plant, warehouse, and corporate operations without losing operational context",
  },
  {
    name: "Financial services",
    context:
      "improve service and investigation workflows with clear controls and auditability",
  },
  {
    name: "Government",
    context:
      "support public services and distributed teams with approved data and change processes",
  },
  {
    name: "Education",
    context:
      "help campus teams, faculty, and learners work across limited resources and varied skill levels",
  },
  {
    name: "Professional services",
    context:
      "make project delivery, client support, and internal knowledge easier to scale",
  },
  {
    name: "Hospitality",
    context:
      "keep guest, property, and front-line operations responsive across locations",
  },
];
const CORE_USE_CASES = USE_CASE_LINES.flatMap((product, productIndex) =>
  USE_CASE_VERTICALS.map((vertical, verticalIndex) => ({
    id: `uc-${productIndex + 1}-${verticalIndex + 1}`,
    productLine: product.line,
    vertical: vertical.name,
    icon: product.icon,
    deliverable: `${product.deliverable} for ${vertical.name}`,
    title: `${vertical.name}: ${product.deliverable}`,
    problem: `${vertical.context}. The team says ${product.problem}.`,
    automation: `${product.automation}.`,
    outcome: `A repeatable ${product.deliverable.toLowerCase()} that gives the team a clear starting point and a human review step.`,
    systems: product.systems,
    keywords: [
      ...product.keywords,
      vertical.name.toLowerCase(),
      product.line.toLowerCase(),
    ],
    discovery: [
      `What ${vertical.name.toLowerCase()} workflow has the clearest owner and measurable delay?`,
      `Which ${product.line} data and systems are authoritative today?`,
      "Which actions require approval, audit, or a handoff to a person?",
    ],
  })),
);

// LiveKit playbooks are explicit, turnkey outcomes rather than project names.
// Each can be packaged for multiple industries with SIP/WebRTC, an LLM, approved tools,
// a human handoff, and a transcript/CRM event trail.
const LIVEKIT_PLAYBOOKS = [
  {
    line: "LiveKit Voice Agents",
    name: "24/7 inbound AI receptionist",
    problem: "callers wait or abandon when the front desk is busy or closed",
    automation:
      "answer calls, identify intent, answer approved FAQs, capture contact details, and route or transfer",
    systems: "LiveKit SIP/WebRTC, telephony, CRM, calendar, knowledge base",
    keys: ["inbound", "receptionist", "after hours", "faq", "front desk"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Outbound campaign agent",
    problem:
      "teams cannot make every confirmation, follow-up, or reactivation call",
    automation:
      "run an approved call list, personalize the opening, capture disposition, and schedule the next action",
    systems: "LiveKit SIP, CRM/campaign list, business rules, SMS/email",
    keys: ["outbound", "campaign", "follow-up", "reactivation", "dialer"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Appointment scheduling agent",
    problem: "staff spend the day exchanging calls to find an available slot",
    automation:
      "collect service, location, provider, language, and time preference, then book or request a human review",
    systems: "LiveKit, scheduling API, CRM/EHR, identity, SMS/email",
    keys: ["schedule", "scheduling", "appointment", "booking", "calendar"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Reschedule and cancellation agent",
    problem: "schedule changes create phone queues and unused capacity",
    automation:
      "verify the caller, cancel or move the booking, explain policy, and trigger a confirmation",
    systems: "LiveKit, scheduling system, policy knowledge, SMS/email",
    keys: ["reschedule", "cancel", "cancellation", "appointment"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Waitlist backfill agent",
    problem: "last-minute cancellations leave valuable capacity unused",
    automation:
      "rank eligible contacts, call or text them, offer the slot, and update the waitlist after consent",
    systems: "LiveKit, waitlist/CRM, scheduling, SMS, audit log",
    keys: ["waitlist", "backfill", "cancellation", "open slot"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Recall and reactivation agent",
    problem: "overdue customers or patients disappear from recall lists",
    automation:
      "work a segmented list, explain the reason for outreach, book the next step, and record outcome",
    systems: "LiveKit, CRM/EHR, recall list, scheduling, SMS/email",
    keys: ["recall", "reactivation", "overdue", "follow-up"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "No-show prevention and confirmation agent",
    problem: "unconfirmed bookings become expensive no-shows",
    automation:
      "send multilingual reminders, collect confirmation, offer reschedule, and flag risk for staff",
    systems: "LiveKit, scheduling, CRM/EHR, SMS/email, analytics",
    keys: ["no-show", "confirmation", "reminder", "attendance"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Lead qualification agent",
    problem: "new inquiries reach sellers without enough context to act",
    automation:
      "ask qualification questions, score fit, capture consent, and create a complete CRM lead",
    systems: "LiveKit, CRM, forms, routing rules, calendar",
    keys: ["lead", "qualification", "prospect", "inquiry", "crm"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Missed-call recovery agent",
    problem: "a missed call is often a lost opportunity",
    automation:
      "call back quickly, identify the request, recover the lead or service ticket, and hand off when needed",
    systems: "LiveKit outbound, call history, CRM/ticketing, SMS",
    keys: ["missed call", "callback", "lost lead", "recovery"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Quote and estimate intake agent",
    problem:
      "estimators receive incomplete information and spend time on basic discovery",
    automation:
      "capture scope, site details, photos or documents, budget, and preferred appointment",
    systems: "LiveKit, CRM, quoting, forms/uploads, calendar",
    keys: ["quote", "estimate", "scope", "budget", "intake"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Dispatch and service-intake agent",
    problem: "dispatchers repeat the same troubleshooting and triage questions",
    automation:
      "identify account, classify urgency, run approved troubleshooting, and create or schedule a job",
    systems: "LiveKit, field service, CRM, knowledge, maps",
    keys: ["dispatch", "service call", "work order", "triage", "field service"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Order and case status agent",
    problem:
      "customers call for updates that already exist in a system of record",
    automation:
      "verify identity, look up status, explain the next milestone, and escalate exceptions",
    systems: "LiveKit, ERP/order system, CRM, ticketing, identity",
    keys: ["status", "order", "case", "shipment", "tracking"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Payment and renewal reminder agent",
    problem: "manual reminders delay collections and renewals",
    automation:
      "deliver a compliant reminder, confirm intent, send a secure payment link, or route to staff",
    systems: "LiveKit, billing/CRM, payment link, policy store, audit log",
    keys: ["payment", "renewal", "collections", "invoice", "billing"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Survey and feedback agent",
    problem: "teams do not hear from enough customers after an interaction",
    automation:
      "run a short voice survey, detect sentiment or urgency, and create follow-up tasks",
    systems: "LiveKit, survey store, CRM, analytics, ticketing",
    keys: ["survey", "feedback", "nps", "satisfaction", "sentiment"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Voicemail-to-email and call-summary agent",
    problem: "important calls are trapped in voicemail or long transcripts",
    automation:
      "transcribe, summarize, extract actions, classify urgency, and deliver to an owner",
    systems: "LiveKit, transcription, email, CRM/ITSM, notification",
    keys: ["voicemail", "transcript", "summary", "email", "action items"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Warm transfer and escalation agent",
    problem:
      "automation fails when a caller reaches an exception or sensitive request",
    automation:
      "recognize transfer conditions, pass a concise context packet, and keep the caller informed",
    systems: "LiveKit SIP, Webex Calling/contact center, CRM, transcript store",
    keys: ["transfer", "handoff", "escalation", "human", "supervisor"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Bilingual and multilingual front desk",
    problem: "language mismatch causes repeat calls and poor access",
    automation:
      "detect language, continue in the caller’s language, translate key fields, and route with context",
    systems:
      "LiveKit, speech-to-text/text-to-speech, CRM, translation, scheduling",
    keys: ["bilingual", "multilingual", "spanish", "arabic", "translation"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Account verification and consent capture",
    problem: "staff cannot safely act without confirming identity and consent",
    automation:
      "ask approved verification questions, capture consent, and record an auditable event before tools run",
    systems: "LiveKit, identity/CRM, policy engine, audit log",
    keys: ["identity", "verification", "consent", "authentication", "privacy"],
  },
  {
    line: "LiveKit Voice Agents",
    name: "Proactive notification and status call",
    problem: "teams spend hours calling customers about routine changes",
    automation:
      "announce outages, arrivals, results, recalls, or schedule changes and capture acknowledgement",
    systems: "LiveKit outbound, event bus, CRM, SMS/email, analytics",
    keys: ["notification", "outage", "arrival", "results", "broadcast"],
  },
  {
    line: "LiveKit Video Agents",
    name: "Web video concierge and virtual demo",
    problem:
      "buyers need an interactive explanation before they will book time with a seller",
    automation:
      "present approved content, answer questions, capture contact, recommend a solution, and schedule follow-up",
    systems: "LiveKit WebRTC, avatar/video UI, CRM, demo library, calendar",
    keys: ["video", "avatar", "virtual demo", "webrtc", "concierge"],
  },
  {
    line: "LiveKit Video Agents",
    name: "Visual guided support session",
    problem:
      "a voice-only conversation cannot resolve a visual setup or troubleshooting issue",
    automation:
      "share camera or screen, guide approved steps, annotate the issue, and escalate with a recording or summary",
    systems: "LiveKit WebRTC, screen share, knowledge, ticketing, transcript",
    keys: [
      "visual support",
      "screen share",
      "camera",
      "troubleshooting",
      "remote assist",
    ],
  },
  {
    line: "LiveKit Voice + Video",
    name: "Shared conversation memory across channels",
    problem:
      "a customer repeats the same story when moving from web to phone or human support",
    automation:
      "persist consented summary, entities, and next actions so the next agent starts informed",
    systems: "LiveKit, CRM, event bus, transcript store, identity",
    keys: ["omnichannel", "memory", "conversation", "context", "crm"],
  },
  {
    line: "LiveKit Voice + Video",
    name: "Agent quality and operations dashboard",
    problem:
      "leaders cannot see containment, transfer reasons, or failed automations",
    automation:
      "measure call outcomes, latency, language, handoffs, tool errors, and customer sentiment",
    systems: "LiveKit telemetry, warehouse, CRM, observability, dashboards",
    keys: ["analytics", "quality", "latency", "containment", "observability"],
  },
];
const VOICE_VERTICALS = [
  {
    name: "Healthcare",
    context:
      "patients need fast, privacy-aware access to clinics and care teams",
    keys: ["patient", "clinic", "healthcare", "medical", "provider"],
  },
  {
    name: "Dental",
    context:
      "practices need to keep chairs full while the front desk serves patients in person",
    keys: ["dental", "dentist", "hygiene", "operatory", "recall"],
  },
  {
    name: "HVAC & home services",
    context:
      "homeowners need a fast answer, accurate triage, and a dependable arrival window",
    keys: ["hvac", "plumbing", "electrician", "home service", "dispatch"],
  },
  {
    name: "Real estate",
    context:
      "buyers and sellers expect immediate answers and a convenient showing or valuation",
    keys: ["real estate", "realtor", "listing", "showing", "property"],
  },
  {
    name: "Law firms",
    context:
      "prospective clients need a respectful intake and a clear next step without exposing sensitive data",
    keys: ["law", "legal", "case", "consultation", "attorney"],
  },
  {
    name: "Retail & e-commerce",
    context:
      "shoppers want instant order help, returns support, and store-level service",
    keys: ["retail", "ecommerce", "order", "returns", "store"],
  },
  {
    name: "Financial services",
    context:
      "members need responsive service with identity, policy, and audit controls",
    keys: ["bank", "credit union", "finance", "member", "account"],
  },
  {
    name: "Education",
    context:
      "students, families, and applicants need answers across admissions and support queues",
    keys: ["school", "university", "student", "admissions", "campus"],
  },
  {
    name: "Construction",
    context:
      "project teams coordinate bids, vendors, crews, and safety updates across the field",
    keys: ["construction", "bid", "subcontractor", "jobsite", "safety"],
  },
  {
    name: "Hospitality",
    context:
      "guests expect immediate reservation, arrival, and property support",
    keys: ["hotel", "guest", "reservation", "property", "hospitality"],
  },
  {
    name: "Manufacturing",
    context:
      "plants and suppliers need reliable service coordination without slowing production",
    keys: ["plant", "maintenance", "supplier", "manufacturing", "production"],
  },
  {
    name: "Government & public services",
    context:
      "residents need accessible, multilingual help across high-volume service lines",
    keys: ["citizen", "public service", "government", "permit", "benefits"],
  },
];
const LIVEKIT_USE_CASES = LIVEKIT_PLAYBOOKS.flatMap((playbook, pIndex) =>
  VOICE_VERTICALS.map((vertical, vIndex) => ({
    id: `livekit-${pIndex + 1}-${vIndex + 1}`,
    productLine: playbook.line,
    vertical: vertical.name,
    icon: playbook.line.includes("Video") ? "video" : "phone",
    deliverable: `${playbook.name} for ${vertical.name}`,
    title: `${vertical.name}: ${playbook.name}`,
    problem: `${vertical.context}; ${playbook.problem}.`,
    automation: `${playbook.automation}.`,
    outcome: `A turnkey LiveKit workflow with a defined conversation, approved tool actions, transcript/event trail, and human fallback.`,
    systems: playbook.systems,
    keywords: [
      ...playbook.keys,
      ...vertical.keys,
      "livekit",
      "agent",
      "voice",
      "video",
    ],
    discovery: [
      `Which ${vertical.name.toLowerCase()} calls or sessions should be automated first?`,
      `What system is authoritative for the data this agent must read or update?`,
      "What identity, consent, language, escalation, and audit rules must be enforced?",
    ],
  })),
);

const HEALTHCARE_USE_CASES = (
  [
    [
      "LLM patient scheduling agent",
      "schedule, reschedule, or cancel visits from a natural conversation",
      "EHR or practice-management calendar, identity, SMS/email",
      ["scheduling", "patient", "provider", "visit"],
    ],
    [
      "Inbound patient access agent",
      "answer common questions, capture reason for visit, and route to the right team",
      "LiveKit SIP, EHR/CRM, knowledge base, scheduling",
      ["inbound", "patient access", "triage", "medical"],
    ],
    [
      "Outbound appointment confirmation agent",
      "confirm visits, offer reschedule, and send open slots to patients who cannot attend",
      "LiveKit outbound, scheduling, SMS, waitlist",
      ["confirmation", "outbound", "appointment"],
    ],
    [
      "Waitlist backfill agent",
      "fill a canceled slot by calling or texting eligible patients in priority order",
      "waitlist, scheduling, LiveKit, audit log",
      ["waitlist", "backfill", "cancellation"],
    ],
    [
      "Recall and reactivation agent",
      "bring overdue preventive, hygiene, or follow-up patients back onto the schedule",
      "EHR/CRM recall lists, LiveKit, calendar, SMS",
      ["recall", "reactivation", "overdue"],
    ],
    [
      "Patient identity and consent workflow",
      "verify the caller and capture consent before any protected workflow runs",
      "identity service, EHR, policy engine, audit log",
      ["identity", "consent", "privacy"],
    ],
    [
      "Insurance capture and pre-verification intake",
      "collect payer, member, group, subscriber, and visit details before staff verify eligibility",
      "LiveKit, practice management, payer/MCP workflow, CRM",
      ["insurance", "payer", "eligibility", "member"],
    ],
    [
      "Medicaid eligibility and PCP validation intake",
      "collect the fields needed to validate Medicaid coverage and primary-care assignment",
      "payer eligibility service, EHR, MCP, audit log",
      ["medicaid", "pcp", "eligibility"],
    ],
    [
      "Provider preference and visit-reason intake",
      "capture preferred clinician, location, language, and reason for visit before booking",
      "LiveKit, EHR, scheduling, routing rules",
      ["provider preference", "visit reason", "language"],
    ],
    [
      "Bilingual patient front desk",
      "serve English and Spanish callers with translated fields and a context-rich handoff",
      "LiveKit, speech services, EHR/CRM, scheduling",
      ["bilingual", "spanish", "front desk"],
    ],
    [
      "No-show mitigation workflow",
      "remind high-risk patients, collect confirmation, and offer a lower-friction reschedule",
      "LiveKit outbound, scheduling, SMS, analytics",
      ["no-show", "reminder", "confirmation"],
    ],
    [
      "Voicemail-to-email clinical admin summary",
      "transcribe a voicemail, extract callback intent, and route a concise summary to staff",
      "LiveKit, transcription, email, EHR/CRM",
      ["voicemail", "summary", "callback"],
    ],
    [
      "Referral intake and routing agent",
      "capture referral details and route to the right specialty or authorization queue",
      "LiveKit, referral work queue, EHR, CRM",
      ["referral", "specialty", "authorization"],
    ],
    [
      "Prescription and refill request intake",
      "capture refill requests and route them for licensed staff review without making clinical decisions",
      "LiveKit, EHR, pharmacy workflow, audit log",
      ["prescription", "refill", "pharmacy"],
    ],
    [
      "Post-visit follow-up and survey agent",
      "check on the next step, collect feedback, and flag urgent callbacks for staff",
      "LiveKit, EHR/CRM, survey, ticketing",
      ["follow-up", "survey", "feedback"],
    ],
    [
      "Dental hygiene block fill agent",
      "fill 90-minute hygiene or NP blocks from recall and waitlist contacts",
      "Open Dental/practice management, LiveKit, scheduling, SMS",
      ["dental", "hygiene", "90-minute", "operatory"],
    ],
    [
      "Dental membership plan inquiry agent",
      "explain approved membership-plan basics and schedule a conversation with the practice",
      "LiveKit, practice-management, knowledge, CRM",
      ["dental", "membership plan", "front desk"],
    ],
    [
      "Dental treatment-plan follow-up agent",
      "follow up on accepted or pending treatment plans and schedule the next visit",
      "practice-management, CRM, LiveKit, calendar",
      ["dental", "treatment plan", "follow-up"],
    ],
    [
      "Dental recall contact cleanup agent",
      "identify recall records missing a usable contact path and create a staff work queue",
      "Open Dental/QuestDent, CRM, enrichment queue, audit log",
      ["dental", "recall", "contact data"],
    ],
  ] satisfies [string, string, string, string[]][]
).map(([name, automation, systems, keys], index) => ({
  id: `healthcare-${index + 1}`,
  productLine: "Healthcare & Dental AI Access",
  vertical: name.startsWith("Dental") ? "Dental" : "Healthcare",
  icon: "phone",
  deliverable: name,
  title: `${name}`,
  problem: `The care team needs a repeatable way to ${automation.toLowerCase()}.`,
  automation: `${automation}.`,
  outcome:
    "A ready-to-scope patient access workflow with explicit human review for clinical, financial, or exception decisions.",
  systems,
  keywords: [...keys, "healthcare", "medical", "livekit", "agent"],
  discovery: [
    "Which practice-management or EHR system is authoritative?",
    "Which actions are safe to automate versus requiring licensed or front-desk review?",
    "Which languages, consent, and escalation rules must be tested?",
  ],
}));

export const USE_CASES: UseCase[] = [
  ...CORE_USE_CASES,
  ...LIVEKIT_USE_CASES,
  ...HEALTHCARE_USE_CASES,
];
export const PRODUCT_LINES = [
  "All product lines",
  ...new Set(USE_CASES.map((s) => s.productLine)),
];
export const VERTICALS = [
  "All verticals",
  ...new Set(USE_CASES.map((s) => s.vertical)),
];
export const CATEGORIES = [
  "All solutions",
  ...new Set(CATALOG.map((s) => s.category)),
];
export const INDUSTRIES = [
  "Any industry",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Financial services",
  "Government",
  "Education",
];
export const PRIORITIES = [
  "Find the right starting point",
  "Save time",
  "Improve customer experience",
  "Improve visibility",
  "Reduce risk",
  "Build team skills",
  "Grow revenue",
];
export const EXAMPLES = [
  {
    title: "Too many sites. Too much manual work.",
    label: "Network operations",
    icon: "network",
    industry: "Retail",
    priority: "Save time",
    text: "Our retail customer has 40 Meraki sites. Engineers check each dashboard manually and spend hours investigating repeat outages. We want a consolidated view and approved configuration changes.",
  },
  {
    title: "Every missed call is a missed opportunity.",
    label: "Customer experience",
    icon: "phone",
    industry: "Healthcare",
    priority: "Improve customer experience",
    text: "A healthcare customer misses calls after hours. They need a voice agent to answer common questions, capture appointment requests, and hand off to the front desk.",
  },
  {
    title: "Build the skills to deliver AI.",
    label: "Partner enablement",
    icon: "graduation",
    industry: "Any industry",
    priority: "Build team skills",
    text: "We have four network engineers who need hands-on CML labs and CCNA automation practice. Our sales reps also need help with AI discovery questions and objections.",
  },
];

export const TRACKS: LearningTrack[] = [
  {
    title: "Network Automation",
    products: "Meraki · Catalyst Center · NSO",
    icon: "network",
    sales: "Why automation is an AI conversation; one customer story and demo.",
    technical: "REST, NETCONF, Ansible, and Terraform with network API labs.",
    builder:
      "Deploy a network kit and write a scoped MCP tool with an approval step.",
  },
  {
    title: "Webex Bots & Agents",
    products: "Webex APIs · Webex Calling",
    icon: "message",
    sales: "Summaries, approvals, helpdesk, and after-hours coverage.",
    technical: "Bot frameworks, webhooks, and voice integration.",
    builder: "Connect a Webex bot or LiveKit agent to a ticketing workflow.",
  },
  {
    title: "Splunk Integration + AI",
    products: "ES · Observability · MLTK",
    icon: "activity",
    sales: "Show where operational data adds value to an AI use case.",
    technical: "Ingestion, SPL, MLTK, and XDR integration patterns.",
    builder:
      "Build natural-language query assistance and alert triage with reviewed runbook actions.",
  },
  {
    title: "Security AI",
    products: "XDR · Secure Access · ISE · AI Defense",
    icon: "shield",
    sales: "AI-assisted SOC work and protecting AI applications.",
    technical: "Alert correlation, threat modeling, and application controls.",
    builder: "Build a security operations pilot and test agent policies.",
  },
  {
    title: "Data Center AI",
    products: "UCS · Nexus · Intersight · NVIDIA",
    icon: "server",
    sales: "Connect infrastructure decisions to an AI workload.",
    technical: "GPU sizing, storage, telemetry, and inference networking.",
    builder:
      "Create a workload-based infrastructure plan and private inference pilot.",
  },
  {
    title: "Private & Hybrid AI",
    products: "vLLM · LiteLLM · pgvector",
    icon: "lock",
    sales: "Explain deployment choices using customer requirements.",
    technical: "Local inference, routing, retrieval, and operating costs.",
    builder: "Stand up a shared inference layer and connect a solution kit.",
  },
  {
    title: "Industry solution plays",
    products: "Healthcare · Retail · SLED · Manufacturing",
    icon: "building",
    sales: "Start with a concrete customer problem in the chosen industry.",
    technical: "Identify systems, data, and operational requirements.",
    builder: "Scope and demonstrate a use case using the relevant kit.",
  },
  {
    title: "SalesDojo",
    products: "Discovery · Objections · Scenario drills",
    icon: "target",
    sales:
      "AI fundamentals, six solution plays, discovery, and objection handling.",
    technical: "Practice identifying when a solutions architect should join.",
    builder:
      "Bring one customer scenario and prepare a scoped opportunity brief.",
  },
];

export const LITERACY = [
  [
    "LLM fundamentals",
    "Tokens, context, and hallucination",
    "Everyone",
    "45 min",
  ],
  [
    "Prompt engineering",
    "Instructions, structured output, and prompt libraries",
    "Everyone",
    "60 min",
  ],
  [
    "Python for APIs",
    "Python, FastAPI, and a Cisco API call",
    "Builder",
    "1 day",
  ],
  [
    "APIs and authentication",
    "REST, OAuth, rate limits, and webhooks",
    "Technical",
    "3 hr",
  ],
  [
    "MCP tools",
    "Use Cisco tools and build one scoped tool",
    "Technical",
    "4 hr",
  ],
  [
    "Agent skills",
    "Package a repeatable runbook as a skill",
    "Technical",
    "2 hr",
  ],
  [
    "Agents and retrieval",
    "Tool loops, retrieval, and evaluation",
    "Builder",
    "1 day",
  ],
  [
    "Private and public AI",
    "Deployment options and tradeoffs",
    "Everyone",
    "45 min",
  ],
  [
    "Model selection",
    "Match the task, requirements, and cost",
    "Technical",
    "60 min",
  ],
  [
    "Working with data",
    "Access, data handling, and retention",
    "Everyone",
    "45 min",
  ],
  [
    "AI security",
    "Prompt injection, tool abuse, and controls",
    "Technical",
    "3 hr",
  ],
  [
    "Shipping and operating",
    "Deployment, monitoring, and cost",
    "Builder",
    "4 hr",
  ],
];
