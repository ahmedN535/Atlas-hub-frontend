import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  Cloud,
  Database,
  Download,
  FileCode2,
  Layers3,
  Loader2,
  LockKeyhole,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Star,
  Upload,
  X,
} from "lucide-react";
import { categoryMeta, mockAgents } from "./data/mockAgents.js";
import {
  getAgent,
  getAgents,
  getApiBaseLabel,
  searchAgents,
  uploadAgent,
} from "./api/agents.js";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const modelOptions = ["all", "gpt-4o", "gpt-4o-mini", "claude-3.5-sonnet", "claude-3.5-haiku"];
const screenTransitionMs = 260;
const heroTitleWords = "The agent registry for reusable AI agents".split(" ");
const uploadTitleWords = "Publish an agent".split(" ");
const uploadSubtitleWords =
  "Share a reusable agent with your team. Fill in the details, then use Magic to generate the rest.".split(
    " ",
  );
const descriptionLimit = 300;

function normalizeAgent(agent) {
  const idNumber = Number(agent.id) || Math.floor(Math.random() * 10000);
  return {
    id: agent.id,
    name: agent.name || agent.title || "Untitled agent",
    description: agent.description || "No description has been added yet.",
    manual: agent.manual || "",
    category: agent.category || "general",
    model: agent.model || "unknown",
    file_name: agent.file_name || agent.fileName || "agent.md",
    is_public: agent.is_public ?? true,
    created_at: agent.created_at || new Date().toISOString(),
    team: agent.team || "Atlas contributor",
    endorsements: Number(agent.endorsements ?? agent.review_count ?? 12 + ((idNumber * 7) % 46)),
    downloads: Number(agent.downloads ?? 160 + ((idNumber * 29) % 1200)),
    featured: Boolean(agent.featured ?? idNumber % 3 === 0),
    similarity: agent.similarity,
    indexed_text: agent.indexed_text,
    embedding_model: agent.embedding_model,
    media: Array.isArray(agent.media) ? agent.media : [],
  };
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
  return hash === "browse" || hash === "agent" || hash === "upload" ? hash : "home";
}

