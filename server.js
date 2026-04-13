const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/workspace") {
      await handleWorkspace(request, response);
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    const filePath = resolveStaticPath(request.url || "/");
    if (!filePath) {
      sendJson(response, 400, { error: "Invalid path." });
      return;
    }

    fs.readFile(filePath, (error, file) => {
      if (error) {
        if (error.code === "ENOENT") {
          sendJson(response, 404, { error: "Not found." });
          return;
        }

        sendJson(response, 500, { error: "Unable to read file." });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      response.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      response.end(file);
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Unexpected server error." });
  }
});

server.listen(PORT, () => {
  console.log(`Launchmate running at http://127.0.0.1:${PORT}`);
});

async function handleWorkspace(request, response) {
  const profile = await readJsonBody(request);

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY not configured. Frontend fallback mode will be used instead.",
    });
    return;
  }

  const agentOutputs = await Promise.all([
    runRoleAgent("Product", profile),
    runRoleAgent("CTO", profile),
    runRoleAgent("Growth", profile),
    runRoleAgent("Critic", profile),
  ]);

  const workspace = await synthesizeWorkspace(profile, agentOutputs);
  sendJson(response, 200, workspace);
}

async function runRoleAgent(role, profile) {
  const prompt = [
    "You are a specialist role inside Launchmate, an AI technical cofounder for first-time founders.",
    "Return valid JSON only.",
    "Required keys: mission, verdict, note, warning.",
    "The verdict should be strong, founder-specific, and concise.",
    `Role: ${role}.`,
    `Founder profile JSON: ${JSON.stringify(profile)}`,
  ].join("\n");

  return callOpenAIJson(prompt, 550);
}

async function synthesizeWorkspace(profile, agents) {
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
      sprint: [{ label: "string", title: "string", detail: "string" }],
    }),
    `Founder profile JSON: ${JSON.stringify(profile)}`,
    `Agent outputs JSON: ${JSON.stringify(agents)}`,
  ].join("\n");

  const workspace = await callOpenAIJson(prompt, 1800);
  workspace.engine = {
    mode: "openai",
    note: `Using OpenAI Responses API with a multi-agent orchestration pass on ${MODEL}.`,
  };
  return workspace;
}

function callOpenAIJson(prompt, maxOutputTokens) {
  const payload = JSON.stringify({
    model: MODEL,
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
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

function resolveStaticPath(urlPath) {
  const safePath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = safePath === "/" ? "/index.html" : safePath;
  const normalized = path.normalize(path.join(ROOT, requested));

  if (!normalized.startsWith(ROOT)) {
    return null;
  }

  return normalized;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
