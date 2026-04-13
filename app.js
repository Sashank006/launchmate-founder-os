const STORAGE_KEY = "launchmate-workspace-v2";

const presets = {
  "campus-marketplace": {
    idea: "A platform that helps students find short-term campus gigs and lets organizations hire fast.",
    targetUser: "Students who want flexible paid campus work",
    edge: "I already know club leaders and student org admins who need help finding people fast.",
    constraint: "No budget and I need to prove demand before building a complex product.",
    blocker: "I do not know what to build first without creating a bloated marketplace.",
    founderType: "nontechnical",
    skillLevel: "zero",
    budget: "0",
    timeline: "week",
    goal: "pilot",
  },
  "ai-coach": {
    idea: "An AI coach that helps college students practice technical and behavioral interviews with role-specific feedback.",
    targetUser: "Students preparing for internships",
    edge: "I have resume review experience and a community of students actively applying for internships.",
    constraint: "I need something polished enough to demo fast without building a huge content library.",
    blocker: "I am unsure whether to focus on feedback quality, role coverage, or the interface first.",
    founderType: "newbie-dev",
    skillLevel: "beginner",
    budget: "100",
    timeline: "week",
    goal: "demo",
  },
  "student-finance": {
    idea: "An app that helps roommates and student teams track shared expenses and follow up on who still owes money.",
    targetUser: "Roommates, club treasurers, and student project teams",
    edge: "I already manage shared costs with friends and know exactly where the confusion happens.",
    constraint: "Trust matters, so the first version cannot feel messy or mathematically confusing.",
    blocker: "I do not know whether to start with reminders, expense entry, or payment collection.",
    founderType: "student-team",
    skillLevel: "intermediate",
    budget: "100",
    timeline: "month",
    goal: "revenue",
  },
};

const labels = {
  "nontechnical": "Non-technical founder",
  "newbie-dev": "Beginner developer",
  "student-team": "Student team",
  zero: "Zero-code comfort",
  beginner: "Can ship with guidance",
  intermediate: "Comfortable building MVPs",
  weekend: "Weekend sprint",
  week: "7-day launch sprint",
  month: "Month-long build",
  validate: "Validate demand",
  demo: "Demo a working prototype",
  pilot: "Get pilot users",
  revenue: "Earn first dollars",
};

const form = document.querySelector("#cofounder-form");
const results = document.querySelector("#results");
const resetButton = document.querySelector("#resetWorkspace");

const resultsTitle = document.querySelector("#resultsTitle");
const resultsSubtitle = document.querySelector("#resultsSubtitle");
const scorecards = document.querySelector("#scorecards");
const missionControl = document.querySelector("#missionControl");
const agentBoard = document.querySelector("#agentBoard");
const thesisArtifact = document.querySelector("#thesisArtifact");
const decisionArtifact = document.querySelector("#decisionArtifact");
const experimentArtifact = document.querySelector("#experimentArtifact");
const stackArtifact = document.querySelector("#stackArtifact");
const memoryArtifact = document.querySelector("#memoryArtifact");
const compareArtifact = document.querySelector("#compareArtifact");
const sprintArtifact = document.querySelector("#sprintArtifact");
const engineStatus = document.querySelector("#engineStatus");

document.querySelectorAll(".preset").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runWorkspace();
});

resetButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  form.reset();
  applyPreset("ai-coach");
  results.classList.add("hidden");
});

function applyPreset(key) {
  const preset = presets[key];
  if (!preset) {
    return;
  }

  for (const [field, value] of Object.entries(preset)) {
    const input = document.querySelector(`#${field}`);
    if (input) {
      input.value = value;
    }
  }
}

function getProfile() {
  const data = new FormData(form);
  return {
    idea: String(data.get("idea")).trim(),
    founderType: String(data.get("founderType")),
    skillLevel: String(data.get("skillLevel")),
    budget: String(data.get("budget")),
    timeline: String(data.get("timeline")),
    targetUser: String(data.get("targetUser")).trim(),
    goal: String(data.get("goal")),
    edge: String(data.get("edge")).trim() || "The founder is close to the problem and can reach real users quickly.",
    constraint: String(data.get("constraint")).trim() || "Resources are limited, so the MVP must stay narrow.",
    blocker: String(data.get("blocker")).trim() || "The founder needs help deciding the right first move.",
  };
}

