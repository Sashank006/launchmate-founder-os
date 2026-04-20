const { createWorkspaceFromProfile } = require("../workspace-engine");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const workspace = await createWorkspaceFromProfile(request.body || {}, {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    });

    response.status(200).json(workspace);
  } catch (error) {
    response.status(error.statusCode || 500).json({
      error: error.message || "Unable to generate workspace.",
    });
  }
};
