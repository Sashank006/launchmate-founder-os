const https = require("https");

async function createWorkspaceFromProfile(profile, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  const model = options.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY not configured.");
    error.statusCode = 503;
    throw error;
  }

  const agentOutputs = await Promise.all([
    runRoleAgent("Product", profile, apiKey, model),
    runRoleAgent("CTO", profile, apiKey, model),
    runRoleAgent("Growth", profile, apiKey, model),
    runRoleAgent("Critic", profile, apiKey, model),
  ]);

  const workspace = await synthesizeWorkspace(profile, agentOutputs, apiKey, model);
  workspace.engine = {
    mode: "openai",
    note: `Using OpenAI Responses API with a multi-agent orchestration pass on ${model}.`,
  };
  return workspace;
}

async function runRoleAgent(role, profile, apiKey, model) {
  const prompt = [
    "You are a specialist role inside Launchmate, an AI technical cofounder for first-time founders.",
    "Return valid JSON only.",
    "Required keys: mission, verdict, note, warning.",
    "The verdict should be strong, founder-specific, and concise.",
    `Role: ${role}.`,
    `Founder profile JSON: ${JSON.stringify(profile)}`,
  ].join("\n");

  return callOpenAIJson(prompt, 550, apiKey, model);
}

async function synthesizeWorkspace(profile, agents, apiKey, model) {
  const prompt = [
    "You are the Launchmate orchestrator.",
    "Return valid JSON only.",
    "Build a founder workspace that is clearly different from asking a raw LLM one question.",
    "Use the agent outputs as inputs and make the workspace feel opinionated, actionable, and anti-overbuild.",
    "Required JSON shape:",
    JSON.stringify({
      projectName: "string",
      summary: "string",
      engine: { mode: "openai", note: "string" },
      scorecards: [{ label: "string", value: "string", accent: true }],
      phases: [{ title: "string", status: "done", summary: "string" }],
      agents: [{ name: "string", mission: "string", verdict: "string", note: "string", warning: false }],
      thesis: [{ title: "string", bullets: ["string"] }],
      decisions: [{ title: "string", choice: "string", reason: "string", keepOut: "string" }],
      experiments: [{ title: "string", bullets: ["string"] }],
      stack: [{ title: "string", bullets: ["string"] }],
      memory: [{ title: "string", bullets: ["string"] }],
      compare: { raw: ["string"], launchmate: ["string"] },
      submission: [{ title: "string", bullets: ["string"] }],
      launchChecklist: [{ title: "string", bullets: ["string"] }],
      sprint: [{ label: "string", title: "string", detail: "string" }]
    }),
    `Founder profile JSON: ${JSON.stringify(profile)}`,
    `Agent outputs JSON: ${JSON.stringify(agents)}`,
  ].join("\n");

  return callOpenAIJson(prompt, 2200, apiKey, model);
}

function callOpenAIJson(prompt, maxOutputTokens, apiKey, model) {
  const payload = JSON.stringify({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are Launchmate. Always respond with valid JSON only when the user asks for JSON.",
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
    max_output_tokens: maxOutputTokens,
  });

  return new Promise((resolve, reject) => {
    const apiRequest = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/responses",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Authorization: `Bearer ${apiKey}`,
        },
      },
      (apiResponse) => {
        let body = "";
        apiResponse.on("data", (chunk) => {
          body += chunk;
        });

        apiResponse.on("end", () => {
          try {
            if (apiResponse.statusCode < 200 || apiResponse.statusCode >= 300) {
              reject(new Error(`OpenAI API error ${apiResponse.statusCode}: ${body}`));
              return;
            }

            const parsed = JSON.parse(body);
            const text = extractOutputText(parsed);
            resolve(JSON.parse(text));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    apiRequest.on("error", reject);
    apiRequest.write(payload);
    apiRequest.end();
  });
}

function extractOutputText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const texts = [];
  for (const item of response.output || []) {
    if (item.type !== "message") {
      continue;
    }

    for (const content of item.content || []) {
      if ((content.type === "output_text" || content.type === "text") && content.text) {
        texts.push(content.text);
      }
    }
  }

  if (!texts.length) {
    throw new Error("OpenAI response did not include output text.");
  }

  return texts.join("\n");
}

module.exports = {
  createWorkspaceFromProfile,
};