async function runWorkspace() {
  const profile = getProfile();
  setLoadingState(profile);

  const workspace = await generateWorkspace(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, workspace }));
  renderWorkspace(profile, workspace);
  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setLoadingState(profile) {
  results.classList.remove("hidden");
  resultsTitle.textContent = `Running Launchmate for ${profile.targetUser}`;
  resultsSubtitle.textContent = "Product, CTO, growth, and critic agents are assembling a founder workspace.";
  engineStatus.textContent = "Running agent loop...";

  scorecards.innerHTML = renderScorecards([
    { label: "Engine", value: "Thinking", accent: true },
    { label: "Memory", value: "Capturing", accent: false },
    { label: "Scope", value: "Narrowing", accent: false },
    { label: "Outcome", value: "Synthesizing", accent: true },
  ]);

  missionControl.innerHTML = renderPhases([
    phase("Intake memory", "running", "Normalizing founder context, constraints, and target user."),
    phase("Agent debate", "pending", "Product, CTO, growth, and critic roles challenge each other."),
    phase("Decision pass", "pending", "Launchmate decides what to build now versus later."),
    phase("Founder sprint", "pending", "Converting analysis into concrete next steps."),
  ]);

  agentBoard.innerHTML = renderAgents([
    agent("Product", "Clarify the wedge and success metric.", "Scanning...", "", false),
    agent("CTO", "Design the fastest credible build path.", "Scanning...", "", false),
    agent("Growth", "Find the fastest validation motion.", "Scanning...", "", false),
    agent("Critic", "Attack weak assumptions and overbuild risk.", "Scanning...", "", true),
  ]);

  [thesisArtifact, decisionArtifact, experimentArtifact, stackArtifact, memoryArtifact, compareArtifact, sprintArtifact].forEach((section) => {
    section.innerHTML = "";
  });
}

async function generateWorkspace(profile) {
  try {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return buildLocalWorkspace(profile);
  }
}

function renderWorkspace(profile, workspace) {
  populateForm(profile);

  resultsTitle.textContent = workspace.projectName;
  resultsSubtitle.textContent = workspace.summary;
  engineStatus.textContent = workspace.engine.note;

  scorecards.innerHTML = renderScorecards(workspace.scorecards);
  missionControl.innerHTML = renderPhases(workspace.phases);
  agentBoard.innerHTML = renderAgents(workspace.agents);
  thesisArtifact.innerHTML = renderArtifactCards(workspace.thesis);
  decisionArtifact.innerHTML = renderDecisionCards(workspace.decisions);
  experimentArtifact.innerHTML = renderArtifactCards(workspace.experiments);
  stackArtifact.innerHTML = renderArtifactCards(workspace.stack);
  memoryArtifact.innerHTML = renderArtifactCards(workspace.memory);
  compareArtifact.innerHTML = renderCompare(workspace.compare);
  sprintArtifact.innerHTML = renderSprint(workspace.sprint);
}

function populateForm(profile) {
  Object.entries(profile).forEach(([field, value]) => {
    const input = document.querySelector(`#${field}`);
    if (input) {
      input.value = value;
    }
  });
}

