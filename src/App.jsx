import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  Folder,
  Globe,
  Layers3,
  LayoutGrid,
  List,
  Lock,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  ThumbsUp,
  Trash2,
  Upload,
  User,
  Users,
  X,
  Rss,
} from "lucide-react";
import { categoryMeta } from "./data/mockAgents.js";
import {
  analyzeAgent,
  addOrgMember,
  addGroupMember,
  downloadAgentFile,
  getOrganizationGroups,
  createOrganizationGroup,
  createOrganization,
  deleteAgent,
  followUser,
  getFollowingFeed,
  getAgent,
  getAgents,
  getAgentReviews,
  getMyAgents,
  getMyOrganizations,
  getOrganization,
  getUserFollowers,
  getUserFollowing,
  getUserActivity,
  publishAgent,
  saveAgentReview,
  searchAgents,
  setAuthTokenGetter,
  setCurrentUserId,
  unfollowUser,
  updateAgentVisibility,
  updateOrganization,
  updateOrgMemberRole,
  removeOrgMember,
} from "./api/agents.js";
import AuthModal from "./components/AuthModal.jsx";
import { useAuth } from "./context/AuthContext.jsx";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const modelOptions = ["all", "gpt-4o", "gpt-4o-mini", "claude-3.5-sonnet", "claude-3.5-haiku"];
const DEV_USERS = [
  { id: 1, name: "Ada", initials: "A" },
  { id: 2, name: "Grace", initials: "G" },
  { id: 3, name: "Alan", initials: "AL" },
];
const visibilityOptions = [
  { value: "public", label: "Public", description: "Visible to everyone" },
  {
    value: "followers_only",
    label: "Followers only",
    description: "Only your followers can see this",
  },
  { value: "private", label: "Private", description: "Only you can see this" },
  { value: "org_only", label: "Org only", description: "Only members of the organization can see this" },
  { value: "group_only", label: "Group only", description: "Only members of the selected group can see this" },
];
const screenTransitionMs = 260;
const heroTitleWords = "The agent registry for reusable AI agents".split(" ");
const uploadTitleWords = "Publish an agent".split(" ");
const uploadSubtitleWords =
  "Share a reusable agent with your team. Fill in the details, then use Magic to generate the rest.".split(
    " ",
  );
const descriptionLimit = 300;
const defaultProfileSettings = {
  showLocation: true,
  showWebsite: true,
  showOrganizations: true,
  showJoinDate: true,
  showStats: true,
  showActivity: true,
};

function createDefaultCurrentUser() {
  return {
    id: null,
    name: "Guest",
    handle: "",
    bio: "",
    avatar: null,
    banner: null,
    location: "",
    website: "",
    joinedAt: null,
    role: "Guest",
    organizations: [],
    stats: { agents: 0, downloads: 0, endorsements: 0, collections: 0 },
    settings: { ...defaultProfileSettings },
  };
}

const profileActivitySeed = [
  {
    type: "upload",
    icon: "Upload",
    color: "rgba(74,222,128,0.1)",
    text: "Published rl_learning agent",
    time: "2 days ago",
  },
  {
    type: "endorse",
    icon: "ThumbsUp",
    color: "rgba(201,168,76,0.1)",
    text: "Endorsed Research Buddy by @elena",
    time: "4 days ago",
  },
  {
    type: "collection",
    icon: "Folder",
    color: "rgba(96,165,250,0.1)",
    text: "Created collection HR Automation Toolkit",
    time: "1 week ago",
  },
  {
    type: "upload",
    icon: "Upload",
    color: "rgba(74,222,128,0.1)",
    text: "Published logic-tutor agent",
    time: "2 weeks ago",
  },
  {
    type: "join",
    icon: "Users",
    color: "rgba(244,114,182,0.1)",
    text: "Joined organization Acme Corp",
    time: "6 months ago",
  },
];

const profileActivityIcons = {
  Upload,
  ThumbsUp,
  Folder,
  Users,
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const uploadMetadataFields = [
  "toolsIntegrations",
  "prerequisites",
  "inputFormat",
  "outputFormat",
  "useCases",
  "examplePrompts",
  "limitations",
  "whenToUse",
  "whenNotToUse",
  "setupInstructions",
  "expectedUsers",
  "tags",
];
const uploadMetadataFieldConfig = [
  {
    field: "toolsIntegrations",
    label: "Tools / integrations",
    placeholder: "GitHub, Slack, Jira, browser, database access",
  },
  {
    field: "prerequisites",
    label: "Prerequisites",
    placeholder: "Required accounts, model features, permissions, or files",
  },
  {
    field: "inputFormat",
    label: "Input format",
    placeholder: "Diff, markdown brief, CSV, support ticket, transcript",
  },
  {
    field: "outputFormat",
    label: "Output format",
    placeholder: "Prioritized findings, JSON, checklist, summary, report",
  },
  {
    field: "useCases",
    label: "Use cases",
    placeholder: "One use case per line",
  },
  {
    field: "examplePrompts",
    label: "Example prompts / queries",
    placeholder: "Review this pull request for bugs and missing tests",
  },
  {
    field: "limitations",
    label: "Limitations",
    placeholder: "Known weak spots, unsupported inputs, edge cases",
  },
  {
    field: "whenToUse",
    label: "When to use",
    placeholder: "Best-fit situations for this agent",
  },
  {
    field: "whenNotToUse",
    label: "When not to use",
    placeholder: "Situations where a human or another workflow is better",
  },
  {
    field: "setupInstructions",
    label: "Setup instructions",
    placeholder: "Configuration, environment, or installation notes",
  },
  {
    field: "expectedUsers",
    label: "Expected users / team",
    placeholder: "Engineering, support, finance, analysts, managers",
  },
  {
    field: "tags",
    label: "Tags / keywords",
    placeholder: "code review, pull request, tests, bugs",
  },
];

function getDevUser(id) {
  return DEV_USERS.find((user) => String(user.id) === String(id)) || DEV_USERS[0];
}

function normalizeVisibility(agent) {
  if (agent.visibility === "followers") return "followers_only";
  if (agent.visibility) return agent.visibility;
  return agent.is_public === false || agent.isPublic === false ? "private" : "public";
}

function getVisibilityConfig(visibility) {
  return visibilityOptions.find((option) => option.value === visibility) || visibilityOptions[0];
}

function getVisibilityLabel(visibility) {
  return getVisibilityConfig(visibility).label;
}

function getVisibilityDescription(visibility) {
  return getVisibilityConfig(visibility).description;
}

function isAgentOwner(agent, userId) {
  if (!agent?.uploader_id || userId == null) return false;
  return String(agent.uploader_id) === String(userId);
}

function getOrgInitials(name) {
  return String(name || "Org")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function canManageOrganization(org) {
  const role = org?.current_user_role || org?.role;
  return role === "owner" || role === "admin";
}

function normalizeOrganization(org) {
  return {
    id: org.id,
    name: org.name || "Untitled organization",
    slug: org.slug || slugFromName(org.name || "organization"),
    description: org.description || "",
    avatar_url: org.avatar_url || "",
    created_by: org.created_by,
    current_user_role: org.current_user_role || org.role || "member",
    member_count: Number(org.member_count ?? org.members?.length ?? 0),
    agent_count: Number(org.agent_count ?? org.agents?.length ?? 0),
    members: Array.isArray(org.members) ? org.members : [],
    agents: Array.isArray(org.agents) ? org.agents.map(normalizeAgent) : [],
  };
}

function slugFromName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractAgentList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.agents)) return data.agents;
  if (Array.isArray(data?.groups)) return data.groups;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeAgent(agent) {
  const visibility = normalizeVisibility(agent);
  return {
    id: agent.id,
    name: agent.name || agent.title || "Untitled agent",
    description: agent.description || "No description has been added yet.",
    manual: agent.manual || "",
    category: agent.category || "general",
    model: agent.model || "unknown",
    file_name: agent.file_name || agent.fileName || "agent.md",
    visibility,
    org_id: agent.org_id ?? agent.orgId ?? null,
    orgId: agent.orgId ?? agent.org_id ?? null,
    orgName: agent.orgName ?? agent.org_name ?? agent.organization_name ?? "",
    group_id: agent.group_id ?? agent.groupId ?? null,
    groupId: agent.groupId ?? agent.group_id ?? null,
    groupName: agent.groupName ?? agent.group_name ?? "",
    is_public: agent.is_public ?? agent.isPublic ?? visibility === "public",
    created_at: agent.created_at || new Date().toISOString(),
    team: agent.team || agent.uploader_name || agent.uploaderName || agent.user_name || "Atlas contributor",
    uploader_id: agent.uploader_id ?? agent.uploaderId ?? agent.user_id ?? agent.userId ?? null,
    endorsements: Number(agent.endorsements ?? agent.review_count ?? 0),
    downloads: Number(agent.downloads ?? 0),
    featured: Boolean(agent.featured ?? false),
    similarity: Number(agent.similarity ?? 0),
    rankingScore: Number(agent.ranking_score ?? agent.rankingScore ?? 0),
    averageRating: Number(agent.average_rating ?? agent.averageRating ?? 0),
    reviewCount: Number(agent.review_count ?? agent.reviewCount ?? 0),
    indexed_text: agent.indexed_text,
    embedding_model: agent.embedding_model,
    toolsIntegrations: toDisplayList(agent.toolsIntegrations ?? agent.tools_integrations),
    prerequisites: toDisplayList(agent.prerequisites),
    inputFormat: toDisplayList(agent.inputFormat ?? agent.input_format),
    outputFormat: toDisplayList(agent.outputFormat ?? agent.output_format),
    useCases: toDisplayList(agent.useCases ?? agent.use_cases),
    examplePrompts: toDisplayList(agent.examplePrompts ?? agent.example_prompts),
    limitations: toDisplayList(agent.limitations),
    whenToUse: toDisplayList(agent.whenToUse ?? agent.when_to_use),
    whenNotToUse: toDisplayList(agent.whenNotToUse ?? agent.when_not_to_use),
    setupInstructions: toDisplayList(agent.setupInstructions ?? agent.setup_instructions),
    expectedUsers: toDisplayList(agent.expectedUsers ?? agent.expected_users),
    tags: toDisplayList(agent.tags),
    media: Array.isArray(agent.media) ? agent.media : [],
  };
}

function normalizeGroup(group) {
  return {
    id: group.id,
    name: group.name || group.group_name || "Untitled group",
    description: group.description || "",
    member_count: Number(group.member_count ?? group.members?.length ?? 0),
    created_at: group.created_at || group.createdAt || "",
  };
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const divisions = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, amount] of divisions) {
    if (Math.abs(seconds) >= amount || unit === "minute") {
      return relativeTimeFormatter.format(Math.round(seconds / amount), unit);
    }
  }

  return "Just now";
}

function normalizeProfileActivityItem(item) {
  const rawType = String(item.type || item.activity_type || item.action || "").toLowerCase();
  const agentName =
    item.agent?.name ||
    item.agent_name ||
    item.agent_title ||
    item.agentName ||
    item.title ||
    item.name ||
    "an agent";
  const createdAt =
    item.created_at ||
    item.createdAt ||
    item.review_created_at ||
    item.comment_created_at ||
    item.timestamp;

  if (
    rawType.includes("review") ||
    rawType.includes("comment") ||
    item.rating != null ||
    item.review_id != null ||
    item.comment_id != null
  ) {
    const rating = item.rating != null ? ` (${item.rating}/5)` : "";
    return {
      type: "review",
      icon: "ThumbsUp",
      color: "rgba(201,168,76,0.1)",
      text: `Reviewed ${agentName}${rating}`,
      time: formatRelativeTime(createdAt),
    };
  }

  if (rawType.includes("upload") || rawType.includes("publish") || item.agent_id != null) {
    return {
      type: "upload",
      icon: "Upload",
      color: "rgba(74,222,128,0.1)",
      text: `Published ${agentName}`,
      time: formatRelativeTime(createdAt),
    };
  }

  return {
    type: rawType || "activity",
    icon: "Users",
    color: "rgba(96,165,250,0.1)",
    text: item.text || item.message || item.summary || titleCase(rawType || "activity"),
    time: formatRelativeTime(createdAt),
  };
}

function normalizeProfileActivity(data) {
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.activity)
      ? data.activity
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.results)
          ? data.results
          : [];

  return items.map(normalizeProfileActivityItem);
}

function getMatchScore(agent) {
  const similarity = Number(agent.similarity ?? 0);
  if (!Number.isFinite(similarity)) return 0;
  return Math.max(0, Math.min(1, similarity));
}

