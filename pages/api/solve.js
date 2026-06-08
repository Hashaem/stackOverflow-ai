export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured. Go to Vercel → Settings → Environment Variables and add it, then redeploy." });
  }

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
  } catch (err) {
    return res.status(500).json({ error: `Network error reaching Anthropic: ${err.message}` });
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    return res.status(500).json({ error: `Anthropic returned non-JSON (status ${response.status})` });
  }

  // Anthropic API errors come back as 4xx/5xx with error field
  if (!response.ok) {
    return res.status(response.status).json({
      error: data?.error?.message || `Anthropic API error: ${response.status}`,
      type: data?.error?.type || "unknown",
    });
  }

  return res.status(200).json(data);
}