function buildLocalWorkspace(profile) {
  const category = inferCategory(profile.idea);
  const mode = inferBuildMode(profile);
  const projectName = suggestProjectName(profile, category);
  const wedge = categoryWedge(category, profile);
  const stackPath = buildStackPath(profile, category);
  const growthMove = growthMotion(profile, category);
  const decisions = buildDecisions(profile, category, mode);
  const sprint = buildSprint(profile, category, mode);

  return {
    projectName,
    summary: `${projectName} is framing this as a ${wedge.label} for ${profile.targetUser}. Launchmate is optimizing for ${labels[profile.goal].toLowerCase()} without letting the founder overbuild.`,
    engine: {
      mode: "fallback",
      note: "Running in local demo mode. Add OPENAI_API_KEY and start the Node server to switch into real OpenAI multi-agent synthesis.",
    },
    scorecards: [
      scorecard("Founder mode", labels[profile.founderType], true),
      scorecard("Build path", stackPath.mode, false),
      scorecard("Launch risk", mode === "validation-first" ? "Medium" : "Low", false),
      scorecard("First proof", labels[profile.goal], true),
    ],
    phases: [
      phase("Intake memory", "done", `Captured founder mode, wedge, constraint, and blocker: ${profile.blocker}`),
      phase("Agent debate", "done", "Product narrowed scope, CTO reduced complexity, growth chose the validation motion, critic flagged overbuild."),
      phase("Decision pass", "done", `Launchmate committed to ${decisions[0].title.toLowerCase()} and removed distracting feature work.`),
      phase("Founder sprint", "done", "A 7-day execution board is ready with visible outputs per day."),
    ],
    agents: [
      agent("Product", "Clarify the wedge and define the smallest credible transformation.", wedge.productVerdict, `Success metric: ${wedge.metric}`, false),
      agent("CTO", "Pick the simplest build stack that matches the founder's skill and budget.", stackPath.verdict, `Guardrail: ${stackPath.guardrail}`, false),
      agent("Growth", "Find the fastest human loop that proves the idea deserves more software.", growthMove.verdict, `Fastest move: ${growthMove.fastestMove}`, false),
      agent("Critic", "Destroy fragile assumptions before the founder wastes a week building the wrong thing.", `Biggest risk: ${criticRisk(profile, category)}`, "Cut features that hide whether users truly care.", true),
    ],
    thesis: [
      artifact("Problem thesis", [wedge.problem, `Target user: ${profile.targetUser}`, `Why now: ${profile.edge}`]),
      artifact("Wedge thesis", [wedge.coreLoop, `First proof point: ${labels[profile.goal]}`, `Constraint to respect: ${profile.constraint}`]),
    ],
    decisions,
    experiments: [
      artifact("Experiment queue", [
        growthMove.fastestMove,
        growthMove.followUp,
        `Capture learning in a shared decision log after each user reaction.`,
      ]),
      artifact("Evidence Launchmate wants", [
        `One proof that ${profile.targetUser.toLowerCase()} understands the promise immediately.`,
        "One proof they complete the core loop without confusion.",
        "One proof they ask for the product again or refer someone else.",
      ]),
    ],
    stack: [
      artifact("Recommended path", [stackPath.mode, stackPath.verdict, stackPath.guardrail]),
      artifact("Build boundaries", [
        stackPath.doNow,
        stackPath.doLater,
        "Avoid AI features that only create prettier output without changing founder decisions.",
      ]),
    ],
    memory: [
      artifact("What Launchmate remembers", [
        `Founder profile: ${labels[profile.founderType]} with ${labels[profile.skillLevel].toLowerCase()}.`,
        `Hard constraint: ${profile.constraint}`,
        `Biggest blocker: ${profile.blocker}`,
      ]),
      artifact("Future session context", [
        `Chosen wedge: ${wedge.label}`,
        `Chosen validation motion: ${growthMove.fastestMove}`,
        `Key decision to preserve: ${decisions[0].choice}`,
      ]),
    ],
    compare: {
      raw: [
        "Answers the exact prompt, even if the prompt is strategically weak.",
        "May recommend feature lists without protecting scope.",
        "Does not preserve a founder-specific decision ledger by default.",
      ],
      launchmate: [
        "Normalizes the project before advising, so the conversation starts with context.",
        "Uses specialist roles to create disagreement and catch bad assumptions.",
        "Ends in artifacts the founder can execute, save, and revisit.",
      ],
    },
    sprint,
  };
}

function inferCategory(idea) {
  const lower = idea.toLowerCase();
  if (hasAny(lower, ["marketplace", "gig", "hire", "match", "booking"])) return "marketplace";
  if (hasAny(lower, ["interview", "coach", "study", "learning", "practice"])) return "learning";
  if (hasAny(lower, ["expense", "split", "finance", "payment", "budget"])) return "finance";
  if (hasAny(lower, ["community", "club", "group", "social", "network"])) return "community";
  return "productivity";
}

function inferBuildMode(profile) {
  if (profile.skillLevel === "zero" || profile.goal === "validate") return "validation-first";
  if (profile.timeline === "weekend") return "proof-fast";
  if (profile.goal === "pilot" || profile.goal === "revenue") return "pilot-first";
  return "prototype-first";
}