function getScreenUrl(screen) {
  const hash =
    screen === "browse" ? "#browse" : screen === "agent" ? "#agent" : screen === "upload" ? "#upload" : "";
  return `${window.location.pathname}${window.location.search}${hash}`;
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
  return {
    id: review.id || `${agent.id || "agent"}-review-${index}`,
    authorInitials: review.authorInitials || getTeamInitials(review.authorName || "Atlas Reviewer"),
    authorName: review.authorName || "Atlas Reviewer",
    authorTeam: review.authorTeam || "Contributor",
    rating: Math.min(5, Math.max(1, Number(review.rating) || 1)),
    title: review.title || "Useful in production",
    body: review.body || "This review has not added details yet.",
    constraints: review.constraints || "",
    helpfulCount: Number(review.helpfulCount || 0),
    notHelpfulCount: Number(review.notHelpfulCount || 0),
    userVote: review.userVote === "helpful" || review.userVote === "not-helpful" ? review.userVote : null,
    createdAt: review.createdAt || new Date().toISOString(),
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
  const [agents, setAgents] = useState(() => mockAgents.map(normalizeAgent));
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
  const [landingQuery, setLandingQuery] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false });

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
        setApiState({ status: "live", message: `Live backend: ${getApiBaseLabel()}` });
      } catch (error) {
        if (ignore) return;
        setApiState({
          status: "demo",
          message: `Demo data active. ${error.message}`,
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
      setSearchState({ status: "idle", results: null, message: "" });
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSearchState((current) => ({ ...current, status: "loading", message: "Searching" }));
      try {
        const data = await searchAgents(cleanQuery);
        const results = Array.isArray(data?.results) ? data.results.map(normalizeAgent) : [];
        setSearchState({
          status: "live",
          results,
          message: "Semantic search results",
        });
      } catch (error) {
        setSearchState({
          status: "fallback",
          results: null,
          message: `Local filtering active. ${error.message}`,
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
    const base = searchState.results || localSearch(agents, query);
    const filtered = base.filter((agent) => {
      if (category !== "all" && agent.category !== category) return false;
      if (model !== "all" && agent.model !== model) return false;
      if (publicOnly && agent.is_public === false) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "downloads") return b.downloads - a.downloads;
      if (sortBy === "endorsements") return b.endorsements - a.endorsements;
      if (sortBy === "similarity") return Number(b.similarity || 0) - Number(a.similarity || 0);
      return Number(b.featured) - Number(a.featured) || b.endorsements - a.endorsements;
    });
  }, [agents, category, model, publicOnly, query, searchState.results, sortBy]);

  const shelves = useMemo(() => buildShelves(filteredAgents, Boolean(searchState.results)), [
    filteredAgents,
    searchState.results,
  ]);

  function navigate(nextScreen) {
    changeScreen(nextScreen);
  }

  function closeUploadPage() {
    navigate(prevScreenRef.current === "browse" ? "browse" : "home");
  }

  function submitLandingSearch(event) {
    event.preventDefault();
    setQuery(landingQuery);
    navigate("browse");
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

  function addUploadedAgent(agent) {
    setAgents((current) => [normalizeAgent(agent), ...current]);
  }

  return (
    <>
      <div className="custom-cursor custom-cursor-ring" aria-hidden="true" />
      <div className="custom-cursor custom-cursor-dot" aria-hidden="true" />
      <div className={`app-shell ${isMounted ? "is-mounted" : ""} ${screenTransition}`}>
        <Nav
          screen={screen}
          onNavigate={navigate}
          onUpload={() => navigate("upload")}
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
              onUpload={() => navigate("upload")}
              agentCount={agents.length}
            />
          ) : screen === "upload" ? (
            <UploadPage onUploaded={addUploadedAgent} onBack={closeUploadPage} onToast={showToast} />
          ) : screen === "agent" && selectedAgent ? (
            <AgentPage
              agent={selectedAgent}
              allAgents={agents}
              onBack={closeAgent}
              onNavigateToAgent={openAgent}
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
              onOpenAgent={openAgent}
              onUpload={() => navigate("upload")}
              onToast={showToast}
            />
          )}
        </main>

        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </>
  );
}

function Nav({ screen, onNavigate, onUpload, apiState, scrolled, scrollProgress }) {
  return (
    <header className={`site-nav ${scrolled ? "nav--scrolled" : ""}`}>
      {screen === "browse" || screen === "agent" ? (
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
          className={screen === "browse" || screen === "agent" ? "nav-link active" : "nav-link"}
          type="button"
          onClick={() => onNavigate("browse")}
        >
          Browse
        </button>
        <span className={`connection-pill ${apiState.status}`}>
          <Cloud size={14} />
          {apiState.status === "live" ? "Backend live" : "Demo data"}
        </span>
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
  onOpenAgent,
  onUpload,
  onToast,
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
        <span className={`info-pill ${apiState.status}`}>
          <Database size={14} />
          {apiState.message}
        </span>
        {searchState.message ? (
          <span className={`info-pill ${searchState.status}`}>
            <Search size={14} />
            {searchState.message}
          </span>
        ) : null}
        <span className="result-count">{agents.length} agents</span>
      </div>

      {apiState.status === "loading" ? (
        <BrowseLoadingShelf />
      ) : shelves.length ? (
        <div className="shelf-stack">
          {shelves.map((shelf, index) => (
            <Fragment key={shelf.title}>
              {index > 0 ? <ShelfDivider /> : null}
              <AgentShelf
                title={shelf.title}
                subtitle={shelf.subtitle}
                agents={shelf.agents}
                onOpenAgent={onOpenAgent}
                onToast={onToast}
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

function AgentShelf({ title, subtitle, agents, onOpenAgent, onToast }) {
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
            index={index}
            onOpen={() => onOpenAgent(agent)}
          />
        ))}
      </div>
    </section>
  );
}

function AgentCard({ agent, index, onOpen }) {
  const [transform, setTransform] = useState(undefined);

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

  return (
    <button
      className="agent-card will-animate"
      type="button"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="listitem"
      style={{
        transform,
        transitionDelay: transform ? "0ms" : `${index * 35}ms`,
      }}
    >
      <span className="agent-card-topline">
        <span className="agent-icon">
          <FileCode2 size={19} />
        </span>
        {agent.featured ? (
          <span className="mini-badge">
            <Star size={12} />
            Featured
          </span>
        ) : null}
      </span>
      <strong>{agent.name}</strong>
      <span className="agent-description">{agent.description}</span>
      <span className="agent-meta">
        <span>{getCategoryLabel(agent.category)}</span>
        <span>{agent.model}</span>
      </span>
      <span className="agent-card-footer">
        <span>
          <Download size={13} />
          {agent.downloads}
        </span>
        <span>{formatDate(agent.created_at)}</span>
      </span>
    </button>
  );
}

function AgentPage({ agent, allAgents, onBack, onNavigateToAgent, onToast = () => {} }) {
  const pageRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const validationTimerRef = useRef(null);
  const tone = getCategoryTone(agent.category);
  const mediaItems = useMemo(() => getAgentMedia(agent), [agent]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mediaFading, setMediaFading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(agent.downloads || 0);
  const [reviews, setReviews] = useState(() => getInitialReviews(agent));
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
    setActiveMediaIndex(0);
    setMediaFading(false);
    setDownloadCount(agent.downloads || 0);
    setReviews(getInitialReviews(agent));
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
  const metadataRows = [
    ["File", agent.file_name],
    ["Model", agent.model],
    ["Visibility", agent.is_public ? "Public registry listing" : "Private draft"],
    ["Category", getCategoryLabel(agent.category)],
    ["Uploaded", formatDate(agent.created_at)],
    agent.embedding_model ? ["Embedding model", agent.embedding_model] : null,
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

  function handleDownload() {
    setDownloadCount((current) => current + 1);
    onToast("Download started.");
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

  function submitReview(event) {
    event.preventDefault();
    const missing = {
      rating: reviewForm.rating < 1,
      body: !reviewForm.body.trim(),
    };

    if (missing.rating || missing.body) {
      setInvalidFields(missing);
      window.clearTimeout(validationTimerRef.current);
      validationTimerRef.current = window.setTimeout(() => setInvalidFields({}), 340);
      return;
    }

    const reviewId = `${agent.id}-local-review-${Date.now()}`;
    const nextReview = normalizeReview(
      {
        id: reviewId,
        authorInitials: "YO",
        authorName: "You",
        authorTeam: "Atlas Hub",
        rating: reviewForm.rating,
        title: reviewForm.title.trim() || `Review for ${agent.name}`,
        body: reviewForm.body.trim(),
        constraints: reviewForm.constraints.trim(),
        helpfulCount: 0,
        notHelpfulCount: 0,
        userVote: null,
        createdAt: new Date().toISOString(),
      },
      0,
      agent,
    );

    setReviews((current) => [nextReview, ...current]);
    setNewReviewIds((current) => [reviewId, ...current]);
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
                {agent.featured ? <span>Featured</span> : null}
              </div>
            </div>
          </div>

          <div className="uploader-row">
            <span className="avatar-circle">{getTeamInitials(agent.team)}</span>
            <span>
              Published by{" "}
              <button type="button" onClick={() => onToast("Team profiles coming soon.")}>
                {agent.team}
              </button>
            </span>
            <span>{formatDate(agent.created_at)}</span>
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
                <dd>{value}</dd>
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
          onClick={() => onToast("Team profiles coming soon.")}
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

function ReviewCard({ review, isNew, onVote }) {
  return (
    <article className={`review-card ${isNew ? "is-new" : ""}`}>
      <header className="review-card-header">
        <span className="review-avatar">{review.authorInitials}</span>
        <span className="review-author">
          <strong>{review.authorName}</strong>
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
          className="constraints-input"
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

function UploadPage({ onUploaded, onBack, onToast }) {
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const submitTimerRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    userDescription: "",
    userManual: "",
    category: "general",
    model: "",
    isPublic: true,
  });
  const [file, setFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [state, setState] = useState({ status: "idle", message: "" });
  const [magicState, setMagicState] = useState({ status: "idle", message: "" });
  const [magicVisible, setMagicVisible] = useState(false);

  const detailsDone = Boolean(form.title.trim() && form.userDescription.trim());
  const publishDone = state.status === "success";

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
    setForm((current) => ({ ...current, [field]: nextValue }));
    if (state.status === "error") setState({ status: "idle", message: "" });
  }

  function selectFile(nextFile) {
    setFile(nextFile);
    setState({ status: "idle", message: "" });
    setMagicState({ status: "idle", message: "" });
  }

  function clearFile() {
    setFile(null);
    setState({ status: "idle", message: "" });
    setMagicState({ status: "idle", message: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleMagic() {
    if (!file) return;

    setMagicState({ status: "loading", message: "Reading file..." });
    try {
      const payload = new FormData();
      payload.append("agentFile", file);
      payload.append("useAiGeneration", "true");

      const title = form.title.trim() || file.name.replace(/\.[^/.]+$/, "");
      if (title) payload.append("title", title);
      if (form.category) payload.append("category", form.category);

      const result = await uploadAgent(payload);

      if (result?.data?.title && !form.title.trim()) updateField("title", result.data.title);
      await Promise.all([
        result?.data?.description
          ? typewriterFill(
              (value) => updateField("userDescription", value),
              String(result.data.description).slice(0, descriptionLimit),
              600,
            )
          : Promise.resolve(),
        result?.data?.manual
          ? typewriterFill((value) => updateField("userManual", value), result.data.manual, 600)
          : Promise.resolve(),
      ]);

      setMagicState({ status: "done", message: "Fields filled from your file." });
    } catch (error) {
      setMagicState({
        status: "error",
        message: error.message || "Magic failed - fill fields manually.",
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

    const payload = new FormData();
    payload.append("agentFile", file);
    payload.append("title", form.title.trim());
    payload.append("userDescription", form.userDescription.trim());
    payload.append("userManual", form.userManual.trim());
    payload.append("category", form.category);
    payload.append("model", form.model.trim());
    payload.append("isPublic", String(form.isPublic));

    setState({ status: "loading", message: "Uploading agent" });
    try {
      const result = await uploadAgent(payload);
      const uploadedAgent = {
        id: result?.data?.id || Date.now(),
        name: result?.data?.title || form.title,
        description: result?.data?.description || form.userDescription,
        manual: result?.data?.manual || form.userManual,
        category: form.category,
        model: form.model || "unknown",
        file_name: file.name,
        is_public: form.isPublic,
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
                {magicState.status === "loading" ? "Reading file..." : "Magic"}
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

          <div className="visibility-toggle form-field-animate" style={{ "--field-delay": "500ms" }}>
            <span>Private</span>
            <button
              aria-checked={form.isPublic}
              className={form.isPublic ? "public-switch is-public" : "public-switch"}
              role="switch"
              type="button"
              onClick={() => updateField("isPublic", !form.isPublic)}
            >
              <span />
            </button>
            <span>Public</span>
          </div>

          <button
            className={`primary-btn publish-btn ${state.status === "success" ? "is-success" : ""} ${
              state.status === "error" ? "is-error" : ""
            }`}
            disabled={!file || state.status === "loading" || state.status === "success"}
            title={!file ? "Upload a file first" : undefined}
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
          <p>{`File: ${agent.file_name}\nModel: ${agent.model}\nVisibility: ${
            agent.is_public ? "Public registry listing" : "Private draft"
          }`}</p>
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

function buildShelves(agents, hasSearchResults) {
  if (!agents.length) return [];

  const shelves = [];
  const uniqueById = (items) => Array.from(new Map(items.map((agent) => [agent.id, agent])).values());

  if (hasSearchResults) {
    shelves.push({
      title: "Best matches",
      subtitle: "Ranked by semantic relevance when the backend search is available.",
      agents: agents.slice(0, 10),
    });
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
