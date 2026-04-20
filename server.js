const http = require("http");
const fs = require("fs");
const path = require("path");
const { createWorkspaceFromProfile } = require("./workspace-engine");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

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
      const profile = await readJsonBody(request);
      try {
        const workspace = await createWorkspaceFromProfile(profile, {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
        });
        sendJson(response, 200, workspace);
      } catch (error) {
        sendJson(response, error.statusCode || 500, {
          error: error.message || "Unable to generate workspace.",
        });
      }
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

function resolveStaticPath(urlPath) {
  const safePath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = safePath === "/" ? "index.html" : safePath.replace(/^\/+/, "");
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