function categoryWedge(category, profile) {
  const map = {
    marketplace: {
      label: "curated marketplace wedge",
      problem: `People in ${profile.targetUser.toLowerCase()} need a fast match, not a full marketplace ecosystem on day one.`,
      coreLoop: "Collect both sides, manually match, and measure whether the connection is valuable enough to repeat.",
      productVerdict: "Do not automate the marketplace until you see both supply and demand showing up repeatedly.",
      metric: "Matches completed or replies generated",
    },
    learning: {
      label: "coaching feedback wedge",
      problem: `People in ${profile.targetUser.toLowerCase()} need focused feedback, not an endless content library.`,
      coreLoop: "Guide one practice moment, score it clearly, and tell the user what to improve next.",
      productVerdict: "A single high-quality coaching loop beats broad but shallow coverage.",
      metric: "Sessions completed with useful feedback",
    },
    finance: {
      label: "shared-money clarity wedge",
      problem: `People in ${profile.targetUser.toLowerCase()} need trusted clarity on balances before they need advanced finance features.`,
      coreLoop: "Log the expense, compute who owes what, and make repayment expectations obvious.",
      productVerdict: "Trust and clarity matter more than monetization in the first experience.",
      metric: "Groups that reconcile without confusion",
    },
    community: {
      label: "repeat-action community wedge",
      problem: `People in ${profile.targetUser.toLowerCase()} need one reason to return, not a giant social layer.`,
      coreLoop: "Help a user post, match, or respond once, then create a reason for the second action.",
      productVerdict: "Retention emerges from one compelling repeat action, not from feature volume.",
      metric: "Week-one repeat action rate",
    },
    productivity: {
      label: "single-workflow wedge",
      problem: `People in ${profile.targetUser.toLowerCase()} need one painful repetitive step made easy.`,
      coreLoop: "Capture the input, transform it in a useful way, and show clear saved time or better output.",
      productVerdict: "Nail one painful workflow before widening the product surface.",
      metric: "Tasks completed or time saved",
    },
  };

  return map[category];
}

function buildStackPath(profile, category) {
  if (profile.skillLevel === "zero") {
    return {
      mode: "Manual + no-code path",
      verdict: "Use a landing page, intake forms, and a manual backend before building software complexity.",
      guardrail: "Do not let tools replace user signal.",
      doNow: "Ship a landing page, intake form, and founder dashboard in Notion or Airtable.",
      doLater: "Only add a true app once manual ops reveal repeatable patterns.",
    };
  }

  if (profile.skillLevel === "beginner") {
    return {
      mode: "Lean full-stack path",
      verdict: `Use a single frontend flow plus Supabase so the ${category} product feels real without backend drag.`,
      guardrail: "One strong loop matters more than perfect architecture.",
      doNow: "Frontend + auth + one working data loop + one model-powered step if it truly changes the result.",
      doLater: "Expand roles, analytics, and automations after the first proof point lands.",
    };
  }

  return {
    mode: "Full founder OS path",
    verdict: "Build a clean Next.js workspace with persistence, event tracking, and one measurable user transformation.",
    guardrail: "Do not over-invest in infrastructure before activation data exists.",
    doNow: "Persist projects, decision logs, and key artifacts while keeping the interface lightweight.",
    doLater: "Add payments, collaboration, and deeper automation only if usage justifies the complexity.",
  };
}

function growthMotion(profile, category) {
  const base = {
    marketplace: "Collect ten demand-side signups and five supply-side responses, then do the first matches manually.",
    learning: "Run five guided sessions and ask users whether the feedback changed what they practiced next.",
    finance: "Test with three real roommate or club groups and watch whether balance clarity reduces follow-up confusion.",
    community: "Get ten users to complete the core loop and measure whether any return without being pushed.",
    productivity: "Shadow three users through the current workflow and prove the product removes a painful step.",
  }[category];

  return {
    verdict: `Validation should happen through a human loop before a feature expansion loop.`,
    fastestMove: base,
    followUp: `After each test, tighten the promise for ${profile.targetUser.toLowerCase()} and remove one source of friction.`,
  };
}

function criticRisk(profile, category) {
  const shared = profile.skillLevel === "zero"
    ? "The founder may mistake tooling progress for market proof."
    : "The founder may build too much surface area before the first memorable win.";

  const categoryRisk = {
    marketplace: "A two-sided market can fake momentum if neither side truly comes back.",
    learning: "Coaching products feel generic if the feedback is broad instead of role-specific.",
    finance: "Trust disappears if balances or reminders feel even slightly unreliable.",
    community: "Community products die fast without a compelling repeat reason.",
    productivity: "Workflow tools become cluttered when they solve too many adjacent jobs at once.",
  }[category];

  return `${shared} ${categoryRisk}`;
}

function buildDecisions(profile, category, mode) {
  const keepOut = mode === "validation-first"
    ? "native apps, complex auth, or anything that hides signal"
    : "feature branches that do not improve activation";

  return [
    decision("Commit to the wedge", `The product will start as a ${categoryWedge(category, profile).label}.`, "This keeps the promise sharp enough to test quickly.", `Keep out: ${keepOut}.`),
    decision("Bias toward proof", `Launchmate is optimizing for ${labels[profile.goal].toLowerCase()}, not feature completeness.`, "The founder needs credible momentum faster than they need a large roadmap.", "Every new feature must defend its role in reaching the proof point."),
    decision("Protect founder reality", `The build plan respects ${profile.constraint.toLowerCase()}.`, "A smart-sounding plan that ignores founder constraints is not actually useful.", "Any recommendation that violates the founder's constraint gets cut."),
  ];
}