function localSearch(agents, query) {
  const text = query.trim().toLowerCase();
  if (!text) return agents;

  return agents.filter((agent) => {
    const haystack = [
      agent.name,
      agent.description,
      agent.category,
      agent.model,
      agent.file_name,
      agent.team,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(text);
  });
}

function getCategoryLabel(category) {
  return categoryMeta[category] || titleCase(category);
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitialScreen() {
  const hash = window.location.hash.replace("#", "");
  return hash === "browse" ||
    hash === "agent" ||
    hash === "upload" ||
    hash === "profile" ||
    hash === "my-agents" ||
    hash === "following" ||
    hash === "organizations" ||
    hash === "org-detail"
    ? hash
    : "home";
}

function getScreenUrl(screen) {
  const hashMap = {
    browse: "#browse",
    agent: "#agent",
    upload: "#upload",
    profile: "#profile",
    "my-agents": "#my-agents",
    following: "#following",
    organizations: "#organizations",
    "org-detail": "#org-detail",
  };
  const hash = hashMap[screen] || "";
  return `${window.location.pathname}${window.location.search}${hash}`;
}

function getProfileInitials(name) {
  return String(name || "Atlas")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatJoinDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
}

function buildProfileFromTeam(teamName, currentUser) {
  if (!teamName || teamName === currentUser.name) return currentUser;

  const slug = String(teamName).toLowerCase().replace(/\s+/g, "-");
  const firstName = String(teamName).split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");

  return {
    id: slug,
    name: teamName,
    handle: `@${firstName || "contributor"}`,
    bio: `${teamName} publishes reusable agents on Atlas Hub.`,
    avatar: null,
    banner: null,
    location: "",
    website: "",
    joinedAt: "2025-02-01",
    role: "Contributor",
    organizations: [],
    stats: { agents: 1, downloads: 120, endorsements: 8, collections: 0 },
    settings: { ...defaultProfileSettings },
  };
}

function buildProfileFromAuthor(review, currentUser) {
  if (review.authorName === currentUser.name || review.authorName === "You") return currentUser;

  const slug = String(review.authorName).toLowerCase().replace(/\s+/g, "-");
  const firstName = String(review.authorName).split(/\s+/)[0].toLowerCase();

  return {
    id: slug,
    name: review.authorName,
    handle: `@${firstName}`,
    bio: `${review.authorTeam} contributor reviewing agents on Atlas Hub.`,
    avatar: null,
    banner: null,
    location: "",
    website: "",
    joinedAt: "2025-03-01",
    role: review.authorTeam || "Contributor",
    organizations: [],
    stats: { agents: 0, downloads: 0, endorsements: 12, collections: 1 },
    settings: { ...defaultProfileSettings },
  };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return dateFormatter.format(date);
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function typewriterFill(setter, text, ms = 600) {
  return new Promise((resolve) => {
    const value = String(text || "");
    setter("");

    if (!value) {
      resolve();
      return;
    }

    let index = 0;
    const stepMs = Math.max(8, Math.floor(ms / value.length));
    const intervalId = window.setInterval(() => {
      index += 1;
      setter(value.slice(0, index));

      if (index >= value.length) {
        window.clearInterval(intervalId);
        resolve();
      }
    }, stepMs);
  });
}

function getAnalysisData(result) {
  return result?.data || result || {};
}

function toDisplayList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("\n");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return value == null ? "" : String(value);
}

function getFirstValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function parseStatValue(value) {
  const raw = String(value);
  const isCompact = raw.toLowerCase().endsWith("k");
  const numeric = Number(raw.toLowerCase().replace("k", ""));
  const target = Number.isFinite(numeric) ? numeric * (isCompact ? 1000 : 1) : 0;

  return {
    target,
    format: (current) => {
      if (!isCompact) return String(Math.round(current));
      const decimals = raw.includes(".") ? 1 : 0;
      return `${(current / 1000).toFixed(decimals)}k`;
    },
  };
}

const categoryTones = {
  research: { color: "#82b9ff", soft: "rgba(130, 185, 255, 0.13)" },
  productivity: { color: "#6fe09d", soft: "rgba(111, 224, 157, 0.13)" },
  "developer-tools": { color: "#d0a94f", soft: "rgba(208, 169, 79, 0.14)" },
  education: { color: "#b9a0ff", soft: "rgba(185, 160, 255, 0.13)" },
  support: { color: "#ffb86b", soft: "rgba(255, 184, 107, 0.13)" },
  "document-ops": { color: "#8be9d2", soft: "rgba(139, 233, 210, 0.12)" },
  finance: { color: "#6fe09d", soft: "rgba(111, 224, 157, 0.13)" },
  hr: { color: "#ff9eb6", soft: "rgba(255, 158, 182, 0.13)" },
  sales: { color: "#f2ce72", soft: "rgba(242, 206, 114, 0.13)" },
  data: { color: "#82b9ff", soft: "rgba(130, 185, 255, 0.13)" },
  general: { color: "#a5a297", soft: "rgba(255, 255, 255, 0.08)" },
};

function getCategoryTone(category) {
  return categoryTones[category] || categoryTones.general;
}

function getTeamInitials(team) {
  const initials = String(team || "Atlas")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "AH";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(Number(value) || 0);
}

function getAgentMedia(agent) {
  if (Array.isArray(agent.media) && agent.media.length) {
    return agent.media.map((item, index) => ({
      type: item.type === "video" ? "video" : "image",
      url: item.url,
      caption: item.caption || `${agent.name} media ${index + 1}`,
      variant: index,
    }));
  }

  const categoryLabel = getCategoryLabel(agent.category);
  return ["Overview", "Workflow", "Inputs", "Output"].map((label, index) => ({
    type: "placeholder",
    caption: `${categoryLabel} ${label.toLowerCase()} preview`,
    variant: index,
  }));
}

function normalizeReview(review, index = 0, agent = {}) {
  const rating = Number(review.rating) || 1;

  return {
    id: review.id || `${agent.id || "agent"}-review-${index}`,
    authorInitials: review.authorInitials || getTeamInitials(review.authorName || review.author_name || "Atlas Reviewer"),
    authorName: review.authorName || review.author_name || "Atlas Reviewer",
    authorTeam: review.authorTeam || review.author_username || "Contributor",
    rating: Math.min(5, Math.max(1, rating)),
    title: review.title || "Useful in production",
    body: review.body || review.experience || "This review has not added details yet.",
    constraints: review.constraints || review.downsides || "",
    helpfulCount: Number(review.helpfulCount || 0),
    notHelpfulCount: Number(review.notHelpfulCount || 0),
    userVote: review.userVote === "helpful" || review.userVote === "not-helpful" ? review.userVote : null,
    createdAt: review.createdAt || review.created_at || new Date().toISOString(),
  };
}

function createSeedReviews(agent) {
  const category = getCategoryLabel(agent.category).toLowerCase();
  return [
    {
      id: `${agent.id}-seed-review-1`,
      authorInitials: "ML",
      authorName: "Mina Lee",
      authorTeam: "Workflow QA",
      rating: 5,
      title: `Strong fit for ${category} handoffs`,
      body: `${agent.name} gave our team a reliable starting point without hiding the tradeoffs. The output was consistent, easy to review, and close enough to our internal format that rollout was low-friction.`,
      constraints: "Works best when the input includes clear success criteria; vague tasks produce broader summaries.",
      helpfulCount: 8,
      notHelpfulCount: 1,
      userVote: null,
      createdAt: "2026-05-29T09:20:00.000Z",
    },
    {
      id: `${agent.id}-seed-review-2`,
      authorInitials: "AR",
      authorName: "Arun Rao",
      authorTeam: "Platform Enablement",
      rating: 4,
      title: "Good defaults with a few edge cases",
      body: `We used this as a baseline agent for a repeated workflow and only had to adjust the final tone. The manual notes were useful for onboarding teammates who had not seen the prompt before.`,
      constraints: "Long source files need chunking before upload, otherwise the agent can over-prioritize the opening context.",
      helpfulCount: 5,
      notHelpfulCount: 0,
      userVote: null,
      createdAt: "2026-05-27T14:45:00.000Z",
    },
    {
      id: `${agent.id}-seed-review-3`,
      authorInitials: "KS",
      authorName: "Kira Stone",
      authorTeam: "Operations",
      rating: 4,
      title: "Useful for repeatable review work",
      body: `The agent is strongest when the task is constrained and the expected output is known. It saved time on first-pass analysis and made it easier to compare outputs across contributors.`,
      constraints: "",
      helpfulCount: 3,
      notHelpfulCount: 1,
      userVote: null,
      createdAt: "2026-05-24T11:15:00.000Z",
    },
  ].map((review, index) => normalizeReview(review, index, agent));
}

function getInitialReviews(agent) {
  const source = Array.isArray(agent.reviews) && agent.reviews.length ? agent.reviews : createSeedReviews(agent);
  return source.map((review, index) => normalizeReview(review, index, agent));
}

function getReviewSummary(reviews) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((review) => {
    counts[review.rating] = (counts[review.rating] || 0) + 1;
  });

  const total = reviews.length;
  const average = total
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / total
    : 0;

  return { average, counts, total };
}

function sortReviews(reviews, sortBy) {
  return [...reviews].sort((a, b) => {
    if (sortBy === "helpful") {
      return b.helpfulCount - a.helpfulCount || new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === "highest") {
      return b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export default function App() {
  const { configured: authConfigured, loading: authLoading, profile, signIn, signUp, signInWithProvider, signOut, updateProfile, getAccessToken } =
    useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("sign-in");
  const [authStuck, setAuthStuck] = useState(false);
  const [screen, setScreen] = useState(getInitialScreen);
  const screenRef = useRef(screen);
  const prevScreenRef = useRef(screen === "upload" ? "home" : screen);
  const transitionTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const detailRequestRef = useRef(0);
  const [isMounted, setIsMounted] = useState(false);
  const [screenTransition, setScreenTransition] = useState("screen-enter");
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [agents, setAgents] = useState([]);
  const [apiState, setApiState] = useState({
    status: "loading",
    message: "Connecting to backend",
  });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [model, setModel] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [publicOnly, setPublicOnly] = useState(true);
  const [searchState, setSearchState] = useState({ status: "idle", results: null, message: "" });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [profileActivity, setProfileActivity] = useState([]);
  const [profileActivityState, setProfileActivityState] = useState({ status: "idle", message: "" });
  const [currentUser, setCurrentUser] = useState(createDefaultCurrentUser);
  const [devUserId, setDevUserId] = useState(1);
  const [followedUsers, setFollowedUsers] = useState(() => new Set());
  const [landingQuery, setLandingQuery] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false });

  const isOwnProfile = profileUser?.id === currentUser?.id;
  const authLoadingActive = authLoading && !authStuck;

  useEffect(() => {
    if (!authLoading) {
      setAuthStuck(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setAuthStuck(true), 4000);
    return () => window.clearTimeout(timer);
  }, [authLoading]);

  useEffect(() => {
    setCurrentUserId(devUserId);

    if (!import.meta.env.DEV) return;

    const devUser = getDevUser(devUserId);
    setCurrentUser((prev) => ({
      ...prev,
      id: devUser.id,
      name: devUser.name,
      handle: `@${devUser.name.toLowerCase()}`,
      role: "Contributor",
      joinedAt: prev.joinedAt || "2026-05-31",
      stats: prev.stats || createDefaultCurrentUser().stats,
    }));
    setProfileUser((viewing) =>
      viewing?.id != null && String(viewing.id) === String(devUser.id)
        ? { ...viewing, id: devUser.id, name: devUser.name, handle: `@${devUser.name.toLowerCase()}` }
        : viewing,
    );
  }, [devUserId]);

  useEffect(() => {
    if (!profile || import.meta.env.DEV) return;
    setCurrentUser((prev) => ({
      ...prev,
      id: profile.id ?? prev.id,
      name: profile.displayName || profile.email?.split("@")[0] || prev.name,
      handle: profile.username
        ? `@${String(profile.username).replace(/^@/, "")}`
        : prev.handle,
      bio: profile.bio ?? prev.bio,
      avatar: profile.avatar_url || prev.avatar,
      banner: profile.banner_url || prev.banner,
      location: profile.location ?? prev.location,
      website: profile.website ?? prev.website,
      role: profile.role || prev.role,
      settings: profile.settings || prev.settings,
      email: profile.email || prev.email,
      joinedAt: profile.createdAt
        ? String(profile.createdAt).split("T")[0]
        : prev.joinedAt,
    }));
  }, [profile]);

  useEffect(() => {
    if (profile === null && !authLoadingActive && !import.meta.env.DEV) {
      setCurrentUser(createDefaultCurrentUser());
    }
  }, [profile, authLoadingActive]);

  useEffect(() => {
    setAuthTokenGetter(getAccessToken);
    return () => setAuthTokenGetter(null);
  }, [getAccessToken]);

  useEffect(() => {
    if (currentUser.id == null) {
      setOrganizations([]);
      return undefined;
    }

    let ignore = false;

    async function loadOrganizations() {
      try {
        const data = await getMyOrganizations();
        if (ignore) return;
        const nextOrganizations = extractAgentList(data).map(normalizeOrganization);
        setOrganizations(nextOrganizations);
        setCurrentUser((prev) => ({ ...prev, organizations: nextOrganizations }));
      } catch {
        if (ignore) return;
        setOrganizations([]);
        setCurrentUser((prev) => ({ ...prev, organizations: [] }));
      }
    }

    loadOrganizations();

    return () => {
      ignore = true;
    };
  }, [currentUser.id, devUserId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    const cursorRoot = document.body;
    const dot = document.querySelector(".custom-cursor-dot");
    const ring = document.querySelector(".custom-cursor-ring");
    const supportsFinePointer = window.matchMedia("(pointer: fine)").matches;

    if (!dot || !ring || !supportsFinePointer) return undefined;

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let rafId = 0;

    const hoverSelector = "button, a, [role='button'], label, .agent-card, .related-agent-row";
    const textSelector = "input, textarea, select, [contenteditable='true']";

    function setCursorPosition(element, x, y) {
      element.style.setProperty("--cursor-x", `${x}px`);
      element.style.setProperty("--cursor-y", `${y}px`);
    }

    function animate() {
      ringX += (pointerX - ringX) * 0.16;
      ringY += (pointerY - ringY) * 0.16;
      setCursorPosition(dot, pointerX, pointerY);
      setCursorPosition(ring, ringX, ringY);
      rafId = window.requestAnimationFrame(animate);
    }

    function syncTargetState(target) {
      if (!(target instanceof Element)) return;
      const isText = Boolean(target.closest(textSelector));
      const isHovering = Boolean(target.closest(hoverSelector));
      cursorRoot.classList.toggle("custom-cursor-text", isText);
      cursorRoot.classList.toggle("custom-cursor-hovering", !isText && isHovering);
    }

    function handlePointerMove(event) {
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      cursorRoot.classList.add("custom-cursor-ready");
      cursorRoot.classList.remove("custom-cursor-hidden");
      syncTargetState(event.target);
    }

    function handlePointerOver(event) {
      syncTargetState(event.target);
    }

    function handlePointerOut(event) {
      if (event.relatedTarget instanceof Element) {
        syncTargetState(event.relatedTarget);
        return;
      }
      cursorRoot.classList.remove("custom-cursor-hovering", "custom-cursor-text");
    }

    function handlePointerDown() {
      cursorRoot.classList.add("custom-cursor-pressed");
    }

    function handlePointerUp() {
      cursorRoot.classList.remove("custom-cursor-pressed");
    }

    function handlePointerLeave() {
      cursorRoot.classList.add("custom-cursor-hidden");
      cursorRoot.classList.remove(
        "custom-cursor-hovering",
        "custom-cursor-pressed",
        "custom-cursor-text",
      );
    }

    cursorRoot.classList.add("custom-cursor-enabled");
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);
    document.documentElement.addEventListener("mouseleave", handlePointerLeave);
    rafId = window.requestAnimationFrame(animate);

    return () => {
      cursorRoot.classList.remove(
        "custom-cursor-enabled",
        "custom-cursor-ready",
        "custom-cursor-hidden",
        "custom-cursor-hovering",
        "custom-cursor-pressed",
        "custom-cursor-text",
      );
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
      document.documentElement.removeEventListener("mouseleave", handlePointerLeave);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const changeScreen = useCallback((nextScreen, writeHash = true) => {
    if (nextScreen === screenRef.current) {
      if (writeHash) {
        window.history.pushState(null, "", getScreenUrl(nextScreen));
      }
      return;
    }

    window.clearTimeout(transitionTimerRef.current);
    setScreenTransition("screen-exit");
    prevScreenRef.current = screenRef.current;

    transitionTimerRef.current = window.setTimeout(() => {
      if (writeHash) {
        window.history.pushState(null, "", getScreenUrl(nextScreen));
      }

      screenRef.current = nextScreen;
      setScreen(nextScreen);
      setScreenTransition("screen-enter");
      window.scrollTo({ top: 0, behavior: "auto" });
    }, screenTransitionMs);
  }, []);

  useEffect(() => {
    const onHashChange = () => changeScreen(getInitialScreen(), false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [changeScreen]);

  useEffect(() => {
    if (screen === "agent" && !selectedAgent) {
      changeScreen("browse");
    }
  }, [changeScreen, screen, selectedAgent]);

  useEffect(() => {
    if (screen === "profile" && !profileUser) {
      changeScreen("browse");
    }
  }, [changeScreen, profileUser, screen]);

  const profileViewUser = isOwnProfile ? currentUser : profileUser;

  useEffect(() => {
    if (screen !== "profile" || !profileViewUser?.id) {
      setProfileActivity([]);
      setProfileActivityState({ status: "idle", message: "" });
      return undefined;
    }

    let ignore = false;
    setProfileActivityState({ status: "loading", message: "" });

    async function loadProfileActivity() {
      try {
        const data = await getUserActivity(profileViewUser.id);
        if (ignore) return;
        setProfileActivity(normalizeProfileActivity(data));
        setProfileActivityState({ status: "loaded", message: "" });
      } catch (error) {
        if (ignore) return;
        setProfileActivity([]);
        setProfileActivityState({
          status: "error",
          message: error.message || "Could not load recent activity.",
        });
      }
    }

    loadProfileActivity();

    return () => {
      ignore = true;
    };
  }, [profileViewUser?.id, screen]);

  useEffect(() => {
    if (screen === "org-detail" && !selectedOrg) {
      changeScreen("organizations");
    }
  }, [changeScreen, screen, selectedOrg]);

  useEffect(() => {
    function updateScrollState() {
      const top = window.scrollY || document.documentElement.scrollTop;
      const scrollable =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrolled(top > 80);
      setScrollProgress(scrollable > 0 ? Math.min(100, Math.max(0, (top / scrollable) * 100)) : 0);
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(transitionTimerRef.current);
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimerRef.current);
    setToast({ message, visible: true });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
    }, 2800);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadAgents() {
      try {
        const data = await getAgents();
        if (ignore) return;
        setAgents((Array.isArray(data) ? data : []).map(normalizeAgent));
        setApiState({ status: "live", message: "" });
      } catch (error) {
        if (ignore) return;
        setAgents([]);
        setApiState({
          status: "error",
          message: `Backend unavailable. ${error.message}`,
        });
      }
    }

    loadAgents();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (screen !== "browse" || cleanQuery.length < 3) {
      setSearchState({
        status: "idle",
        results: null,
        message: "",
        lowConfidence: false,
        omittedCount: 0,
        totalResults: 0,
      });
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSearchState((current) => ({
        ...current,
        status: "loading",
        message: "Searching",
        lowConfidence: false,
        omittedCount: 0,
      }));
      try {
        const data = await searchAgents(cleanQuery);
        const results = Array.isArray(data?.results) ? data.results.map(normalizeAgent) : [];
        setSearchState({
          status: "live",
          results,
          lowConfidence: false,
          omittedCount: 0,
          totalResults: results.length,
          message: "",
        });
      } catch (error) {
        setSearchState({
          status: "fallback",
          results: null,
          lowConfidence: false,
          omittedCount: 0,
          totalResults: 0,
          message: `Semantic search unavailable. Showing loaded agents filtered locally. ${error.message}`,
        });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [query, screen]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(agents.map((agent) => agent.category).filter(Boolean)));
    return ["all", ...unique.sort()];
  }, [agents]);

  const filteredAgents = useMemo(() => {
    const hasBackendRankedResults = Array.isArray(searchState.results);
    const base = hasBackendRankedResults ? searchState.results : localSearch(agents, query);
    const filtered = base.filter((agent) => {
      if (agent.visibility === "private" && !isAgentOwner(agent, devUserId)) return false;
      if (category !== "all" && agent.category !== category) return false;
      if (model !== "all" && agent.model !== model) return false;
      if (publicOnly && agent.visibility !== "public") return false;
      return true;
    });

    if (hasBackendRankedResults) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "downloads") return b.downloads - a.downloads;
      if (sortBy === "endorsements") return b.endorsements - a.endorsements;
      if (sortBy === "similarity") return Number(b.similarity || 0) - Number(a.similarity || 0);
      return Number(b.featured) - Number(a.featured) || b.endorsements - a.endorsements;
    });
  }, [agents, category, devUserId, model, publicOnly, query, searchState.results, sortBy]);

  const shelves = useMemo(
    () => buildShelves(filteredAgents, Array.isArray(searchState.results)),
    [filteredAgents, searchState.results],
  );

  function openAuthModal(mode = "sign-in") {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }

  function requireAuth(action) {
    if (profile || (import.meta.env.DEV && currentUser.id != null)) {
      action();
      return;
    }
    openAuthModal("sign-in");
    showToast("Sign in to continue.");
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // ignore — clear local state regardless
    }
    if (import.meta.env.DEV) {
      const devUser = getDevUser(devUserId);
      setCurrentUser((prev) => ({
        ...prev,
        id: devUser.id,
        name: devUser.name,
        handle: `@${devUser.name.toLowerCase()}`,
      }));
    } else {
      setCurrentUser(createDefaultCurrentUser());
    }
    setProfileUser(null);
    setSelectedAgent(null);
    showToast("Signed out.");
    if (screenRef.current === "upload" || screenRef.current === "profile") {
      navigate("home");
    }
  }

  function navigate(nextScreen) {
    changeScreen(nextScreen);
  }

  function goToUpload() {
    requireAuth(() => navigate("upload"));
  }

  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (authLoadingActive || profile || screen !== "upload") return;
    changeScreen("home");
    openAuthModal("sign-in");
    showToast("Sign in to publish an agent.");
  }, [authLoadingActive, changeScreen, profile, screen, showToast]);

  function closeUploadPage() {
    navigate(prevScreenRef.current === "browse" ? "browse" : "home");
  }

  function submitLandingSearch(event) {
    event.preventDefault();
    setQuery(landingQuery);
    navigate("browse");
  }

  function openProfile(user) {
    setProfileUser(user);
    if (screenRef.current !== "profile") {
      navigate("profile");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function openOwnProfile() {
    openProfile(currentUser);
  }

  function closeProfile() {
    const destination = prevScreenRef.current === "profile" ? "browse" : prevScreenRef.current;
    navigate(destination === "profile" ? "browse" : destination);
    window.setTimeout(() => {
      setProfileUser(null);
    }, screenTransitionMs + 20);
  }

  async function updateCurrentUser(patch) {
    const merged = {
      ...currentUser,
      ...patch,
      settings: patch.settings ? { ...currentUser.settings, ...patch.settings } : currentUser.settings,
      stats: patch.stats ? { ...currentUser.stats, ...patch.stats } : currentUser.stats,
      organizations: patch.organizations ?? currentUser.organizations,
    };

    setCurrentUser(merged);
    setProfileUser((viewing) => (viewing?.id === currentUser.id ? merged : viewing));

    if (!profile?.id) return;

    try {
      await updateProfile({
        name: merged.name,
        handle: merged.handle,
        bio: merged.bio,
        avatar: merged.avatar,
        banner: merged.banner,
        location: merged.location,
        website: merged.website,
        role: merged.role,
        settings: merged.settings,
      });
    } catch (error) {
      showToast(error.message || "Could not save profile.");
    }
  }

  async function openAgent(agent) {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setSelectedAgent(agent);
    if (screenRef.current !== "agent") {
      navigate("agent");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    try {
      const detail = await getAgent(agent.id);
      if (detailRequestRef.current !== requestId) return;
      setSelectedAgent(normalizeAgent({ ...agent, ...detail }));
    } catch {
      if (detailRequestRef.current !== requestId) return;
    }
  }

  function closeAgent() {
    detailRequestRef.current += 1;
    navigate("browse");
    window.setTimeout(() => {
      setSelectedAgent(null);
    }, screenTransitionMs + 20);
  }

  function openOrganization(org) {
    setSelectedOrg(normalizeOrganization(org));
    if (screenRef.current !== "org-detail") {
      navigate("org-detail");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function closeOrganization() {
    navigate("organizations");
    window.setTimeout(() => {
      setSelectedOrg(null);
    }, screenTransitionMs + 20);
  }

  const syncOrganizations = useCallback((nextOrganizations) => {
    setOrganizations(nextOrganizations);
    setCurrentUser((prev) => ({ ...prev, organizations: nextOrganizations }));
  }, []);

  function addUploadedAgent(agent) {
    setAgents((current) => [
      normalizeAgent({ ...agent, team: currentUser.name, uploader_id: currentUser.id }),
      ...current,
    ]);
  }

  function handleDevUserChange(nextUserId) {
    const nextUser = getDevUser(nextUserId);
    setCurrentUserId(nextUser.id);
    setDevUserId(nextUser.id);
    showToast(`Switched to ${nextUser.name}`);
  }

  async function handleFollowUser(userId) {
    if (userId == null) return;
    const key = String(userId);
    setFollowedUsers((current) => new Set(current).add(key));

    try {
      await followUser(userId);
      showToast("Following user.");
    } catch (error) {
      setFollowedUsers((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      showToast("Could not follow user.");
      throw error;
    }
  }

  async function handleUnfollowUser(userId) {
    if (userId == null) return;
    const key = String(userId);
    setFollowedUsers((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });

    try {
      await unfollowUser(userId);
      showToast("Unfollowed user.");
    } catch (error) {
      setFollowedUsers((current) => new Set(current).add(key));
      showToast(error?.message || "Could not unfollow user.");
      throw error;
    }
  }

  async function handleUpdateAgentVisibility(agentId, visibility, orgId = null) {
    const previousAgents = agents;
    const previousSelectedAgent = selectedAgent;

    setAgents((current) =>
      current.map((agent) =>
        String(agent.id) === String(agentId)
          ? normalizeAgent({ ...agent, visibility, org_id: orgId, is_public: visibility === "public" })
          : agent,
      ),
    );
    setSelectedAgent((current) =>
      current && String(current.id) === String(agentId)
        ? normalizeAgent({ ...current, visibility, org_id: orgId, is_public: visibility === "public" })
        : current,
    );

    try {
      await updateAgentVisibility(agentId, visibility, { org_id: orgId });
      showToast(`Visibility updated to ${getVisibilityLabel(visibility)}.`);
    } catch (error) {
      setAgents(previousAgents);
      setSelectedAgent(previousSelectedAgent);
      showToast("Failed to update visibility.");
      throw error;
    }
  }

  return (
    <>
      <div className="custom-cursor custom-cursor-ring" aria-hidden="true" />
      <div className="custom-cursor custom-cursor-dot" aria-hidden="true" />
      <div className={`app-shell ${isMounted ? "is-mounted" : ""} ${screenTransition}`}>
        <Nav
          screen={screen}
          onNavigate={navigate}
          onUpload={goToUpload}
          onSignIn={() => openAuthModal("sign-in")}
          onSignOut={handleSignOut}
          onOpenOwnProfile={openOwnProfile}
          onNavigateToBrowse={() => navigate("browse")}
          onNavigateToMyAgents={() => navigate("my-agents")}
          onNavigateToOrganizations={() => navigate("organizations")}
          onNavigateToFollowing={() => navigate("following")}
          onToast={showToast}
          currentUser={currentUser}
          profile={profile}
          authLoading={authLoadingActive}
          authConfigured={authConfigured}
          apiState={apiState}
          scrolled={scrolled}
          scrollProgress={scrollProgress}
        />

        <main>
          {screen === "home" ? (
            <Landing
              query={landingQuery}
              setQuery={setLandingQuery}
              onSearch={submitLandingSearch}
              onBrowse={() => navigate("browse")}
              onUpload={goToUpload}
              agentCount={agents.length}
            />
          ) : screen === "upload" ? (
            <UploadPage
              currentUser={currentUser}
              onUploaded={addUploadedAgent}
              onBack={closeUploadPage}
              onToast={showToast}
            />
          ) : screen === "my-agents" ? (
            <MyAgentsPage
              currentUser={currentUser}
              devUserId={devUserId}
              onBack={() => navigate("browse")}
              onNavigateToAgent={openAgent}
              onToast={showToast}
              onUpload={goToUpload}
            />
          ) : screen === "following" ? (
            <FollowingFeedPage
              currentUser={currentUser}
              devUserId={devUserId}
              followedUsers={followedUsers}
              onBack={() => navigate("browse")}
              onBrowse={() => navigate("browse")}
              onFollow={handleFollowUser}
              onNavigateToAgent={openAgent}
              onToast={showToast}
              onUnfollow={handleUnfollowUser}
            />
          ) : screen === "organizations" ? (
            <OrganizationsPage
              currentUser={currentUser}
              devUserId={devUserId}
              organizations={organizations}
              onBack={() => navigate("browse")}
              onOrganizationsChange={syncOrganizations}
              onSelectOrg={openOrganization}
              onToast={showToast}
            />
          ) : screen === "org-detail" && selectedOrg ? (
            <OrgDetailPage
              currentUser={currentUser}
              devUserId={devUserId}
              org={selectedOrg}
              onBack={closeOrganization}
              onNavigateToAgent={openAgent}
              onOrganizationsChange={syncOrganizations}
              onToast={showToast}
            />
          ) : screen === "agent" && selectedAgent ? (
            <AgentPage
              agent={selectedAgent}
              allAgents={agents}
              currentUser={currentUser}
              devUserId={devUserId}
              followedUsers={followedUsers}
              onBack={closeAgent}
              onFollow={handleFollowUser}
              onNavigateToAgent={openAgent}
              onOpenProfile={openProfile}
              onToast={showToast}
              onUnfollow={handleUnfollowUser}
              onUpdateVisibility={handleUpdateAgentVisibility}
            />
          ) : screen === "profile" && profileViewUser ? (
            <ProfilePage
              user={profileViewUser}
              isOwnProfile={isOwnProfile}
              allAgents={agents}
              activity={profileActivity}
              activityState={profileActivityState}
              devUserId={devUserId}
              followedUsers={followedUsers}
              onBack={closeProfile}
              onFollow={handleFollowUser}
              onNavigateToAgent={openAgent}
              onUpload={goToUpload}
              onSignIn={() => openAuthModal("sign-in")}
              onUnfollow={handleUnfollowUser}
              onUpdateUser={updateCurrentUser}
              onToast={showToast}
            />
          ) : (
            <Browse
              agents={filteredAgents}
              shelves={shelves}
              categories={categories}
              category={category}
              setCategory={setCategory}
              model={model}
              setModel={setModel}
              sortBy={sortBy}
              setSortBy={setSortBy}
              publicOnly={publicOnly}
              setPublicOnly={setPublicOnly}
              query={query}
              setQuery={setQuery}
              searchState={searchState}
              apiState={apiState}
              totalAgentCount={agents.length}
              onOpenAgent={openAgent}
              onUpload={goToUpload}
              onToast={showToast}
              devUserId={devUserId}
              followedUsers={followedUsers}
              onFollow={handleFollowUser}
              onUnfollow={handleUnfollowUser}
            />
          )}
        </main>
      </div>

      <AuthModal
        mode={authModalMode}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onModeChange={setAuthModalMode}
        onSignIn={signIn}
        onSignUp={signUp}
        onSignInWithProvider={signInWithProvider}
      />

      {import.meta.env.DEV ? (
        <DevUserSelector activeUserId={devUserId} onChange={handleDevUserChange} />
      ) : null}

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}

function DevUserSelector({ activeUserId, onChange }) {
  return (
    <div className="dev-user-selector" aria-label="Development user selector">
      <span>Dev user:</span>
      {DEV_USERS.map((user) => (
        <button
          className={String(activeUserId) === String(user.id) ? "dev-user-btn active" : "dev-user-btn"}
          key={user.id}
          type="button"
          onClick={() => onChange(user.id)}
        >
          {user.initials}
        </button>
      ))}
    </div>
  );
}

function NavAvatarMenu({
  currentUser,
  onSignOut,
  onOpenOwnProfile,
  onUpload,
  onNavigateToBrowse,
  onNavigateToMyAgents,
  onNavigateToOrganizations,
  onNavigateToFollowing,
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="nav-avatar-wrapper" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={`nav-avatar-trigger ${open ? "nav-avatar-trigger--open" : ""}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="nav-avatar-trigger-circle">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt="" />
          ) : (
            <span>{getProfileInitials(currentUser.name)}</span>
          )}
        </span>
        <ChevronDown className="chevron" size={10} />
      </button>

      <div className={`nav-dropdown ${open ? "nav-dropdown--open" : ""}`} role="menu">
        <div className="nav-dropdown-header">
          <span className="nav-dropdown-header-avatar">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" />
            ) : (
              <span>{getProfileInitials(currentUser.name)}</span>
            )}
          </span>
          <span className="nav-dropdown-header-copy">
            <strong>{currentUser.name}</strong>
            {currentUser.handle ? <small>{currentUser.handle}</small> : null}
          </span>
        </div>

        <div className="nav-dropdown-divider" />

        <button
          className="nav-dropdown-item"
          type="button"
          onClick={() => {
            onOpenOwnProfile();
            setOpen(false);
          }}
        >
          <User size={15} />
          View profile
        </button>
        <button
          className="nav-dropdown-item"
          type="button"
          onClick={() => {
            onOpenOwnProfile();
            setOpen(false);
          }}
        >
          <Settings size={15} />
          Edit profile
        </button>
        <button
          className="nav-dropdown-item"
          type="button"
          onClick={() => {
            onUpload();
            setOpen(false);
          }}
        >
          <Upload size={15} />
          Upload agent
        </button>
        <button
          className="nav-dropdown-item"
          type="button"
          onClick={() => {
            onNavigateToBrowse();
            setOpen(false);
          }}
        >
          <LayoutGrid size={15} />
          Browse agents
        </button>
        <button
          className="nav-dropdown-item"
          type="button"
          onClick={() => {
            onNavigateToMyAgents();
            setOpen(false);
          }}
        >
          <List size={15} />
          My agents
        </button>
        <button
          className="nav-dropdown-item"
          type="button"
          onClick={() => {
            onNavigateToOrganizations();
            setOpen(false);
          }}
        >
          <Building2 size={15} />
          Organizations
        </button>
        <button
          className="nav-dropdown-item"
          type="button"
          onClick={() => {
            onNavigateToFollowing();
            setOpen(false);
          }}
        >
          <Rss size={15} />
          Following feed
        </button>

        <div className="nav-dropdown-divider" />

        <button
          className="nav-dropdown-item danger"
          type="button"
          onClick={() => {
            onSignOut();
            setOpen(false);
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}

function Nav({
  screen,
  onNavigate,
  onUpload,
  onSignIn,
  onSignOut,
  onOpenOwnProfile,
  onNavigateToBrowse,
  onNavigateToMyAgents,
  onNavigateToOrganizations,
  onNavigateToFollowing,
  onToast,
  currentUser,
  profile,
  authLoading,
  authConfigured,
  apiState,
  scrolled,
  scrollProgress,
}) {
  const showScrollProgress =
    screen === "browse" ||
    screen === "agent" ||
    screen === "profile" ||
    screen === "my-agents" ||
    screen === "following" ||
    screen === "organizations" ||
    screen === "org-detail";

  return (
    <header className={`site-nav ${scrolled ? "nav--scrolled" : ""}`}>
      {showScrollProgress ? (
        <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
      ) : null}
      <a
        className="brand"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("home");
        }}
        aria-label="Atlas Hub home"
      >
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-copy">
          <span>Atlas Hub</span>
          <small>agent registry</small>
        </span>
      </a>

      <nav className="nav-actions" aria-label="Primary">
        <button
          className={screen === "home" ? "nav-link active" : "nav-link"}
          type="button"
          onClick={() => onNavigate("home")}
        >
          Home
        </button>
        <button
          className={
            screen === "browse" ||
            screen === "agent" ||
            screen === "profile" ||
            screen === "my-agents" ||
            screen === "following" ||
            screen === "organizations" ||
            screen === "org-detail"
              ? "nav-link active"
              : "nav-link"
          }
          type="button"
          onClick={() => onNavigate("browse")}
        >
          Browse
        </button>
        {authLoading ? (
          <button className="ghost-btn nav-signin-btn" type="button" disabled>
            <Loader2 className="spin" size={14} />
            Loading
          </button>
        ) : profile || (import.meta.env.DEV && currentUser.id != null) ? (
          <NavAvatarMenu
            currentUser={currentUser}
            onNavigateToBrowse={onNavigateToBrowse}
            onNavigateToFollowing={onNavigateToFollowing}
            onNavigateToMyAgents={onNavigateToMyAgents}
            onNavigateToOrganizations={onNavigateToOrganizations}
            onOpenOwnProfile={onOpenOwnProfile}
            onSignOut={onSignOut}
            onUpload={onUpload}
          />
        ) : (
          <button className="ghost-btn nav-signin-btn" type="button" onClick={onSignIn}>
            <LockKeyhole size={14} />
            Sign in
          </button>
        )}
        <button className="primary-btn compact" type="button" onClick={onUpload}>
          <Upload size={16} />
          Upload
        </button>
      </nav>
    </header>
  );
}

function Landing({ query, setQuery, onSearch, onBrowse, onUpload, agentCount }) {
  return (
    <section className="landing-page">
      <div className="hero-scene" aria-hidden="true">
        <div className="scene-grid" />
        <div className="scene-line line-one" />
        <div className="scene-line line-two" />
        <div className="scene-panel panel-one">
          <span />
          <span />
          <span />
        </div>
        <div className="scene-panel panel-two">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="scene-panel panel-three">
          <span />
          <span />
        </div>
      </div>

      <div className="hero-content">
        <div className="hero-pill">
          <Sparkles size={15} />
          Challenge 04 - Atlas Hub
        </div>
        <h1 className="animated-title">
          {heroTitleWords.map((word, index) => {
            const isAccent = index >= heroTitleWords.length - 3;
            return (
              <span className={`word-wrap ${isAccent ? "accent" : ""}`} key={`${word}-${index}`}>
                <span className="word" style={{ animationDelay: `${index * 40}ms` }}>
                  {word}
                </span>
              </span>
            );
          })}
        </h1>
        <p>
          Publish, discover, and evaluate the AI agents your team can reuse across real workflows.
        </p>
        <div className="hero-actions">
          <button className="primary-btn" type="button" onClick={onUpload}>
            <Upload size={17} />
            Upload your agent
          </button>
          <button className="secondary-btn" type="button" onClick={onBrowse}>
            <Boxes size={17} />
            Browse registry
          </button>
        </div>
      </div>

      <div className="stats-band" aria-label="Registry stats">
        <Stat value={agentCount} label="Agents indexed" />
        <Stat value="38" label="Teams contributing" />
        <Stat value="1.2k" label="Endorsements" />
        <Stat value="6.8k" label="Downloads" />
      </div>

      <form className="landing-search" onSubmit={onSearch}>
        <Search size={20} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by task, team, model, or category"
        />
        <button className="primary-btn compact" type="submit">
          <ArrowRight size={16} />
          Search
        </button>
      </form>
    </section>
  );
}

function Stat({ value, label }) {
  const statRef = useRef(null);
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const element = statRef.current;
    if (!element) return undefined;

    const { target, format } = parseStatValue(value);
    let rafId = 0;
    let started = false;
    const startCount = () => {
      if (started) return;
      started = true;
      const startTime = performance.now();

      function tick(now) {
        const elapsed = Math.min(1, (now - startTime) / 1200);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        setDisplayValue(format(target * eased));
        if (elapsed < 1) rafId = window.requestAnimationFrame(tick);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        startCount();
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      startCount();
      observer.disconnect();
    }

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [value]);

  return (
    <div className="stat-item" ref={statRef}>
      <strong>{displayValue}</strong>
      <span>{label}</span>
    </div>
  );
}

function CountValue({ value }) {
  const valueRef = useRef(null);
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const element = valueRef.current;
    if (!element) return undefined;

    const { target, format } = parseStatValue(value);
    let rafId = 0;
    let started = false;

    const startCount = () => {
      if (started) return;
      started = true;
      const startTime = performance.now();

      function tick(now) {
        const elapsed = Math.min(1, (now - startTime) / 1200);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        setDisplayValue(format(target * eased));
        if (elapsed < 1) rafId = window.requestAnimationFrame(tick);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        startCount();
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      startCount();
      observer.disconnect();
    }

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [value]);

  return <span ref={valueRef}>{displayValue}</span>;
}

function Browse({
  agents,
  shelves,
  categories,
  category,
  setCategory,
  model,
  setModel,
  sortBy,
  setSortBy,
  publicOnly,
  setPublicOnly,
  query,
  setQuery,
  searchState,
  apiState,
  totalAgentCount,
  onOpenAgent,
  onUpload,
  onToast,
  devUserId,
  followedUsers,
  onFollow,
  onUnfollow,
}) {
  const browseRef = useRef(null);
  const dragCleanupsRef = useRef([]);

  useEffect(() => {
    const animatedElements = Array.from(
      browseRef.current?.querySelectorAll(".shelf, .agent-card") || [],
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("did-animate");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    animatedElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [apiState.status, shelves, agents]);

  useEffect(() => {
    dragCleanupsRef.current.forEach((cleanup) => cleanup());
    dragCleanupsRef.current = [];

    const frameId = window.requestAnimationFrame(() => {
      const tracks = Array.from(browseRef.current?.querySelectorAll(".shelf-track") || []);
      dragCleanupsRef.current = tracks.map((track) => {
        let velX = 0;
        let lastX = 0;
        let isPointerDown = false;
        let rafId = null;
        let wheelRafId = null;
        let wheelIdleTimer = null;
        let wheelVelX = 0;
        let lastTime = 0;
        let dragDistance = 0;
        let clearDragFlagTimer = null;

        const updateFade = () => {
          track.classList.toggle("has-scrolled-left", track.scrollLeft > 0);
        };

        function applyMomentum() {
          if (Math.abs(velX) < 0.5) {
            velX = 0;
            rafId = null;
            return;
          }

          track.scrollLeft += velX;
          velX *= 0.92;
          updateFade();
          rafId = window.requestAnimationFrame(applyMomentum);
        }

        function applyWheelMomentum() {
          if (Math.abs(wheelVelX) < 0.35) {
            wheelVelX = 0;
            wheelRafId = null;
            window.clearTimeout(wheelIdleTimer);
            wheelIdleTimer = window.setTimeout(() => {
              track.classList.remove("is-wheel-scrolling");
            }, 140);
            updateFade();
            return;
          }

          track.scrollLeft += wheelVelX;
          wheelVelX *= 0.84;
          updateFade();
          wheelRafId = window.requestAnimationFrame(applyWheelMomentum);
        }

        const handlePointerDown = (event) => {
          if (event.pointerType === "touch") return;

          isPointerDown = true;
          lastX = event.clientX;
          lastTime = performance.now();
          velX = 0;
          dragDistance = 0;
          window.clearTimeout(clearDragFlagTimer);
          track.dataset.wasDragging = "false";
          track.classList.add("dragging");
          track.style.cursor = "grabbing";

          if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
          }

          if (wheelRafId !== null) {
            window.cancelAnimationFrame(wheelRafId);
            wheelRafId = null;
          }
          wheelVelX = 0;
          track.classList.remove("is-wheel-scrolling");
        };

        const handlePointerMove = (event) => {
          if (!isPointerDown) return;

          const now = performance.now();
          const dt = Math.max(now - lastTime, 1);
          const dx = event.clientX - lastX;
          const nextDragDistance = dragDistance + Math.abs(dx);

          if (nextDragDistance <= 6) {
            dragDistance = nextDragDistance;
            lastX = event.clientX;
            lastTime = now;
            return;
          }

          event.preventDefault();

          velX = (dx / dt) * 16;
          dragDistance = nextDragDistance;
          if (dragDistance > 6) {
            browseRef.current?.classList.add("is-dragging");
            if (!track.hasPointerCapture(event.pointerId)) {
              track.setPointerCapture(event.pointerId);
            }
          }
          track.scrollLeft -= dx;
          lastX = event.clientX;
          lastTime = now;
          updateFade();
        };

        const stopDrag = (event) => {
          if (!isPointerDown) return;

          isPointerDown = false;
          const wasDragging = dragDistance > 6;
          track.dataset.wasDragging = wasDragging ? "true" : "false";
          if (wasDragging) {
            window.clearTimeout(clearDragFlagTimer);
            clearDragFlagTimer = window.setTimeout(() => {
              track.dataset.wasDragging = "false";
            }, 150);
          }
          dragDistance = 0;
          track.classList.remove("dragging");
          track.style.cursor = "grab";
          browseRef.current?.classList.remove("is-dragging");

          if (event?.pointerId !== undefined && track.hasPointerCapture(event.pointerId)) {
            track.releasePointerCapture(event.pointerId);
          }

          rafId = window.requestAnimationFrame(applyMomentum);
        };

        const handleWheel = (event) => {
          const horizontalDelta = Math.abs(event.deltaX);
          const verticalDelta = Math.abs(event.deltaY);
          const hasHorizontalIntent =
            horizontalDelta >= 5 && horizontalDelta > Math.max(1, verticalDelta * 1.15);
          const isShiftWheel = event.shiftKey && verticalDelta > horizontalDelta;

          if ((!hasHorizontalIntent && !isShiftWheel) || event.ctrlKey) return;

          event.preventDefault();
          event.stopPropagation();

          const wheelDelta = isShiftWheel ? event.deltaY : event.deltaX;
          const nextVelocity = wheelVelX + wheelDelta * 0.48;
          wheelVelX = Math.max(-46, Math.min(46, nextVelocity));
          track.classList.add("is-wheel-scrolling");
          window.clearTimeout(wheelIdleTimer);

          if (wheelRafId === null) {
            wheelRafId = window.requestAnimationFrame(applyWheelMomentum);
          }
        };

        updateFade();
        track.addEventListener("scroll", updateFade, { passive: true });
        track.addEventListener("pointerdown", handlePointerDown);
        track.addEventListener("pointermove", handlePointerMove);
        track.addEventListener("pointerup", stopDrag);
        track.addEventListener("pointercancel", stopDrag);
        track.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
          if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
          }
          if (wheelRafId !== null) {
            window.cancelAnimationFrame(wheelRafId);
          }

          track.dataset.wasDragging = "false";
          window.clearTimeout(clearDragFlagTimer);
          window.clearTimeout(wheelIdleTimer);
          track.style.cursor = "";
          track.classList.remove("dragging");
          track.classList.remove("is-wheel-scrolling");
          browseRef.current?.classList.remove("is-dragging");
          track.removeEventListener("scroll", updateFade);
          track.removeEventListener("pointerdown", handlePointerDown);
          track.removeEventListener("pointermove", handlePointerMove);
          track.removeEventListener("pointerup", stopDrag);
          track.removeEventListener("pointercancel", stopDrag);
          track.removeEventListener("wheel", handleWheel);
        };
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      dragCleanupsRef.current.forEach((cleanup) => cleanup());
      dragCleanupsRef.current = [];
    };
  }, [apiState.status, agents.length, shelves.length, category, model, sortBy]);

  function commitSearch() {
    setQuery(query.trim());
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setModel("all");
  }

  return (
    <section className="browse-page browse-container" ref={browseRef}>
      <div className="browse-hero">
        <div>
          <span className="eyebrow">Browse registry</span>
          <h2>Find an agent that already fits the job.</h2>
        </div>
        <button className="primary-btn" type="button" onClick={onUpload}>
          <Upload size={17} />
          Add agent
        </button>
      </div>

      <div className="browse-search-panel">
        <div className="steam-search">
          <label className="search-category" aria-label="Search category">
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {getCategoryLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <span className="search-divider" />
          <Search size={22} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents semantically or by keyword"
          />
          {searchState.status === "loading" ? <Loader2 className="spin" size={18} /> : null}
          <span className="search-kbd">{"\u2318K"}</span>
          <button className="search-submit" type="button" onClick={commitSearch}>
            Search
          </button>
        </div>

        <div className="filter-toolbar shelf-track" aria-label="Browse filters">
          <div className="flat-tabs filter-tabs" role="tablist" aria-label="Categories">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "flat-tab active" : "flat-tab"}
                type="button"
                onClick={() => setCategory(item)}
              >
                {getCategoryLabel(item)}
              </button>
            ))}
          </div>

          <span className="filter-divider" aria-hidden="true" />

          <div className="flat-tabs filter-tabs model-tabs" role="tablist" aria-label="Models">
            {modelOptions.map((item) => (
              <button
                key={item}
                className={model === item ? "flat-tab active" : "flat-tab"}
                type="button"
                onClick={() => setModel(item)}
              >
                {item === "all" ? "All models" : item}
              </button>
            ))}
          </div>

          <div className="filter-actions">
            <label className="toggle-field compact-filter-toggle">
              <input
                checked={publicOnly}
                onChange={(event) => setPublicOnly(event.target.checked)}
                type="checkbox"
              />
              <span>
                <Check size={13} />
              </span>
              Public only
            </label>

            <label className="compact-sort" aria-label="Sort agents">
              <SlidersHorizontal size={14} />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="newest">Newest</option>
                <option value="downloads">Most downloaded</option>
                <option value="endorsements">Most endorsed</option>
                <option value="similarity">Best match</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="browse-status-row">
        <span className="result-count">{totalAgentCount} agents</span>
      </div>

      {apiState.status === "loading" ? (
        <BrowseLoadingShelf />
      ) : apiState.status === "error" && !shelves.length ? (
        <div className="empty-state error-state">
          <Database className="empty-state-icon" size={32} />
          <h3>Unable to load agents</h3>
          <p>Please try again in a moment.</p>
        </div>
      ) : shelves.length ? (
        <div className="shelf-stack">
          {shelves.map((shelf, index) => (
            <Fragment key={shelf.title}>
              {index > 0 ? <ShelfDivider /> : null}
              <AgentShelf
                title={shelf.title}
                subtitle={shelf.subtitle}
                agents={shelf.agents}
                devUserId={devUserId}
                followedUsers={followedUsers}
                onFollow={onFollow}
                onOpenAgent={onOpenAgent}
                onToast={onToast}
                onUnfollow={onUnfollow}
              />
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search className="empty-state-icon" size={32} />
          <h3>No agents found</h3>
          <p>Try a different search or clear your filters.</p>
          <button className="ghost-btn" type="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}

function ShelfDivider() {
  return (
    <div className="shelf-divider" aria-hidden="true">
      <span className="divider-line" />
      <span className="divider-dots">{"\u00b7\u00b7\u00b7"}</span>
      <span className="divider-line" />
    </div>
  );
}

function BrowseLoadingShelf() {
  return (
    <div className="shelf-stack">
      <section className="shelf agent-shelf loading-shelf">
        <div className="shelf-track skeleton-track" role="presentation" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <span className="skeleton-icon" />
              <span className="skeleton-line title" />
              <span className="skeleton-line wide" />
              <span className="skeleton-line medium" />
              <span className="skeleton-tags">
                <span />
                <span />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function VisibilityBadge({ visibility }) {
  if (!visibility || visibility === "public") return null;
  const config = {
    private: { label: "Private", color: "rgba(248,113,113,0.12)", textColor: "#f87171", icon: Lock },
    followers_only: {
      label: "Followers only",
      color: "rgba(96,165,250,0.12)",
      textColor: "#60a5fa",
      icon: Users,
    },
    org_only: {
      label: "Org only",
      color: "rgba(168,85,247,0.12)",
      textColor: "#a855f7",
      icon: Building2,
    },
  };
  const c = config[visibility];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className="visibility-badge" style={{ background: c.color, color: c.textColor }}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function VisibilityDropdown({
  visibility,
  onChange,
  buttonLabel,
  align = "right",
  disabled = false,
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function selectVisibility(nextVisibility) {
    setOpen(false);
    if (nextVisibility === visibility || pending) return;
    setPending(true);
    try {
      await onChange?.(nextVisibility);
    } catch {
      // The caller owns the toast and optimistic rollback.
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`visibility-menu-wrapper align-${align}`} ref={ref}>
      <button
        aria-expanded={open}
        className="ghost-btn visibility-menu-trigger"
        disabled={disabled || pending}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        {pending ? <Loader2 className="spin" size={14} /> : null}
        {buttonLabel || getVisibilityLabel(visibility)}
        <ChevronDown size={13} />
      </button>
      <div className={`nav-dropdown visibility-menu ${open ? "nav-dropdown--open" : ""}`} role="menu">
        {visibilityOptions.map((option) => (
          <button
            className={option.value === visibility ? "nav-dropdown-item active" : "nav-dropdown-item"}
            key={option.value}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void selectVisibility(option.value);
            }}
          >
            {option.value === "private" ? (
              <Lock size={15} />
            ) : option.value === "followers_only" ? (
              <Users size={15} />
            ) : option.value === "org_only" ? (
              <Building2 size={15} />
            ) : (
              <Globe size={15} />
            )}
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FollowButton({ userId, followedUsers, onFollow, onUnfollow, onToast }) {
  const [pending, setPending] = useState(false);
  const isFollowing = followedUsers?.has(String(userId));

  async function toggleFollow(event) {
    event.stopPropagation();
    if (pending || userId == null) return;
    setPending(true);
    try {
      if (isFollowing) {
        await onUnfollow?.(userId);
      } else {
        await onFollow?.(userId);
      }
    } catch {
      if (!onFollow || !onUnfollow) {
        onToast?.("Could not update follow state.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className={isFollowing ? "follow-mini-btn is-following" : "follow-mini-btn"}
      disabled={pending}
      type="button"
      onClick={toggleFollow}
    >
      {pending ? <Loader2 className="spin" size={12} /> : null}
      {isFollowing ? "Following" : "+ Follow"}
    </button>
  );
}

function AgentShelf({
  title,
  subtitle,
  agents,
  onOpenAgent,
  onToast,
  devUserId,
  followedUsers,
  onFollow,
  onUnfollow,
}) {
  return (
    <section className="shelf agent-shelf will-animate">
      <div className="shelf-header">
        <div className="shelf-title-line">
          <h3>{title}</h3>
          <span aria-hidden="true">{"\u00b7"}</span>
          <p>{subtitle}</p>
        </div>
        <button
          className="see-all-link"
          type="button"
          onClick={() => onToast("Full category view coming soon.")}
        >
          {"See all \u2192"}
        </button>
      </div>
      <div className="agent-row shelf-track" role="list">
        {agents.map((agent, index) => (
          <AgentCard
            key={`${title}-${agent.id}`}
            agent={agent}
            devUserId={devUserId}
            followedUsers={followedUsers}
            index={index}
            onOpen={() => onOpenAgent(agent)}
            onFollow={onFollow}
            onToast={onToast}
            onUnfollow={onUnfollow}
          />
        ))}
      </div>
    </section>
  );
}

function AgentCard({
  agent,
  index,
  onOpen,
  className = "",
  style = undefined,
  devUserId = null,
  followedUsers = new Set(),
  onFollow,
  onUnfollow,
  onToast,
}) {
  const [transform, setTransform] = useState(undefined);
  const similarity = Number(agent.similarity);
  const hasSimilarity = Number.isFinite(similarity);
  const matchPercent = Math.round(getMatchScore(agent) * 100);
  const averageRating = Number(agent.averageRating ?? 0);
  const reviewCount = Number(agent.reviewCount ?? 0);
  const hasReviews = reviewCount > 0 && Number.isFinite(averageRating) && averageRating > 0;
  const owner = isAgentOwner(agent, devUserId);
  const canFollow = agent.uploader_id != null && !owner;

  if (agent.visibility === "private" && !owner) return null;

  const handleMouseMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const offsetY = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    const rotateY = Math.max(-4, Math.min(4, offsetX * 4));
    const rotateX = Math.max(-4, Math.min(4, -offsetY * 4));
    setTransform(
      `perspective(600px) translateY(-4px) rotate(-0.3deg) rotateX(${rotateX.toFixed(
        2,
      )}deg) rotateY(${rotateY.toFixed(2)}deg)`,
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTransform(undefined);
  }, []);

  const handleClick = useCallback(
    (event) => {
      const track = event.currentTarget.closest(".shelf-track");
      if (track?.dataset.wasDragging === "true") {
        track.dataset.wasDragging = "false";
        return;
      }
      onOpen();
    },
    [onOpen],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onOpen();
    },
    [onOpen],
  );

  return (
    <article
      className={`agent-card will-animate ${className}`.trim()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="listitem"
      tabIndex={0}
      style={{
        transform,
        transitionDelay: transform ? "0ms" : `${index * 35}ms`,
        ...style,
      }}
    >
      <span className="agent-card-topline">
        <span className="agent-icon">
          <FileCode2 size={19} />
        </span>
        {hasSimilarity ? (
          <span className="mini-badge match-badge">
            <Search size={12} />
            {matchPercent}% match
          </span>
        ) : agent.featured ? (
          <span className="mini-badge">
            <Star size={12} />
            Featured
          </span>
        ) : null}
        <span className="mini-badge rating-badge">
          <Star size={12} />
          {hasReviews ? `${averageRating.toFixed(1)} (${reviewCount})` : "No ratings"}
        </span>
      </span>
      <span className="agent-card-title-line">
        <strong>{agent.name}</strong>
        {owner ? <VisibilityBadge visibility={agent.visibility} /> : null}
      </span>
      <span className="agent-description">{agent.description}</span>
      <span className="agent-meta">
        <span>{getCategoryLabel(agent.category)}</span>
        <span>{agent.model}</span>
      </span>
      <span className="agent-card-footer">
        <span className="agent-card-uploader">
          <Users size={13} />
          {agent.team}
        </span>
        {canFollow ? (
          <FollowButton
            followedUsers={followedUsers}
            onFollow={onFollow}
            onToast={onToast}
            onUnfollow={onUnfollow}
            userId={agent.uploader_id}
          />
        ) : (
          <span className="agent-file-name" title={agent.file_name}>
            <FileCode2 size={13} />
            {agent.file_name}
          </span>
        )}
      </span>
    </article>
  );
}

function AgentPage({
  agent,
  allAgents,
  currentUser,
  devUserId,
  followedUsers,
  onBack,
  onFollow,
  onNavigateToAgent,
  onOpenProfile,
  onToast = () => {},
  onUnfollow,
  onUpdateVisibility,
}) {
  const pageRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const validationTimerRef = useRef(null);
  const tone = getCategoryTone(agent.category);
  const owner = isAgentOwner(agent, devUserId);
  const mediaItems = useMemo(() => getAgentMedia(agent), [agent]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mediaFading, setMediaFading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(agent.downloads || 0);
  const [reviews, setReviews] = useState([]);
  const [reviewSort, setReviewSort] = useState("recent");
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [invalidFields, setInvalidFields] = useState({});
  const [newReviewIds, setNewReviewIds] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: "",
    body: "",
    constraints: "",
  });

  useEffect(() => {
    let ignore = false;
  
    async function loadReviews() {
      setActiveMediaIndex(0);
      setMediaFading(false);
      setDownloadCount(agent.downloads || 0);
      setReviewSort("recent");
      setReviewFormOpen(false);
      setHoverRating(0);
      setInvalidFields({});
      setNewReviewIds([]);
      setReviewForm({
        rating: 0,
        title: "",
        body: "",
        constraints: "",
      });
  
      try {
        const data = await getAgentReviews(agent.id);
  
        if (ignore) return;
  
        const loadedReviews = Array.isArray(data.reviews)
          ? data.reviews.map((review, index) => normalizeReview(review, index, agent))
          : [];
  
        setReviews(loadedReviews);
      } catch (error) {
        console.error("Could not load reviews:", error);
  
        if (!ignore) {
          setReviews([]);
        }
      }
    }
  
    loadReviews();
  
    return () => {
      ignore = true;
    };
  }, [agent]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const animatedElements = Array.from(
      root.querySelectorAll(".agent-reveal, .agent-sidebar-card"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("did-animate");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    animatedElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [agent.id]);

  useEffect(() => {
    return () => {
      window.clearTimeout(fadeTimerRef.current);
      window.clearTimeout(validationTimerRef.current);
    };
  }, []);

  const relatedAgents = useMemo(
    () => {
      const sameCategory = allAgents.filter(
        (candidate) =>
          String(candidate.id) !== String(agent.id) && candidate.category === agent.category,
      );
      const fallback = allAgents.filter(
        (candidate) =>
          String(candidate.id) !== String(agent.id) && candidate.category !== agent.category,
      );

      return [...sameCategory, ...fallback].slice(0, 3);
    },
    [agent.category, agent.id, allAgents],
  );

  const activeMedia = mediaItems[activeMediaIndex] || mediaItems[0];
  const reviewSummary = useMemo(() => getReviewSummary(reviews), [reviews]);
  const sortedReviews = useMemo(() => sortReviews(reviews, reviewSort), [reviewSort, reviews]);
  const organizationLabel = agent.orgName || agent.org_id || agent.orgId || "";
  const groupLabel = agent.groupName || agent.group_id || agent.groupId || "";
  const metadataRows = [
    ["File", agent.file_name],
    ["Model", agent.model],
    ["Visibility", getVisibilityLabel(agent.visibility)],
    ["Organization", organizationLabel],
    ["Group", groupLabel],
    ["Category", getCategoryLabel(agent.category)],
    ["Uploaded", formatDate(agent.created_at)],
    ["Embedding model", agent.embedding_model],
    ["Tools / integrations", agent.toolsIntegrations],
    ["Prerequisites", agent.prerequisites],
    ["Input format", agent.inputFormat],
    ["Output format", agent.outputFormat],
    ["Use cases", agent.useCases],
    ["Example prompts", agent.examplePrompts],
    ["Limitations", agent.limitations],
    ["When to use", agent.whenToUse],
    ["When not to use", agent.whenNotToUse],
    ["Setup instructions", agent.setupInstructions],
    ["Expected users", agent.expectedUsers],
    ["Tags", agent.tags],
  ].filter(Boolean);

  function selectMedia(index) {
    if (index === activeMediaIndex) return;

    window.clearTimeout(fadeTimerRef.current);
    setMediaFading(true);
    fadeTimerRef.current = window.setTimeout(() => {
      setActiveMediaIndex(index);
      setMediaFading(false);
    }, 120);
  }

  async function handleDownload() {
    try {
      const { blob, filename } = await downloadAgentFile(agent.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename || `agent-${agent.id}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setDownloadCount((current) => current + 1);
      onToast("Download started.");
    } catch (error) {
      const message = error.message && !/^Request failed/i.test(error.message)
        ? `Download failed. ${error.message}`
        : "Download failed. Please try again.";
      onToast(message);
    }
  }

  function updateReviewForm(field, value) {
    setReviewForm((current) => ({ ...current, [field]: value }));
  }

  function handleReviewVote(reviewId, vote) {
    setReviews((current) =>
      current.map((review) => {
        if (review.id !== reviewId || review.userVote === vote) return review;

        const nextReview = { ...review };
        if (review.userVote === "helpful") {
          nextReview.helpfulCount = Math.max(0, nextReview.helpfulCount - 1);
        }
        if (review.userVote === "not-helpful") {
          nextReview.notHelpfulCount = Math.max(0, nextReview.notHelpfulCount - 1);
        }
        if (vote === "helpful") {
          nextReview.helpfulCount += 1;
        } else {
          nextReview.notHelpfulCount += 1;
        }
        nextReview.userVote = vote;
        return nextReview;
      }),
    );
    onToast(vote === "helpful" ? "Marked as helpful" : "Marked as not helpful");
  }

  async function submitReview(event) {
    event.preventDefault();
  
    const missing = {
      rating: reviewForm.rating < 1,
      body: !reviewForm.body.trim(),
      constraints: !reviewForm.constraints.trim(),
    };
  
    if (missing.rating || missing.body || missing.constraints) {
      setInvalidFields(missing);
      window.clearTimeout(validationTimerRef.current);
      validationTimerRef.current = window.setTimeout(() => setInvalidFields({}), 340);
      return;
    }
  
    try {
      const result = await saveAgentReview(agent.id, {
        rating: reviewForm.rating,
        title: reviewForm.title.trim() || `Review for ${agent.name}`,
        body: reviewForm.body.trim(),
        constraints: reviewForm.constraints.trim(),
      });
  
      const savedReview = normalizeReview(result.review, 0, agent);
  
      setReviews((current) => {
        const withoutExisting = current.filter(
          (review) => String(review.id) !== String(savedReview.id),
        );
  
        return [savedReview, ...withoutExisting];
      });
  
      setNewReviewIds((current) => [savedReview.id, ...current]);
      setReviewForm({
        rating: 0,
        title: "",
        body: "",
        constraints: "",
      });
      setHoverRating(0);
      setReviewSort("recent");
      setReviewFormOpen(false);
      onToast("Review posted");
    } catch (error) {
      console.error("Review submit failed:", error);
      onToast(error.message || "Could not post review");
    }
  }

  return (
    <section
      className="agent-page"
      ref={pageRef}
      style={{
        "--category-color": tone.color,
        "--category-soft": tone.soft,
      }}
    >
      <div className="agent-main-column">
        <div className="agent-topbar">
          <nav className="agent-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={onBack}>
              Atlas Hub
            </button>
            <span>/</span>
            <button type="button" onClick={onBack}>
              Browse
            </button>
            <span>/</span>
            <button type="button" onClick={onBack}>
              {getCategoryLabel(agent.category)}
            </button>
            <span>/</span>
            <span>{agent.name}</span>
          </nav>
          <button className="agent-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
        </div>

        <header className="agent-page-header">
          <div className="agent-title-row">
            <span className="agent-large-icon">
              <FileCode2 size={28} />
            </span>
            <div className="agent-title-copy">
              <h1>{agent.name}</h1>
              <div className="agent-title-tags">
                <span>{getCategoryLabel(agent.category)}</span>
                <span>{agent.model}</span>
                {owner ? <VisibilityBadge visibility={agent.visibility} /> : null}
                {agent.featured ? <span>Featured</span> : null}
              </div>
            </div>
          </div>

          <div className="uploader-row">
            <button
              className="profile-link-avatar"
              type="button"
              onClick={() => onOpenProfile(buildProfileFromTeam(agent.team, currentUser))}
            >
              <span className="avatar-circle">{getTeamInitials(agent.team)}</span>
            </button>
            <span>
              Published by{" "}
              <button
                type="button"
                onClick={() => onOpenProfile(buildProfileFromTeam(agent.team, currentUser))}
              >
                {agent.team}
              </button>
            </span>
            <span>{formatDate(agent.created_at)}</span>
            {owner ? (
              <VisibilityDropdown
                align="left"
                buttonLabel="Edit visibility"
                onChange={(visibility) => onUpdateVisibility?.(agent.id, visibility)}
                visibility={agent.visibility}
              />
            ) : agent.uploader_id != null ? (
              <FollowButton
                followedUsers={followedUsers}
                onFollow={onFollow}
                onToast={onToast}
                onUnfollow={onUnfollow}
                userId={agent.uploader_id}
              />
            ) : null}
          </div>
        </header>

        <section className="media-gallery agent-reveal will-animate" aria-label="Agent media">
          <div className={`media-main ${mediaFading ? "is-fading" : ""}`}>
            <AgentMediaFrame item={activeMedia} agent={agent} />
          </div>
          <p className="media-caption">{activeMedia?.caption}</p>
          <div className="thumbnail-strip" role="list" aria-label="Media thumbnails">
            {mediaItems.map((item, index) => (
              <button
                className={index === activeMediaIndex ? "media-thumb active" : "media-thumb"}
                key={`${item.caption}-${index}`}
                type="button"
                onClick={() => selectMedia(index)}
                aria-label={`Show ${item.caption}`}
              >
                <AgentMediaFrame item={item} agent={agent} compact />
              </button>
            ))}
          </div>
        </section>

        <ShelfDivider />

        <section className="agent-content-section agent-reveal will-animate">
          <h2>Overview</h2>
          <p>{agent.description}</p>
          {agent.manual ? <pre className="manual-box">{agent.manual}</pre> : null}
        </section>

        <ShelfDivider />

        <section className="agent-content-section agent-reveal will-animate">
          <h2>Constraints & metadata</h2>
          <dl className="metadata-list">
            {metadataRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd style={{ whiteSpace: "pre-line" }}>{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ShelfDivider />

        <section className="agent-content-section reviews-section agent-reveal will-animate">
          <h2>Reviews</h2>
          <ReviewSummary summary={reviewSummary} />
          <div className="review-sort-row">
            <span>Sort by</span>
            <div className="review-sort-tabs" role="tablist" aria-label="Sort reviews">
              {[
                ["recent", "Most recent"],
                ["helpful", "Most helpful"],
                ["highest", "Highest rated"],
              ].map(([value, label]) => (
                <button
                  className={reviewSort === value ? "review-sort-tab active" : "review-sort-tab"}
                  key={value}
                  type="button"
                  onClick={() => setReviewSort(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="review-list">
            {sortedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isNew={newReviewIds.includes(review.id)}
                onVote={handleReviewVote}
                onOpenProfile={() =>
                  onOpenProfile(buildProfileFromAuthor(review, currentUser))
                }
              />
            ))}
          </div>
          {reviewFormOpen ? (
            <ReviewForm
              form={reviewForm}
              hoverRating={hoverRating}
              invalidFields={invalidFields}
              onHoverRating={setHoverRating}
              onSubmit={submitReview}
              onUpdate={updateReviewForm}
            />
          ) : (
            <button
              className="secondary-btn review-write-toggle"
              type="button"
              onClick={() => setReviewFormOpen(true)}
            >
              <Plus size={16} />
              Write a review
            </button>
          )}
        </section>
      </div>

      <aside className="agent-sidebar">
        <section className="agent-sidebar-card download-card will-animate">
          <button className="primary-btn download-action" type="button" onClick={handleDownload}>
            <Download size={17} />
            Download agent
          </button>
          <div className="download-meta">
            <span>{formatNumber(downloadCount)} downloads</span>
            <span>{agent.file_name}</span>
          </div>
        </section>

        <section className="agent-sidebar-card will-animate">
          <div className="sidebar-stats-grid">
            <div>
              <strong>
                <CountValue value={agent.endorsements} />
              </strong>
              <span>Endorsements</span>
            </div>
            <div>
              <strong>
                <CountValue value={downloadCount} />
              </strong>
              <span>Downloads</span>
            </div>
            <div>
              <strong>{agent.model}</strong>
              <span>Model</span>
            </div>
            <div>
              <strong>{getCategoryLabel(agent.category)}</strong>
              <span>Category</span>
            </div>
          </div>
        </section>

        <button
          className="agent-sidebar-card author-card will-animate"
          type="button"
          onClick={() => onOpenProfile(buildProfileFromTeam(agent.team, currentUser))}
        >
          <span className="avatar-circle">{getTeamInitials(agent.team)}</span>
          <span>
            <strong>{agent.team}</strong>
            <small>Contributing team</small>
          </span>
        </button>

        <section className="agent-sidebar-card will-animate">
          <h2 className="sidebar-card-title">Related agents</h2>
          {relatedAgents.length ? (
            <div className="related-list">
              {relatedAgents.map((related) => {
                const relatedTone = getCategoryTone(related.category);
                return (
                  <button
                    key={related.id}
                    className="related-agent-row"
                    type="button"
                    onClick={() => onNavigateToAgent(related)}
                    style={{
                      "--category-color": relatedTone.color,
                      "--category-soft": relatedTone.soft,
                    }}
                  >
                    <span className="related-icon">
                      <FileCode2 size={16} />
                    </span>
                    <span>
                      <strong>{related.name}</strong>
                      <small>{getCategoryLabel(related.category)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="related-empty">No same-category agents yet.</p>
          )}
        </section>
      </aside>
    </section>
  );
}

function AgentMediaFrame({ item, agent, compact = false }) {
  if (item?.url && item.type === "video") {
    return compact ? (
      <div className="media-video-thumb">
        <video src={item.url} muted preload="metadata" />
        <span>
          <FileCode2 size={compact ? 18 : 30} />
        </span>
      </div>
    ) : (
      <video className="media-asset" src={item.url} controls />
    );
  }

  if (item?.url) {
    return <img className="media-asset" src={item.url} alt={item.caption || agent.name} />;
  }

  return <AgentMediaPlaceholder agent={agent} variant={item?.variant || 0} compact={compact} />;
}

function AgentMediaPlaceholder({ agent, variant = 0, compact = false }) {
  const tone = getCategoryTone(agent.category);
  const icons = [FileCode2, Layers3, Star, Database];
  const Icon = icons[variant % icons.length];

  return (
    <div
      className={compact ? "media-placeholder compact" : "media-placeholder"}
      style={{
        "--category-color": tone.color,
        "--category-soft": tone.soft,
      }}
    >
      <Icon size={compact ? 22 : 54} />
    </div>
  );
}

function ReviewSummary({ summary }) {
  const levels = [5, 4, 3, 2, 1];
  const total = summary.total || 0;

  return (
    <div className="review-summary">
      <div className="review-score">
        <strong>{summary.average.toFixed(1)}</strong>
        <span>out of 5</span>
      </div>
      <div className="review-bar-stack">
        {levels.map((level) => {
          const count = summary.counts[level] || 0;
          const percent = total ? (count / total) * 100 : 0;
          return (
            <div className="review-bar-row" key={level}>
              <span>{level}</span>
              <div className="review-bar-track">
                <span className="review-bar-fill" style={{ "--fill-width": `${percent}%` }} />
              </div>
              <span>{count}</span>
            </div>
          );
        })}
        <p className="review-total">
          {total} {total === 1 ? "review" : "reviews"}
        </p>
      </div>
    </div>
  );
}

function ReviewStars({
  rating,
  interactive = false,
  hoverRating = 0,
  invalid = false,
  onHoverRating = () => {},
  onRatingChange = () => {},
}) {
  const activeRating = interactive ? hoverRating || rating : rating;
  const stars = [1, 2, 3, 4, 5];

  if (!interactive) {
    return (
      <span className="review-stars" aria-label={`${rating} out of 5 stars`}>
        {stars.map((star) => (
          <Star
            className={star <= rating ? "star-icon filled" : "star-icon empty"}
            fill="currentColor"
            key={star}
            size={14}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      className={`review-stars rating-picker ${invalid ? "shake-field" : ""}`}
      onMouseLeave={() => onHoverRating(0)}
      role="radiogroup"
      aria-label="Review rating"
    >
      {stars.map((star) => (
        <button
          aria-checked={rating === star}
          aria-label={`${star} stars`}
          className={star <= activeRating ? "star-button filled" : "star-button empty"}
          key={star}
          onClick={() => onRatingChange(star)}
          onMouseEnter={() => onHoverRating(star)}
          role="radio"
          type="button"
        >
          <Star fill="currentColor" size={22} />
        </button>
      ))}
    </span>
  );
}

function ReviewCard({ review, isNew, onVote, onOpenProfile }) {
  return (
    <article className={`review-card ${isNew ? "is-new" : ""}`}>
      <header className="review-card-header">
        <button className="review-avatar profile-link-avatar" type="button" onClick={onOpenProfile}>
          {review.authorInitials}
        </button>
        <span className="review-author">
          <button className="review-author-link" type="button" onClick={onOpenProfile}>
            <strong>{review.authorName}</strong>
          </button>
          <small>{review.authorTeam}</small>
        </span>
        <ReviewStars rating={review.rating} />
        <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
      </header>
      <h3>{review.title}</h3>
      <p>{review.body}</p>
      {review.constraints ? (
        <div className="review-constraints">
          <span className="review-warning" aria-hidden="true">
            {"\u26a0"}
          </span>
          <span>{review.constraints}</span>
        </div>
      ) : null}
      <div className="review-helpful">
        <span>Was this helpful?</span>
        <button
          className={review.userVote === "helpful" ? "active" : ""}
          disabled={review.userVote === "helpful"}
          type="button"
          onClick={() => onVote(review.id, "helpful")}
        >
          Yes ({review.helpfulCount})
        </button>
        <button
          className={review.userVote === "not-helpful" ? "active" : ""}
          disabled={review.userVote === "not-helpful"}
          type="button"
          onClick={() => onVote(review.id, "not-helpful")}
        >
          No ({review.notHelpfulCount})
        </button>
      </div>
    </article>
  );
}

function ReviewForm({
  form,
  hoverRating,
  invalidFields,
  onHoverRating,
  onSubmit,
  onUpdate,
}) {
  return (
    <form className="review-form-panel" onSubmit={onSubmit}>
      <label className="review-form-rating">
        <span>Rating</span>
        <ReviewStars
          rating={form.rating}
          interactive
          hoverRating={hoverRating}
          invalid={invalidFields.rating}
          onHoverRating={onHoverRating}
          onRatingChange={(rating) => onUpdate("rating", rating)}
        />
      </label>
      <label>
        <span>Title</span>
        <input
          value={form.title}
          onChange={(event) => onUpdate("title", event.target.value)}
          placeholder="Summarise your experience"
        />
      </label>
      <label>
        <span>Review</span>
        <textarea
          className={invalidFields.body ? "shake-field" : ""}
          value={form.body}
          onChange={(event) => onUpdate("body", event.target.value)}
          placeholder="What worked well? What didn't?"
        />
      </label>
      <label>
        <span>Limitations found (optional)</span>
        <textarea
          className={`constraints-input ${invalidFields.constraints ? "shake-field" : ""}`}
          value={form.constraints}
          onChange={(event) => onUpdate("constraints", event.target.value)}
          placeholder="Edge cases, model quirks, things to watch out for"
        />
      </label>
      <button className="primary-btn review-submit-btn" type="submit">
        <Send size={16} />
        Post review
      </button>
    </form>
  );
}

function UploadPage({ currentUser, onUploaded, onBack, onToast }) {
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const submitTimerRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    userDescription: "",
    userManual: "",
    category: "general",
    model: "",
    toolsIntegrations: "",
    prerequisites: "",
    inputFormat: "",
    outputFormat: "",
    useCases: "",
    examplePrompts: "",
    limitations: "",
    whenToUse: "",
    whenNotToUse: "",
    setupInstructions: "",
    expectedUsers: "",
    tags: "",
    visibility: "public",
    orgId: "",
    groupId: "",
  });
  const [file, setFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [state, setState] = useState({ status: "idle", message: "" });
  const [groups, setGroups] = useState([]);
  const [groupsState, setGroupsState] = useState({ status: "idle", message: "" });
  const [magicState, setMagicState] = useState({ status: "idle", message: "" });
  const [analysisFeedback, setAnalysisFeedback] = useState({ warnings: [], missingFields: [] });
  const [magicVisible, setMagicVisible] = useState(false);

  const detailsDone = Boolean(form.title.trim() && form.userDescription.trim());
  const publishDone = state.status === "success";
  const manageableOrganizations = useMemo(
    () => (currentUser.organizations || []).filter(canManageOrganization),
    [currentUser.organizations],
  );
  const selectedUploadOrg = manageableOrganizations.find(
    (org) => String(org.id) === String(form.orgId),
  );
  const selectedUploadGroup = groups.find((group) => String(group.id) === String(form.groupId));
  const publishDisabled =
    !file ||
    state.status === "loading" ||
    state.status === "success" ||
    (form.visibility === "group_only" && (!form.orgId || !form.groupId));
  const visibilityDescription =
    form.visibility === "group_only" && selectedUploadGroup
      ? `Only members of ${selectedUploadGroup.name} can see this`
      : form.visibility === "group_only" && selectedUploadOrg
        ? `Only members of a ${selectedUploadOrg.name} group can see this`
        : form.visibility === "org_only" && selectedUploadOrg
      ? `Only members of ${selectedUploadOrg.name} can see this`
      : getVisibilityDescription(form.visibility);

  useEffect(() => {
    if (form.visibility !== "group_only" || !form.orgId) {
      setGroups([]);
      setGroupsState({ status: "idle", message: "" });
      return undefined;
    }

    let ignore = false;
    setGroupsState({ status: "loading", message: "Loading groups" });

    async function loadGroups() {
      try {
        const data = await getOrganizationGroups(form.orgId);
        if (ignore) return;
        const nextGroups = extractAgentList(data).map(normalizeGroup);
        setGroups(nextGroups);
        setGroupsState({
          status: "done",
          message: nextGroups.length ? "" : "No groups found for this organization.",
        });
        setForm((current) => ({
          ...current,
          groupId: nextGroups.some((group) => String(group.id) === String(current.groupId))
            ? current.groupId
            : "",
        }));
      } catch (error) {
        if (ignore) return;
        setGroups([]);
        setGroupsState({
          status: "error",
          message: "Could not load groups for this organization.",
        });
        setForm((current) => ({ ...current, groupId: "" }));
      }
    }

    loadGroups();

    return () => {
      ignore = true;
    };
  }, [form.orgId, form.visibility]);

  useEffect(() => {
    setMagicState({ status: "idle", message: "" });

    if (!file) {
      setMagicVisible(false);
      return undefined;
    }

    setMagicVisible(false);
    const frameId = window.requestAnimationFrame(() => setMagicVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [file]);

  useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return undefined;

    let dragDepth = 0;

    const preventDrag = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleDragEnter = (event) => {
      preventDrag(event);
      dragDepth += 1;
      setIsDragActive(true);
    };

    const handleDragOver = (event) => {
      preventDrag(event);
      setIsDragActive(true);
    };

    const handleDragLeave = (event) => {
      preventDrag(event);
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsDragActive(false);
    };

    const handleDrop = (event) => {
      preventDrag(event);
      dragDepth = 0;
      setIsDragActive(false);
      const nextFile = event.dataTransfer?.files?.[0];
      if (nextFile) selectFile(nextFile);
    };

    zone.addEventListener("dragenter", handleDragEnter);
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", handleDrop);

    return () => {
      zone.removeEventListener("dragenter", handleDragEnter);
      zone.removeEventListener("dragover", handleDragOver);
      zone.removeEventListener("dragleave", handleDragLeave);
      zone.removeEventListener("drop", handleDrop);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("custom-cursor-drop-active", isDragActive);
    return () => document.body.classList.remove("custom-cursor-drop-active");
  }, [isDragActive]);

  useEffect(() => {
    return () => window.clearTimeout(submitTimerRef.current);
  }, []);

  function updateField(field, value) {
    const nextValue =
      field === "userDescription" ? String(value).slice(0, descriptionLimit) : value;
    setForm((current) => {
      if (field === "orgId") {
        return {
          ...current,
          orgId: nextValue,
          groupId: "",
          visibility:
            nextValue && current.visibility !== "group_only" ? "org_only" : current.visibility,
        };
      }

      if (field === "visibility" && nextValue !== "org_only" && nextValue !== "group_only") {
        return { ...current, visibility: nextValue, orgId: "", groupId: "" };
      }

      if (field === "visibility" && nextValue === "org_only") {
        return { ...current, visibility: nextValue, groupId: "" };
      }

      return { ...current, [field]: nextValue };
    });
    if (state.status === "error") setState({ status: "idle", message: "" });
  }

  function selectFile(nextFile) {
    setFile(nextFile);
    setState({ status: "idle", message: "" });
    setMagicState({ status: "idle", message: "" });
    setAnalysisFeedback({ warnings: [], missingFields: [] });
  }

  function clearFile() {
    setFile(null);
    setState({ status: "idle", message: "" });
    setMagicState({ status: "idle", message: "" });
    setAnalysisFeedback({ warnings: [], missingFields: [] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function buildAgentPayload() {
    const payload = new FormData();
    payload.append("agentFile", file);
    payload.append("title", form.title.trim());
    payload.append("category", form.category);
    payload.append("model", form.model.trim());
    payload.append("description", form.userDescription.trim());
    payload.append("manual", form.userManual.trim());
    payload.append("visibility", form.visibility);
    if (form.orgId) payload.append("org_id", form.orgId);
    if (form.groupId) {
      payload.append("group_id", form.groupId);
      payload.append("groupId", form.groupId);
    }

    uploadMetadataFields.forEach((field) => {
      payload.append(field, String(form[field] || "").trim());
    });

    return payload;
  }

  function hydrateAnalysisFields(rawData) {
    const response = rawData || {};
    const data = getAnalysisData(rawData);
    const nextValues = {
      title: getFirstValue(data, ["title", "name"]),
      category: getFirstValue(data, ["category"]),
      model: getFirstValue(data, ["model"]),
      userDescription: getFirstValue(data, ["description", "shortDescription", "userDescription"]),
      userManual: getFirstValue(data, ["manual", "setupManual", "userManual"]),
      toolsIntegrations: getFirstValue(data, ["toolsIntegrations", "tools", "integrations"]),
      prerequisites: getFirstValue(data, ["prerequisites"]),
      inputFormat: getFirstValue(data, ["inputFormat", "inputs"]),
      outputFormat: getFirstValue(data, ["outputFormat", "outputs"]),
      useCases: getFirstValue(data, ["useCases"]),
      examplePrompts: getFirstValue(data, ["examplePrompts", "exampleQueries", "exampleSearchQueries"]),
      limitations: getFirstValue(data, ["limitations"]),
      whenToUse: getFirstValue(data, ["whenToUse"]),
      whenNotToUse: getFirstValue(data, ["whenNotToUse"]),
      setupInstructions: getFirstValue(data, ["setupInstructions", "setup"]),
      expectedUsers: getFirstValue(data, ["expectedUsers", "expectedUsersTeam", "targetUsers"]),
      tags: getFirstValue(data, ["tags", "keywords"]),
    };

    Object.entries(nextValues).forEach(([field, value]) => {
      const formattedValue = toDisplayList(value);
      if (formattedValue) updateField(field, formattedValue);
    });

    const warnings =
      data.warnings || data.metadataWarnings || data.suggestedFixes || response.warnings || [];
    const missingFields =
      data.missingFields || data.missing_fields || response.missingFields || response.missing_fields || [];

    setAnalysisFeedback({
      warnings: Array.isArray(warnings) ? warnings : [],
      missingFields: Array.isArray(missingFields) ? missingFields : [],
    });
  }

  async function handleMagic() {
    if (!file) {
      setMagicState({ status: "error", message: "Choose an agent file before analyzing." });
      return;
    }

    setMagicState({ status: "loading", message: "Analyzing agent metadata..." });
    setAnalysisFeedback({ warnings: [], missingFields: [] });
    try {
      const result = await analyzeAgent(buildAgentPayload());
      hydrateAnalysisFields(result);
      setMagicState({ status: "done", message: "Analysis complete. Review the suggested fields." });
    } catch (error) {
      setMagicState({
        status: "error",
        message: error.message || "Analysis failed - fill fields manually.",
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setState({ status: "error", message: "Choose an agent file first." });
      return;
    }
    if (!form.title.trim()) {
      setState({ status: "error", message: "Add a title before uploading." });
      return;
    }
    if (form.visibility === "group_only" && !form.orgId) {
      setState({ status: "error", message: "Choose an organization for group-only visibility." });
      return;
    }
    if (form.visibility === "group_only" && !form.groupId) {
      setState({ status: "error", message: "Choose a group before publishing." });
      onToast("Choose a group before publishing.");
      return;
    }

    setState({ status: "loading", message: "Publishing agent" });
    try {
      const result = await publishAgent(buildAgentPayload());
      const uploadedAgent = {
        id: result?.data?.id || Date.now(),
        name: result?.data?.title || form.title,
        description: result?.data?.description || form.userDescription,
        manual: result?.data?.manual || form.userManual,
        category: form.category,
        model: form.model || "unknown",
        file_name: file.name,
        visibility: form.visibility,
        org_id: form.orgId || null,
        group_id: form.groupId || null,
        groupName: selectedUploadGroup?.name || "",
        is_public: form.visibility === "public",
        created_at: new Date().toISOString(),
        featured: true,
      };
      setState({ status: "success", message: "Agent uploaded" });
      onToast("Agent published to the registry.");
      submitTimerRef.current = window.setTimeout(() => {
        onUploaded(uploadedAgent);
        onBack();
      }, 800);
    } catch (error) {
      setState({ status: "error", message: error.message });
      onToast(error.message);
    }
  }

  return (
    <section className="upload-page">
      <div className="upload-page-inner">
        <button className="upload-breadcrumb" type="button" onClick={onBack}>
          <span>Atlas Hub</span>
          <span aria-hidden="true">/</span>
          <span>Upload</span>
        </button>

        <header className="upload-page-header">
          <h1 className="upload-title">{renderAnimatedWords(uploadTitleWords, 0)}</h1>
          <p className="upload-subtitle">{renderAnimatedWords(uploadSubtitleWords, 120)}</p>
        </header>

        <form className="upload-form" onSubmit={handleSubmit}>
          <div
            className={`drop-zone ${isDragActive ? "drop-zone--active" : ""} ${
              file ? "drop-zone--selected" : ""
            }`}
            ref={dropZoneRef}
          >
            <input
              accept=".md,.txt,.json,.yaml,.yml"
              ref={fileInputRef}
              type="file"
              onChange={(event) => selectFile(event.target.files?.[0] || null)}
            />
            <div className="drop-zone-empty" aria-hidden={Boolean(file)}>
              <Upload size={40} />
              <strong>Drop your agent file here</strong>
              <span>Supports .md, .txt, .json, .yaml</span>
              <button className="ghost-btn" type="button" onClick={openFilePicker}>
                or pick a file
              </button>
            </div>

            <div className="drop-zone-file" aria-hidden={!file}>
              <span className="upload-file-icon">
                <FileCode2 size={18} />
              </span>
              <span className="upload-file-meta">
                <strong>{file?.name}</strong>
                <small>{file ? formatFileSize(file.size) : ""}</small>
              </span>
              <button className="icon-btn" type="button" onClick={clearFile} aria-label="Clear file">
                <X size={16} />
              </button>
            </div>
          </div>

          {file ? (
            <UploadProgress
              detailsDone={detailsDone}
              file={file}
              magicDone={magicState.status === "done"}
              publishDone={publishDone}
            />
          ) : null}

          {file ? (
            <div className="magic-panel upload-magic-panel">
              <button
                className={`magic-btn ${magicVisible ? "magic-btn-enter" : ""}`}
                type="button"
                disabled={magicState.status === "loading"}
                onClick={handleMagic}
              >
                {magicState.status === "loading" ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                {magicState.status === "loading" ? "Analyzing..." : "Magic"}
              </button>
              {magicState.status === "done" || magicState.status === "error" ? (
                <p
                  className={`magic-status ${magicState.status} ${
                    magicVisible ? "magic-btn-enter" : ""
                  }`}
                >
                  {magicState.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {analysisFeedback.warnings.length || analysisFeedback.missingFields.length ? (
            <div className="analysis-feedback form-field-animate" style={{ "--field-delay": "160ms" }}>
              {analysisFeedback.warnings.length ? (
                <div>
                  <strong>Review suggested fixes</strong>
                  <ul>
                    {analysisFeedback.warnings.map((warning, index) => (
                      <li key={`warning-${index}`}>{toDisplayList(warning)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {analysisFeedback.missingFields.length ? (
                <div>
                  <strong>Missing useful metadata</strong>
                  <ul>
                    {analysisFeedback.missingFields.map((field, index) => (
                      <li key={`missing-${index}`}>{toDisplayList(field)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <FloatingField
            active={Boolean(form.title)}
            delay={200}
            label="Title"
          >
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Name your agent"
            />
          </FloatingField>

          <FloatingField active delay={260} label="Category">
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
            >
              {Object.entries(categoryMeta)
                .filter(([key]) => key !== "all")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </FloatingField>

          <FloatingField active={Boolean(form.model)} delay={320} label="Model">
            <input
              value={form.model}
              onChange={(event) => updateField("model", event.target.value)}
              placeholder="gpt-4o"
            />
          </FloatingField>

          <FloatingField
            active={Boolean(form.userDescription)}
            className="textarea-field"
            counter={
              <span
                className={`char-counter ${
                  form.userDescription.length >= descriptionLimit
                    ? "limit"
                    : form.userDescription.length >= 250
                      ? "warning"
                      : ""
                }`}
              >
                {form.userDescription.length} / {descriptionLimit}
              </span>
            }
            delay={380}
            label="Description"
          >
            <textarea
              maxLength={descriptionLimit}
              value={form.userDescription}
              onChange={(event) => updateField("userDescription", event.target.value)}
              placeholder="Short summary shown in browse cards"
            />
          </FloatingField>

          <FloatingField
            active={Boolean(form.userManual)}
            className="textarea-field manual-field"
            delay={440}
            label="Manual"
          >
            <textarea
              value={form.userManual}
              onChange={(event) => updateField("userManual", event.target.value)}
              placeholder="Setup notes, usage notes, and constraints"
            />
          </FloatingField>

          <section className="metadata-section form-field-animate" style={{ "--field-delay": "500ms" }}>
            <div className="metadata-section-heading">
              <span>Search metadata</span>
              <small>Optional fields that help Atlas rank and explain this agent.</small>
            </div>

            <div className="metadata-field-grid">
              {uploadMetadataFieldConfig.map((item, index) => (
                <FloatingField
                  active={Boolean(form[item.field])}
                  className="textarea-field compact-textarea"
                  delay={540 + index * 35}
                  key={item.field}
                  label={item.label}
                >
                  <textarea
                    value={form[item.field]}
                    onChange={(event) => updateField(item.field, event.target.value)}
                    placeholder={item.placeholder}
                  />
                </FloatingField>
              ))}
            </div>
          </section>

          <div className="visibility-select-block form-field-animate" style={{ "--field-delay": "980ms" }}>
            <FloatingField active delay={980} label="Visibility">
              <select
                value={form.visibility}
                onChange={(event) => updateField("visibility", event.target.value)}
              >
                {visibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FloatingField>
            <small>{visibilityDescription}</small>
          </div>

          {manageableOrganizations.length ? (
            <FloatingField active={Boolean(form.orgId)} delay={1015} label="Add to organization">
              <select value={form.orgId} onChange={(event) => updateField("orgId", event.target.value)}>
                <option value="">None (personal)</option>
                {manageableOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </FloatingField>
          ) : null}

          {form.visibility === "group_only" && form.orgId ? (
            <div className="group-upload-block form-field-animate" style={{ "--field-delay": "1045ms" }}>
              <FloatingField active={Boolean(form.groupId)} delay={1045} label="Group">
                <select
                  value={form.groupId}
                  onChange={(event) => updateField("groupId", event.target.value)}
                  disabled={groupsState.status === "loading" || !groups.length}
                >
                  {groups.length ? (
                    <option value="">
                      {groupsState.status === "loading" ? "Loading groups..." : "Choose a group"}
                    </option>
                  ) : (
                    <option value="">
                      {groupsState.status === "loading" ? "Loading groups..." : "No groups available"}
                    </option>
                  )}
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </FloatingField>
              {groupsState.status === "done" && !groups.length ? (
                <small>No groups found in this organization. Ask an organization admin to create a group first.</small>
              ) : groupsState.status === "error" ? (
                <small>{groupsState.message}</small>
              ) : null}
            </div>
          ) : null}

          <button
            className={`primary-btn publish-btn ${state.status === "success" ? "is-success" : ""} ${
              state.status === "error" ? "is-error" : ""
            }`}
            disabled={publishDisabled}
            title={
              !file
                ? "Upload a file first"
                : form.visibility === "group_only" && !form.groupId
                  ? "Choose a group before publishing"
                  : undefined
            }
            type="submit"
          >
            {state.status === "loading" ? (
              <>
                <Loader2 className="spin" size={17} />
                Publishing...
              </>
            ) : state.status === "success" ? (
              <>
                <Check size={17} />
                Published!
              </>
            ) : (
              <>
                <Send size={17} />
                Publish agent
              </>
            )}
          </button>

          {state.status === "error" ? <p className="upload-error">{state.message}</p> : null}
        </form>
      </div>
    </section>
  );
}

function FloatingField({ active, children, className = "", counter = null, delay, label }) {
  return (
    <label
      className={`floating-field form-field-animate ${active ? "has-value" : ""} ${className}`}
      style={{ "--field-delay": `${delay}ms` }}
    >
      {children}
      <span className="floating-label">{label}</span>
      {counter}
    </label>
  );
}

function UploadProgress({ detailsDone, file, magicDone, publishDone }) {
  const steps = [
    { label: "File", done: Boolean(file) },
    { label: "Details", done: detailsDone },
    { label: "Magic", done: magicDone },
    { label: "Publish", done: publishDone },
  ];
  const activeIndex = steps.findIndex((step) => !step.done);
  const resolvedActiveIndex = activeIndex === -1 ? steps.length - 1 : activeIndex;
  let leadingCompleted = 0;

  for (const step of steps) {
    if (!step.done) break;
    leadingCompleted += 1;
  }

  const fillPercent =
    leadingCompleted <= 1 ? 0 : ((Math.min(leadingCompleted, steps.length) - 1) / (steps.length - 1)) * 100;

  return (
    <div className="upload-progress" style={{ "--progress-fill": `${fillPercent}%` }}>
      <div className="progress-line" aria-hidden="true" />
      {steps.map((step, index) => {
        const status = step.done ? "completed" : index === resolvedActiveIndex ? "active" : "upcoming";
        return (
          <div className={`progress-step ${status}`} key={step.label}>
            <span>{status === "completed" ? <Check size={13} /> : index + 1}</span>
            <small>{step.label}</small>
          </div>
        );
      })}
    </div>
  );
}

function OrganizationsPage({
  currentUser,
  devUserId,
  organizations,
  onSelectOrg,
  onBack,
  onOrganizationsChange,
  onToast,
}) {
  const pageRef = useRef(null);
  const [orgs, setOrgs] = useState(() => organizations.map(normalizeOrganization));
  const [loadState, setLoadState] = useState("loading");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "" });

  const loadOrganizations = useCallback(async () => {
    setLoadState("loading");
    try {
      const data = await getMyOrganizations();
      const nextOrgs = extractAgentList(data).map(normalizeOrganization);
      setOrgs(nextOrgs);
      onOrganizationsChange(nextOrgs);
      setLoadState("loaded");
    } catch {
      setOrgs((current) => current);
      setLoadState("error");
    }
  }, [onOrganizationsChange]);

  useEffect(() => {
    void loadOrganizations();
  }, [devUserId, loadOrganizations]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const cards = Array.from(root.querySelectorAll(".organization-card.will-animate"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("did-animate");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (alreadyVisible) {
        card.classList.add("did-animate");
      } else {
        observer.observe(card);
      }
    });
    return () => observer.disconnect();
  }, [orgs.length, loadState]);

  function updateDraft(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" ? { slug: slugFromName(value) } : {}),
    }));
  }

  async function submitOrganization(event) {
    event.preventDefault();
    const name = draft.name.trim();
    const slug = slugFromName(draft.slug || name);

    if (!name || !slug) {
      onToast("Organization name is required.");
      return;
    }

    try {
      const created = normalizeOrganization(
        await createOrganization({
          name,
          slug,
          description: draft.description.trim(),
        }),
      );
      const nextOrgs = [created, ...orgs];
      setOrgs(nextOrgs);
      onOrganizationsChange(nextOrgs);
      setDraft({ name: "", slug: "", description: "" });
      setCreateOpen(false);
      setLoadState("loaded");
      onToast("Organization created.");
    } catch (error) {
      onToast(error.message || "Could not create organization.");
    }
  }

  return (
    <section className="organizations-page" ref={pageRef}>
      <div className="organizations-inner">
        <div className="agent-topbar">
          <nav className="agent-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={onBack}>
              Atlas Hub
            </button>
            <span>/</span>
            <span>Organizations</span>
          </nav>
          <button className="agent-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
        </div>

        <header className="organizations-header">
          <div>
            <h1>Organizations</h1>
            <p>Teams and groups you're a part of.</p>
          </div>
          <button className="ghost-btn compact" type="button" onClick={() => setCreateOpen((open) => !open)}>
            <Plus size={15} />
            New organization
          </button>
        </header>

        <form
          className={createOpen ? "org-create-form is-open" : "org-create-form"}
          onSubmit={submitOrganization}
        >
          <FloatingField active={Boolean(draft.name)} delay={0} label="Name">
            <input
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
              placeholder="Acme Corp"
            />
          </FloatingField>
          <FloatingField active={Boolean(draft.slug)} delay={40} label="Slug">
            <input
              className="org-slug-input"
              value={draft.slug}
              onChange={(event) => updateDraft("slug", event.target.value)}
              placeholder="acme-corp"
            />
          </FloatingField>
          <FloatingField active={Boolean(draft.description)} className="textarea-field" delay={80} label="Description">
            <textarea
              value={draft.description}
              onChange={(event) => updateDraft("description", event.target.value)}
              placeholder="What this team shares on Atlas Hub"
            />
          </FloatingField>
          <button className="primary-btn compact" type="submit">
            <Plus size={15} />
            Create
          </button>
        </form>

        {loadState === "loading" ? (
          <div className="organizations-grid" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="organization-card skeleton-org-card" key={index}>
                <span className="skeleton-icon" />
                <span className="skeleton-line title" />
                <span className="skeleton-line wide" />
                <span className="skeleton-line medium" />
              </div>
            ))}
          </div>
        ) : loadState === "error" && !orgs.length ? (
          <div className="empty-state error-state organizations-empty">
            <Database className="empty-state-icon" size={32} />
            <h3>Unable to load organizations</h3>
            <p>Check the backend connection and try again.</p>
            <button className="ghost-btn" type="button" onClick={loadOrganizations}>
              Retry
            </button>
          </div>
        ) : orgs.length ? (
          <div className="organizations-grid">
            {orgs.map((org, index) => (
              <button
                className="organization-card will-animate"
                key={org.id}
                style={{ "--field-delay": `${index * 35}ms` }}
                type="button"
                onClick={() => onSelectOrg(org)}
              >
                <span className="organization-card-top">
                  <span className="organization-avatar">
                    {org.avatar_url ? <img src={org.avatar_url} alt="" /> : getOrgInitials(org.name)}
                  </span>
                  <span className="organization-copy">
                    <strong>{org.name}</strong>
                    <small>{org.slug}</small>
                  </span>
                </span>
                <span className="organization-description">{org.description || "No description yet."}</span>
                <span className="organization-card-bottom">
                  <span>{org.member_count} members</span>
                  <span>{org.agent_count} agents</span>
                  <span className={`org-role-badge ${org.current_user_role}`}>
                    {org.current_user_role === "owner"
                      ? "Owner"
                      : org.current_user_role === "admin"
                        ? "Admin"
                        : "Member"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state organizations-empty">
            <Building2 className="empty-state-icon" size={32} />
            <h3>You're not in any organizations yet.</h3>
            <button className="ghost-btn" type="button" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Create one
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function OrgDetailPage({
  org,
  currentUser,
  devUserId,
  onNavigateToAgent,
  onBack,
  onOrganizationsChange,
  onToast,
}) {
  const [orgDetail, setOrgDetail] = useState(() => normalizeOrganization(org));
  const [loadState, setLoadState] = useState("loading");
  const [editOpen, setEditOpen] = useState(false);
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [memberMenuId, setMemberMenuId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: org.name, description: org.description || "" });
  const [memberDraft, setMemberDraft] = useState({ userId: "", role: "member" });
  const [groups, setGroups] = useState([]);
  const [groupsState, setGroupsState] = useState("loading");
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState({ name: "", description: "" });
  const [groupMemberDraft, setGroupMemberDraft] = useState({
    groupId: "",
    userId: "",
    role: "member",
  });

  const currentMember = orgDetail.members.find(
    (member) => String(member.user_id) === String(devUserId),
  );
  const currentMemberRole = currentMember?.role || orgDetail.current_user_role;
  const isOwner = currentMemberRole === "owner";
  const isAdmin = currentMemberRole === "owner" || currentMemberRole === "admin";

  const loadOrg = useCallback(async () => {
    setLoadState("loading");
    try {
      const data = normalizeOrganization(await getOrganization(org.id));
      setOrgDetail(data);
      setEditDraft({ name: data.name, description: data.description || "" });
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }, [org.id]);

  useEffect(() => {
    void loadOrg();
  }, [devUserId, loadOrg]);

  const loadGroups = useCallback(async () => {
    setGroupsState("loading");
    try {
      const data = await getOrganizationGroups(org.id);
      setGroups(extractAgentList(data).map(normalizeGroup));
      setGroupsState("loaded");
    } catch {
      setGroups([]);
      setGroupsState("error");
    }
  }, [org.id]);

  useEffect(() => {
    void loadGroups();
  }, [devUserId, loadGroups]);

  async function saveOrgEdit(event) {
    event.preventDefault();
    try {
      const updated = normalizeOrganization(
        await updateOrganization(orgDetail.id, {
          name: editDraft.name.trim(),
          description: editDraft.description.trim(),
        }),
      );
      const nextDetail = { ...orgDetail, ...updated };
      const nextOrganizations = (currentUser.organizations || []).map((item) =>
        item.id === nextDetail.id ? nextDetail : item,
      );
      setOrgDetail(nextDetail);
      onOrganizationsChange(nextOrganizations);
      setEditOpen(false);
      onToast("Organization updated.");
    } catch (error) {
      onToast(error.message || "Could not update organization.");
    }
  }

  async function submitMember(event) {
    event.preventDefault();
    if (!memberDraft.userId.trim()) {
      onToast("Enter a user id.");
      return;
    }

    try {
      const added = await addOrgMember(orgDetail.id, memberDraft.userId.trim(), memberDraft.role);
      setOrgDetail((current) => ({
        ...current,
        members: [...current.members.filter((member) => String(member.user_id) !== String(added.user_id)), added],
        member_count: current.members.some((member) => String(member.user_id) === String(added.user_id))
          ? current.member_count
          : current.member_count + 1,
      }));
      setMemberDraft({ userId: "", role: "member" });
      setMemberFormOpen(false);
      onToast("Member added.");
    } catch (error) {
      onToast(error.message || "Could not add member.");
    }
  }

  async function submitGroup(event) {
    event.preventDefault();
    const name = groupDraft.name.trim();
    if (!name) {
      onToast("Group name is required.");
      return;
    }

    try {
      const created = normalizeGroup(
        await createOrganizationGroup(orgDetail.id, {
          name,
          description: groupDraft.description.trim(),
        }),
      );
      setGroups((current) => [created, ...current]);
      setGroupDraft({ name: "", description: "" });
      setGroupFormOpen(false);
      setGroupsState("loaded");
      onToast("Group created.");
    } catch (error) {
      onToast(error.message || "Could not create group.");
    }
  }

  async function submitGroupMember(event) {
    event.preventDefault();
    if (!groupMemberDraft.groupId || !groupMemberDraft.userId.trim()) {
      onToast("Choose a group and enter a user id.");
      return;
    }

    try {
      const updated = await addGroupMember(
        groupMemberDraft.groupId,
        groupMemberDraft.userId.trim(),
        groupMemberDraft.role,
      );
      const updatedGroup = updated?.group ? normalizeGroup(updated.group) : null;
      setGroups((current) =>
        current.map((group) =>
          String(group.id) === String(groupMemberDraft.groupId)
            ? updatedGroup || { ...group, member_count: group.member_count + 1 }
            : group,
        ),
      );
      setGroupMemberDraft({ groupId: "", userId: "", role: "member" });
      onToast("Group member added.");
    } catch (error) {
      onToast(error.message || "Could not add group member.");
    }
  }

  async function changeMemberRole(member, role) {
    const previous = orgDetail;
    setOrgDetail((current) => ({
      ...current,
      members: current.members.map((item) =>
        String(item.user_id) === String(member.user_id) ? { ...item, role } : item,
      ),
    }));
    setMemberMenuId(null);

    try {
      await updateOrgMemberRole(orgDetail.id, member.user_id, role);
      onToast(role === "admin" ? "Member promoted to admin." : "Member role updated.");
    } catch (error) {
      setOrgDetail(previous);
      onToast(error.message || "Could not update member.");
    }
  }

  async function removeMember(member) {
    const previous = orgDetail;
    setOrgDetail((current) => ({
      ...current,
      members: current.members.filter((item) => String(item.user_id) !== String(member.user_id)),
      member_count: Math.max(0, current.member_count - 1),
    }));
    setMemberMenuId(null);

    try {
      await removeOrgMember(orgDetail.id, member.user_id);
      onToast(String(member.user_id) === String(devUserId) ? "Left organization." : "Member removed.");
    } catch (error) {
      setOrgDetail(previous);
      onToast(error.message || "Could not remove member.");
    }
  }

  async function removeAgentFromOrg(agent) {
    const previous = orgDetail;
    setOrgDetail((current) => ({
      ...current,
      agents: current.agents.filter((item) => String(item.id) !== String(agent.id)),
      agent_count: Math.max(0, current.agent_count - 1),
    }));

    try {
      await updateAgentVisibility(agent.id, "public", { org_id: null });
      onToast("Agent removed from organization.");
    } catch (error) {
      setOrgDetail(previous);
      onToast(error.message || "Could not remove agent.");
    }
  }

  const members = orgDetail.members || [];
  const agents = orgDetail.agents || [];

  return (
    <section className="org-detail-page">
      <div className="org-detail-inner">
        <div className="agent-topbar">
          <nav className="agent-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={onBack}>
              Atlas Hub
            </button>
            <span>/</span>
            <button type="button" onClick={onBack}>
              Organizations
            </button>
            <span>/</span>
            <span>{orgDetail.name}</span>
          </nav>
          <button className="agent-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
        </div>

        <header className="org-detail-header">
          <div className="org-banner" />
          <span className="org-detail-avatar">
            {orgDetail.avatar_url ? <img src={orgDetail.avatar_url} alt="" /> : getOrgInitials(orgDetail.name)}
          </span>
          {isOwner ? (
            <button className="ghost-btn compact org-edit-btn" type="button" onClick={() => setEditOpen((open) => !open)}>
              Edit
            </button>
          ) : null}
          <div className="org-detail-copy">
            <h1>{orgDetail.name}</h1>
            <span>{orgDetail.slug}</span>
            {orgDetail.description ? <p>{orgDetail.description}</p> : null}
          </div>
        </header>

        {loadState === "error" ? (
          <div className="empty-state error-state">
            <Database className="empty-state-icon" size={32} />
            <h3>Unable to load organization</h3>
            <button className="ghost-btn" type="button" onClick={loadOrg}>
              Retry
            </button>
          </div>
        ) : null}

        {editOpen ? (
          <form className="org-inline-form" onSubmit={saveOrgEdit}>
            <FloatingField active={Boolean(editDraft.name)} delay={0} label="Name">
              <input value={editDraft.name} onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))} />
            </FloatingField>
            <FloatingField active={Boolean(editDraft.description)} className="textarea-field" delay={40} label="Description">
              <textarea value={editDraft.description} onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))} />
            </FloatingField>
            <button className="primary-btn compact" type="submit">Save</button>
          </form>
        ) : null}

        <section className="org-section">
          <div className="org-section-header">
            <h2>Members</h2>
            <span>{members.length} members</span>
            {isAdmin ? (
              <button className="ghost-btn compact" type="button" onClick={() => setMemberFormOpen((open) => !open)}>
                <Plus size={15} />
                Add member
              </button>
            ) : null}
          </div>

          {memberFormOpen ? (
            <form className="org-member-form" onSubmit={submitMember}>
              <input
                value={memberDraft.userId}
                onChange={(event) => setMemberDraft((current) => ({ ...current, userId: event.target.value }))}
                placeholder="User id or username"
              />
              <select
                value={memberDraft.role}
                onChange={(event) => setMemberDraft((current) => ({ ...current, role: event.target.value }))}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="primary-btn compact" type="submit">Add</button>
            </form>
          ) : null}

          <div className="org-member-list">
            {members.map((member) => {
              const isCurrentUser = String(member.user_id) === String(devUserId);
              const isMemberOwner = member.role === "owner";
              return (
                <article className="org-member-row" key={member.user_id}>
                  <span className="org-member-avatar">{getProfileInitials(member.display_name)}</span>
                  <span className="org-member-copy">
                    <strong>
                      {member.display_name}
                      {member.role === "owner" ? <span className="org-role-symbol owner">*</span> : null}
                      {member.role === "admin" ? <span className="org-role-symbol admin">^</span> : null}
                    </strong>
                    <small>Joined {formatDate(member.joined_at)}</small>
                  </span>
                  <span className={`org-role-pill ${member.role}`}>{titleCase(member.role)}</span>
                  {isAdmin && !isMemberOwner ? (
                    <span className="org-member-actions">
                      {isCurrentUser ? (
                        <button className="ghost-btn compact org-leave-btn" type="button" onClick={() => removeMember(member)}>
                          Leave
                        </button>
                      ) : null}
                      <button className="ghost-btn compact" type="button" onClick={() => setMemberMenuId(memberMenuId === member.user_id ? null : member.user_id)}>
                        ...
                      </button>
                      {memberMenuId === member.user_id ? (
                        <span className="org-member-menu">
                          <button type="button" onClick={() => changeMemberRole(member, "admin")}>Make admin</button>
                          <button type="button" onClick={() => changeMemberRole(member, "member")}>Make member</button>
                          <button type="button" onClick={() => removeMember(member)}>Remove</button>
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="org-section">
          <div className="org-section-header">
            <h2>Groups</h2>
            <span>{groups.length} groups</span>
            {isAdmin ? (
              <button className="ghost-btn compact" type="button" onClick={() => setGroupFormOpen((open) => !open)}>
                <Plus size={15} />
                New group
              </button>
            ) : null}
          </div>

          {groupFormOpen ? (
            <form className="org-inline-form" onSubmit={submitGroup}>
              <FloatingField active={Boolean(groupDraft.name)} delay={0} label="Group name">
                <input
                  value={groupDraft.name}
                  onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Design partners"
                />
              </FloatingField>
              <FloatingField active={Boolean(groupDraft.description)} className="textarea-field" delay={40} label="Description">
                <textarea
                  value={groupDraft.description}
                  onChange={(event) => setGroupDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="What this group can access"
                />
              </FloatingField>
              <button className="primary-btn compact" type="submit">Create group</button>
            </form>
          ) : null}

          {isAdmin && groups.length ? (
            <form className="org-member-form" onSubmit={submitGroupMember}>
              <select
                value={groupMemberDraft.groupId}
                onChange={(event) => setGroupMemberDraft((current) => ({ ...current, groupId: event.target.value }))}
              >
                <option value="">Choose group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <input
                value={groupMemberDraft.userId}
                onChange={(event) => setGroupMemberDraft((current) => ({ ...current, userId: event.target.value }))}
                placeholder="User id"
              />
              <select
                value={groupMemberDraft.role}
                onChange={(event) => setGroupMemberDraft((current) => ({ ...current, role: event.target.value }))}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="primary-btn compact" type="submit">Add to group</button>
            </form>
          ) : null}

          {groupsState === "loading" ? (
            <div className="profile-empty-state">
              <p>Loading groups...</p>
            </div>
          ) : groupsState === "error" ? (
            <div className="profile-empty-state">
              <p>Could not load groups.</p>
              <button className="ghost-btn compact" type="button" onClick={loadGroups}>
                Retry
              </button>
            </div>
          ) : groups.length ? (
            <div className="org-group-list">
              {groups.map((group) => (
                <article className="org-group-row" key={group.id}>
                  <span className="org-group-icon">
                    <Users size={17} />
                  </span>
                  <span className="org-member-copy">
                    <strong>{group.name}</strong>
                    <small>{group.description || "No description yet."}</small>
                  </span>
                  <span className="org-group-meta">{group.member_count} members</span>
                  <span className="org-group-meta">
                    {group.created_at ? `Created ${formatDate(group.created_at)}` : "Created recently"}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <p>No groups found. Create a group in the organization page first.</p>
            </div>
          )}
        </section>

        <section className="org-section">
          <div className="org-section-header">
            <h2>Organization agents</h2>
            <span>{agents.length} agents</span>
          </div>
          {agents.length ? (
            <div className="org-agent-list">
              {agents.map((agent) => (
                <article className="my-agent-row" key={agent.id}>
                  <span className="my-agent-icon">
                    <FileCode2 size={18} />
                  </span>
                  <span className="my-agent-copy">
                    <strong>{agent.name}</strong>
                    <small>{agent.file_name}</small>
                  </span>
                  <VisibilityBadge visibility={agent.visibility} />
                  <span className="my-agent-actions">
                    <button className="ghost-btn compact" type="button" onClick={() => onNavigateToAgent(agent)}>
                      <ExternalLink size={14} />
                      View
                    </button>
                    {isAdmin ? (
                      <button className="ghost-btn compact my-agent-delete-btn" type="button" onClick={() => removeAgentFromOrg(agent)}>
                        Remove from org
                      </button>
                    ) : null}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <p>No agents linked to this organization yet.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function MyAgentsPage({
  currentUser,
  onBack,
  onNavigateToAgent,
  onToast,
  devUserId,
  onUpload,
}) {
  const [myAgents, setMyAgents] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [orgVisibilityAgentId, setOrgVisibilityAgentId] = useState(null);
  const [orgVisibilityOrgId, setOrgVisibilityOrgId] = useState("");
  const manageableOrganizations = useMemo(
    () => (currentUser.organizations || []).filter(canManageOrganization),
    [currentUser.organizations],
  );

  const loadMyAgents = useCallback(async () => {
    setLoadState("loading");
    setDeleteConfirmId(null);
    try {
      const data = await getMyAgents();
      setMyAgents(extractAgentList(data).map(normalizeAgent));
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadMyAgents();
  }, [devUserId, loadMyAgents]);

  async function changeVisibility(agent, visibility, orgId = null) {
    if (visibility === "org_only" && !orgId && manageableOrganizations.length) {
      setOrgVisibilityAgentId(agent.id);
      setOrgVisibilityOrgId(String(agent.org_id || manageableOrganizations[0].id));
      return;
    }

    const previousAgents = myAgents;
    setMyAgents((current) =>
      current.map((item) =>
        String(item.id) === String(agent.id)
          ? normalizeAgent({ ...item, visibility, org_id: orgId, is_public: visibility === "public" })
          : item,
      ),
    );

    try {
      await updateAgentVisibility(agent.id, visibility, { org_id: orgId });
      setOrgVisibilityAgentId(null);
      setOrgVisibilityOrgId("");
      onToast(`Visibility updated to ${getVisibilityLabel(visibility)}.`);
    } catch {
      setMyAgents(previousAgents);
      onToast("Failed to update visibility.");
    }
  }

  async function confirmDelete(agent) {
    const previousAgents = myAgents;
    setMyAgents((current) => current.filter((item) => String(item.id) !== String(agent.id)));
    setDeleteConfirmId(null);

    try {
      await deleteAgent(agent.id);
      onToast("Agent deleted.");
    } catch {
      setMyAgents(previousAgents);
      onToast("Failed to delete agent.");
    }
  }

  return (
    <section className="my-agents-page">
      <div className="my-agents-inner">
        <div className="agent-topbar">
          <nav className="agent-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={onBack}>
              Atlas Hub
            </button>
            <span>/</span>
            <span>My Agents</span>
          </nav>
          <button className="agent-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
        </div>

        <header className="my-agents-header">
          <div>
            <h1>My Agents</h1>
            <p>Manage your published agents.</p>
          </div>
          <span className="my-agents-count">{myAgents.length} agents</span>
        </header>

        {loadState === "loading" ? (
          <div className="my-agent-list" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="my-agent-row skeleton-row" key={index}>
                <span className="skeleton-icon" />
                <span className="skeleton-row-copy">
                  <span className="skeleton-line title" />
                  <span className="skeleton-line medium" />
                </span>
                <span className="skeleton-line medium" />
              </div>
            ))}
          </div>
        ) : loadState === "error" ? (
          <div className="empty-state error-state my-agents-state">
            <Database className="empty-state-icon" size={32} />
            <h3>Unable to load your agents</h3>
            <p>Check the backend connection and try again.</p>
            <button className="ghost-btn" type="button" onClick={loadMyAgents}>
              Retry
            </button>
          </div>
        ) : myAgents.length ? (
          <div className="my-agent-list">
            {myAgents.map((agent) => {
              const confirming = String(deleteConfirmId) === String(agent.id);
              return (
                <article
                  className={confirming ? "my-agent-row is-confirming-delete" : "my-agent-row"}
                  key={agent.id}
                >
                  <span className="my-agent-icon">
                    <FileCode2 size={18} />
                  </span>
                  <span className="my-agent-copy">
                    <strong>{agent.name}</strong>
                    <small>{agent.file_name}</small>
                  </span>
                  <span className="my-agent-visibility">
                    {agent.visibility === "public" ? (
                      <span className="visibility-badge visibility-badge-public">
                        <Globe size={10} />
                        Public
                      </span>
                    ) : (
                      <VisibilityBadge visibility={agent.visibility} />
                    )}
                  </span>
                  <span className="my-agent-actions">
                    <VisibilityDropdown
                      onChange={(visibility) => changeVisibility(agent, visibility)}
                      visibility={agent.visibility}
                    />
                    {String(orgVisibilityAgentId) === String(agent.id) ? (
                      <span className="org-visibility-picker">
                        <select
                          value={orgVisibilityOrgId}
                          onChange={(event) => setOrgVisibilityOrgId(event.target.value)}
                        >
                          {manageableOrganizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="ghost-btn compact"
                          type="button"
                          onClick={() => changeVisibility(agent, "org_only", orgVisibilityOrgId)}
                        >
                          Confirm org
                        </button>
                      </span>
                    ) : null}
                    <button
                      className="ghost-btn compact my-agent-view-btn"
                      type="button"
                      onClick={() => onNavigateToAgent(agent)}
                    >
                      <ExternalLink size={14} />
                      View
                    </button>
                    {confirming ? (
                      <>
                        <button
                          className="ghost-btn compact my-agent-delete-btn confirm"
                          type="button"
                          onClick={() => confirmDelete(agent)}
                        >
                          Confirm delete
                        </button>
                        <button
                          className="ghost-btn compact"
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="ghost-btn compact my-agent-delete-btn"
                        type="button"
                        onClick={() => setDeleteConfirmId(agent.id)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="profile-empty-state my-agents-empty">
            <p>No agents yet</p>
            <button className="ghost-btn" type="button" onClick={onUpload}>
              <Plus size={16} />
              Upload your first agent
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function FollowingFeedPage({
  currentUser,
  devUserId,
  followedUsers,
  onNavigateToAgent,
  onToast,
  onBack,
  onBrowse,
  onFollow,
  onUnfollow,
}) {
  const pageRef = useRef(null);
  const [feedAgents, setFeedAgents] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const visibleFeedAgents = useMemo(
    () => feedAgents.filter((agent) => agent.visibility !== "private" || isAgentOwner(agent, devUserId)),
    [devUserId, feedAgents],
  );

  const loadFeed = useCallback(async () => {
    setLoadState("loading");
    try {
      const data = await getFollowingFeed();
      setFeedAgents(extractAgentList(data).map(normalizeAgent));
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (currentUser.id === null) return;
    void loadFeed();
  }, [currentUser.id, devUserId, loadFeed]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root || loadState !== "loaded") return undefined;

    const animatedElements = Array.from(root.querySelectorAll(".following-card-list .agent-card"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("did-animate");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    animatedElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (alreadyVisible) {
        element.classList.add("did-animate");
      } else {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [loadState, visibleFeedAgents.length]);

  if (currentUser.id === null) {
    return (
      <section className="profile-page">
        <div className="profile-page-inner">
          <div className="profile-topbar">
            <button className="agent-back-btn" type="button" onClick={onBack}>
              <ArrowLeft size={15} />
              Back
            </button>
          </div>
          <div className="profile-guest-prompt">
            <LockKeyhole size={32} color="var(--text3)" />
            <h2>Sign in to view your feed</h2>
            <p>Follow users to see their agents here.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="following-feed-page" ref={pageRef}>
      <div className="following-feed-inner">
        <div className="agent-topbar">
          <nav className="agent-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={onBack}>
              Atlas Hub
            </button>
            <span>/</span>
            <span>Following feed</span>
          </nav>
          <button className="agent-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
        </div>

        <header className="following-feed-header">
          <span className="eyebrow">Following feed</span>
          <h1>From people you follow</h1>
          <p>Agents published by users you follow, newest first.</p>
        </header>

        {loadState === "loading" ? (
          <BrowseLoadingShelf />
        ) : loadState === "error" ? (
          <div className="empty-state error-state following-feed-state">
            <Database className="empty-state-icon" size={32} />
            <h3>Unable to load feed</h3>
            <p>Check the backend connection and try again.</p>
            <button className="ghost-btn" type="button" onClick={loadFeed}>
              Retry
            </button>
          </div>
        ) : visibleFeedAgents.length ? (
          <div className="following-card-list" role="list">
            {visibleFeedAgents.map((agent, index) => (
              <AgentCard
                agent={agent}
                devUserId={devUserId}
                followedUsers={followedUsers}
                index={index}
                key={agent.id}
                onFollow={onFollow}
                onOpen={() => onNavigateToAgent(agent)}
                onToast={onToast}
                onUnfollow={onUnfollow}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state following-empty-state">
            <Users className="empty-state-icon" size={32} />
            <h3>Nothing here yet</h3>
            <p>Follow some users to see their agents here.</p>
            <button className="primary-btn" type="button" onClick={onBrowse}>
              Browse agents
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function renderAnimatedWords(words, baseDelay = 0) {
  return words.map((word, index) => (
    <span className="word-wrap" key={`${word}-${index}`}>
      <span className="word" style={{ animationDelay: `${baseDelay + index * 38}ms` }}>
        {word}
      </span>
    </span>
  ));
}

function AgentDrawer({ agent, state, onClose }) {
  return (
    <aside className="drawer-backdrop">
      <div className="agent-drawer">
        <div className="drawer-header">
          <div className="drawer-icon">
            <FileCode2 size={22} />
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </div>

        <span className="eyebrow">{getCategoryLabel(agent.category)}</span>
        <h2>{agent.name}</h2>

        <div className="drawer-stats">
          <span>
            <Star size={15} />
            {agent.endorsements} endorsements
          </span>
          <span>
            <Download size={15} />
            {agent.downloads} downloads
          </span>
          <span>
            <Layers3 size={15} />
            {agent.model}
          </span>
        </div>

        <div className="detail-block">
          <h3>Overview</h3>
          <p>{agent.description}</p>
        </div>

        <div className="detail-block">
          <h3>Constraints</h3>
          <p>{`File: ${agent.file_name}\nModel: ${agent.model}\nVisibility: ${getVisibilityLabel(agent.visibility)}`}</p>
        </div>

        <div className="detail-block">
          <h3>Reviews</h3>
          <p>
            Review data will appear here once the backend exposes review counts and comments for each
            agent.
          </p>
        </div>

        {agent.embedding_model ? (
          <div className="detail-block">
            <h3>Embedding</h3>
            <p>{agent.embedding_model}</p>
          </div>
        ) : null}

        {agent.manual ? (
          <div className="detail-block">
            <h3>Manual</h3>
            <p>{agent.manual}</p>
          </div>
        ) : null}

        <span className={`drawer-status ${state}`}>
          {state === "loading" ? <Loader2 className="spin" size={14} /> : <LockKeyhole size={14} />}
          {state === "live" ? "Loaded from backend" : state === "loading" ? "Loading backend detail" : "Local detail"}
        </span>
      </div>
    </aside>
  );
}

function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? "show" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

function ProfilePage({
  user,
  isOwnProfile,
  allAgents,
  activity = [],
  activityState = { status: "idle", message: "" },
  devUserId,
  followedUsers,
  onBack,
  onFollow,
  onNavigateToAgent,
  onUpload,
  onSignIn,
  onUnfollow,
  onUpdateUser,
  onToast,
}) {
  const pageRef = useRef(null);
  const bannerInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [editOpen, setEditOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  const publishedAgents = useMemo(
    () =>
      allAgents.filter(
        (agent) => agent.team === user.name || agent.uploader_id === user.id,
      ),
    [allAgents, user.id, user.name],
  );

  useEffect(() => {
    setEditOpen(false);
    setFollowing(false);
  }, [user.id]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const animatedElements = Array.from(
      root.querySelectorAll(".profile-reveal, .profile-agent-card"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("did-animate");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    animatedElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (alreadyVisible) {
        element.classList.add("did-animate");
      } else {
        observer.observe(element);
      }
    });
    return () => observer.disconnect();
  }, [publishedAgents.length, user.id, user.settings]);

  function readImageFile(file, field) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateUser({ [field]: reader.result });
    };
    reader.readAsDataURL(file);
  }

  function handleFollow() {
    if (following) return;
    setFollowing(true);
    onToast(`Following ${user.name}`);
  }

  const settings = user.settings || defaultProfileSettings;

  if (isOwnProfile && user.id === null) {
    return (
      <section className="profile-page" ref={pageRef}>
        <div className="profile-page-inner">
          <div className="profile-topbar">
            <button className="agent-back-btn" type="button" onClick={onBack}>
              <ArrowLeft size={15} />
              Back
            </button>
          </div>
          <div className="profile-guest-prompt">
            <LockKeyhole size={32} color="var(--text3)" />
            <h2>Sign in to view your profile</h2>
            <p>Create an account or sign in to publish agents and build your profile.</p>
            <button className="primary-btn" type="button" onClick={onSignIn}>
              Sign in
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page" ref={pageRef}>
      <div className="profile-page-inner">
        <div className="profile-topbar">
          <button className="agent-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
        </div>

        <>
        <div className="profile-banner-wrap">
          <div className="profile-banner">
            {user.banner ? <img src={user.banner} alt="" className="profile-banner-image" /> : null}
            {isOwnProfile ? (
              <>
                <button
                  className="profile-media-edit"
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <Camera size={18} />
                  <span>Change banner</span>
                </button>
                <input
                  ref={bannerInputRef}
                  accept="image/*"
                  className="profile-file-input"
                  type="file"
                  onChange={(event) => {
                    readImageFile(event.target.files?.[0], "banner");
                    event.target.value = "";
                  }}
                />
              </>
            ) : null}
          </div>

          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                <span>{getProfileInitials(user.name)}</span>
              )}
              {isOwnProfile ? (
                <>
                  <button
                    className="profile-media-edit profile-media-edit--avatar"
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera size={18} />
                    <span>Change photo</span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    accept="image/*"
                    className="profile-file-input"
                    type="file"
                    onChange={(event) => {
                      readImageFile(event.target.files?.[0], "avatar");
                      event.target.value = "";
                    }}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="profile-body">
          <div className="profile-identity-row">
            <div className="profile-identity-copy">
              <div className="profile-name-line">
                <h1>{user.name}</h1>
                <span className="profile-handle">{user.handle}</span>
                <span className="profile-role-badge">{user.role}</span>
              </div>
            </div>
            <div className="profile-identity-actions">
              {isOwnProfile ? (
                <button className="ghost-btn" type="button" onClick={() => setEditOpen(true)}>
                  Edit profile
                </button>
              ) : (
                <>
                  <button
                    className={following ? "secondary-btn profile-follow-btn is-following" : "primary-btn compact profile-follow-btn"}
                    type="button"
                    onClick={handleFollow}
                  >
                    {following ? "Following" : "+ Follow"}
                  </button>
                  <button
                    className="ghost-btn profile-more-btn"
                    type="button"
                    onClick={() => onToast("More options coming soon")}
                  >
                    ···
                  </button>
                </>
              )}
            </div>
          </div>

          {isOwnProfile && !user.bio ? (
            <button className="profile-bio-placeholder" type="button" onClick={() => setEditOpen(true)}>
              Add a bio…
            </button>
          ) : user.bio ? (
            <p className="profile-bio">{user.bio}</p>
          ) : null}

          <div className="profile-meta-row">
            {settings.showLocation && user.location ? (
              <span>
                <MapPin size={14} />
                {user.location}
              </span>
            ) : null}
            {settings.showWebsite && user.website ? (
              <span>
                <Globe size={14} />
                <a href={user.website} rel="noreferrer" target="_blank">
                  {user.website.replace(/^https?:\/\//, "")}
                </a>
              </span>
            ) : null}
            {settings.showJoinDate && user.joinedAt ? (
              <span>
                <Calendar size={14} />
                Joined {formatJoinDate(user.joinedAt)}
              </span>
            ) : null}
          </div>

          {settings.showStats ? (
            <ProfileStatsBar stats={user.stats} />
          ) : null}

          {settings.showOrganizations && user.organizations?.length ? (
            <section className="profile-section profile-reveal will-animate">
              <h2>Organizations</h2>
              <div className="profile-org-row">
                {user.organizations.map((org) => (
                  <button
                    className="profile-org-chip"
                    key={org.id}
                    type="button"
                    onClick={() => onToast(`${org.name} org page coming soon.`)}
                  >
                    <span className="profile-org-avatar" style={{ background: org.color }}>
                      {org.initials}
                    </span>
                    <span>{org.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="profile-section profile-reveal will-animate">
            <h2>Published agents</h2>
            {publishedAgents.length ? (
              <div className="profile-agents-grid">
                {publishedAgents.map((agent, index) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    devUserId={devUserId}
                    followedUsers={followedUsers}
                    index={index}
                    className="profile-agent-card will-animate"
                    onFollow={onFollow}
                    onOpen={() => onNavigateToAgent(agent)}
                    onToast={onToast}
                    onUnfollow={onUnfollow}
                    style={{ "--field-delay": `${index * 35}ms` }}
                  />
                ))}
              </div>
            ) : (
              <div className="profile-empty-state">
                <p>No agents published yet.</p>
                {isOwnProfile ? (
                  <button className="ghost-btn" type="button" onClick={onUpload}>
                    <Plus size={16} />
                    Upload your first agent
                  </button>
                ) : null}
              </div>
            )}
          </section>

          {user.id != null && settings.showActivity ? (
            <section className="profile-section profile-reveal will-animate">
              <h2>Recent activity</h2>
              {activityState.status === "loading" ? (
                <div className="profile-empty-state profile-activity-placeholder">
                  <Loader2 className="spin" size={16} />
                  <p>Loading recent activity...</p>
                </div>
              ) : activityState.status === "error" ? (
                <div className="profile-empty-state">
                  <p>{activityState.message || "Could not load recent activity."}</p>
                </div>
              ) : activity.length ? (
                <div className="profile-activity-list">
                  {activity.map((item, index) => {
                    const Icon = profileActivityIcons[item.icon] || Upload;
                    return (
                      <div className="profile-activity-item" key={`${item.type}-${index}`}>
                        <span className="profile-activity-icon" style={{ background: item.color }}>
                          <Icon size={16} />
                        </span>
                        <span className="profile-activity-text">{item.text}</span>
                        <span className="profile-activity-time">{item.time}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="profile-empty-state">
                  <p>No recent activity yet.</p>
                </div>
              )}
            </section>
          ) : null}
        </div>
        </>
      </div>

      {isOwnProfile && user.id != null ? (
        <ProfileEditPanel
          open={editOpen}
          user={user}
          onClose={() => setEditOpen(false)}
          onSave={() => {
            setEditOpen(false);
            onToast("Profile updated.");
          }}
          onUpdateUser={onUpdateUser}
        />
      ) : null}
    </section>
  );
}

function ProfileStatsBar({ stats }) {
  const barRef = useRef(null);
  const items = [
    ["Agents", stats?.agents ?? 0],
    ["Downloads", stats?.downloads ?? 0],
    ["Endorsements", stats?.endorsements ?? 0],
    ["Collections", stats?.collections ?? 0],
  ];

  return (
    <div className="profile-stats-bar profile-reveal will-animate" ref={barRef}>
      {items.map(([label, value]) => (
        <div className="profile-stat-block" key={label}>
          <strong>
            <CountValue value={value} />
          </strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileEditPanel({ open, user, onClose, onSave, onUpdateUser }) {
  const [draft, setDraft] = useState({
    name: user.name,
    handle: user.handle,
    bio: user.bio,
    location: user.location,
    website: user.website,
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      location: user.location,
      website: user.website,
    });
  }, [open, user]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const privacyToggles = [
    ["showLocation", "Show location"],
    ["showWebsite", "Show website"],
    ["showOrganizations", "Show organizations"],
    ["showJoinDate", "Show join date"],
    ["showStats", "Show stats"],
    ["showActivity", "Show activity"],
  ];

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSave(event) {
    event.preventDefault();
    void (async () => {
      await onUpdateUser({
        name: draft.name.trim() || user.name,
        handle: draft.handle.trim() || user.handle,
        bio: draft.bio.trim(),
        location: draft.location.trim(),
        website: draft.website.trim(),
      });
      onSave();
    })();
  }

  return (
    <>
      <button className="profile-edit-backdrop" type="button" aria-label="Close edit panel" onClick={onClose} />
      <aside className="profile-edit-panel">
        <button className="profile-edit-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>

        <form className="profile-edit-form" onSubmit={handleSave}>
          <div className="profile-edit-section">
            <span className="profile-edit-label">Identity</span>
            <FloatingField active={Boolean(draft.name)} delay={0} label="Name">
              <input
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder="Your name"
              />
            </FloatingField>
            <FloatingField active={Boolean(draft.handle)} delay={40} label="Handle">
              <input
                value={draft.handle}
                onChange={(event) => updateDraft("handle", event.target.value)}
                placeholder="@samir"
              />
            </FloatingField>
            <FloatingField active className="textarea-field" delay={80} label="Bio">
              <textarea
                value={draft.bio}
                onChange={(event) => updateDraft("bio", event.target.value)}
                placeholder="Tell people what you build"
              />
            </FloatingField>
            <FloatingField active={Boolean(draft.location)} delay={120} label="Location">
              <input
                value={draft.location}
                onChange={(event) => updateDraft("location", event.target.value)}
                placeholder="City, Country"
              />
            </FloatingField>
            <FloatingField active={Boolean(draft.website)} delay={160} label="Website">
              <input
                value={draft.website}
                onChange={(event) => updateDraft("website", event.target.value)}
                placeholder="https://yoursite.dev"
              />
            </FloatingField>
          </div>

          <div className="profile-edit-section">
            <span className="profile-edit-label">Privacy</span>
            <div className="profile-privacy-list">
              {privacyToggles.map(([key, label]) => (
                <label className="profile-privacy-toggle" key={key}>
                  <span>{label}</span>
                  <button
                    aria-checked={Boolean(user.settings?.[key])}
                    className={
                      user.settings?.[key] ? "public-switch is-public" : "public-switch"
                    }
                    role="switch"
                    type="button"
                    onClick={() =>
                      onUpdateUser({
                        settings: { [key]: !user.settings?.[key] },
                      })
                    }
                  >
                    <span />
                  </button>
                </label>
              ))}
            </div>
          </div>

          <button className="primary-btn profile-edit-save" type="submit">
            Save
          </button>
        </form>
      </aside>
    </>
  );
}

function buildShelves(agents, hasSearchResults) {
  if (!agents.length) return [];

  const shelves = [];
  const uniqueById = (items) => Array.from(new Map(items.map((agent) => [agent.id, agent])).values());

  if (hasSearchResults) {
    return [{
      title: "Search results",
      subtitle: "Agents matching your search.",
      agents: agents.slice(0, 10),
    }];
  }

  shelves.push({
    title: "Featured agents",
    subtitle: "Reusable workflows with strong internal signals.",
    agents: uniqueById(agents.filter((agent) => agent.featured).concat(agents)).slice(0, 10),
  });

  shelves.push({
    title: "New and recently updated",
    subtitle: "Fresh additions from contributing teams.",
    agents: [...agents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10),
  });

  const devAndData = agents.filter((agent) =>
    ["developer-tools", "data", "document-ops"].includes(agent.category),
  );
  if (devAndData.length) {
    shelves.push({
      title: "Build, data, and document ops",
      subtitle: "Agents for engineering, analytics, and structured document work.",
      agents: devAndData.slice(0, 10),
    });
  }

  const peopleOps = agents.filter((agent) =>
    ["hr", "support", "sales", "productivity", "finance"].includes(agent.category),
  );
  if (peopleOps.length) {
    shelves.push({
      title: "Business operations",
      subtitle: "Agents for teams that repeat high-volume operational work.",
      agents: peopleOps.slice(0, 10),
    });
  }

  const categoryGroups = Array.from(new Set(agents.map((agent) => agent.category)))
    .filter(Boolean)
    .slice(0, 4);

  categoryGroups.forEach((item) => {
    const matching = agents.filter((agent) => agent.category === item);
    if (matching.length >= 2) {
      shelves.push({
        title: getCategoryLabel(item),
        subtitle: `All visible agents tagged ${getCategoryLabel(item).toLowerCase()}.`,
        agents: matching.slice(0, 10),
      });
    }
  });

  return shelves;
}