function buildSprint(profile, category, mode) {
  const firstDay = mode === "validation-first"
    ? "Write a one-line promise, publish it, and get real reactions from the target user."
    : "Sketch the core flow and define what the first successful session looks like.";

  const secondDay = {
    marketplace: "Set up supply and demand intake, then run manual matching with a tiny batch.",
    learning: "Build the guided prompt flow and one concrete scorecard.",
    finance: "Build expense entry and the balance view before anything else.",
    community: "Create the first action and the first repeat action trigger.",
    productivity: "Build the one transformation step that makes the workflow worth revisiting.",
  }[category];

  return [
    sprintStep("Day 1", "Frame the promise", firstDay),
    sprintStep("Day 2", "Build the wedge", secondDay),
    sprintStep("Day 3-4", "Test with humans", "Put the product in front of real people and update the decision log immediately after each session."),
    sprintStep("Day 5-7", "Polish the path", "Remove friction, sharpen the copy, and prepare the founder story for demo day."),
  ];
}

function suggestProjectName(profile, category) {
  const map = {
    marketplace: "Launchmate Workspace for Student Marketplace",
    learning: "Launchmate Workspace for Interview Coach",
    finance: "Launchmate Workspace for Shared Finance",
    community: "Launchmate Workspace for Community Engine",
    productivity: "Launchmate Workspace for Founder Tooling",
  };
  return map[category] || `Launchmate Workspace for ${profile.targetUser}`;
}

function renderScorecards(items) {
  return items
    .map((item) => `
      <article class="metric-card ${item.accent ? "accent" : ""}">
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.label)}</span>
      </article>
    `)
    .join("");
}

function renderPhases(items) {
  return items
    .map((item) => `
      <article class="phase-card ${item.status}">
        <span class="phase-icon">${escapeHtml(item.status === "done" ? "Ready" : item.status === "running" ? "Running" : "Queued")}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.summary)}</p>
      </article>
    `)
    .join("");
}

function renderAgents(items) {
  return items
    .map((item) => `
      <article class="agent-card ${item.warning ? "warning" : ""}">
        <span class="agent-badge">${escapeHtml(item.name)}</span>
        <strong>${escapeHtml(item.mission)}</strong>
        <p>${escapeHtml(item.verdict)}</p>
        <p>${escapeHtml(item.note)}</p>
      </article>
    `)
    .join("");
}

function renderArtifactCards(items) {
  return items
    .map((item) => `
      <article class="artifact-card">
        <strong>${escapeHtml(item.title)}</strong>
        <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
      </article>
    `)
    .join("");
}

function renderDecisionCards(items) {
  return items
    .map((item) => `
      <article class="decision-card">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.choice)}</p>
        <p>${escapeHtml(item.reason)}</p>
        <p>${escapeHtml(item.keepOut)}</p>
      </article>
    `)
    .join("");
}

function renderCompare(compare) {
  return `
    <article class="compare-column raw">
      <strong>Raw LLM</strong>
      <ul>${compare.raw.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
    <article class="compare-column launchmate">
      <strong>Launchmate</strong>
      <ul>${compare.launchmate.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
  `;
}

function renderSprint(items) {
  return items
    .map((item) => `
      <article class="roadmap-step">
        <span class="roadmap-day">${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </article>
    `)
    .join("");
}

function artifact(title, bullets) {
  return { title, bullets };
}

function decision(title, choice, reason, keepOut) {
  return { title, choice, reason, keepOut };
}

function phase(title, status, summary) {
  return { title, status, summary };
}

function agent(name, mission, verdict, note, warning) {
  return { name, mission, verdict, note, warning };
}

function scorecard(label, value, accent) {
  return { label, value, accent };
}

function sprintStep(label, title, detail) {
  return { label, title, detail };
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hydrateFromStorage() {
  applyPreset("ai-coach");

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const profile = getProfile();
    renderWorkspace(profile, buildLocalWorkspace(profile));
    results.classList.remove("hidden");
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    populateForm(parsed.profile);
    renderWorkspace(parsed.profile, parsed.workspace);
    results.classList.remove("hidden");
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    const profile = getProfile();
    renderWorkspace(profile, buildLocalWorkspace(profile));
    results.classList.remove("hidden");
  }
}

hydrateFromStorage();
