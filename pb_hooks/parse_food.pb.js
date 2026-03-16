/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/parse-food", (c) => {
  const info = $apis.requestInfo(c);

  if (!info.authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const body = info.data;
  const text = String(body.text || "").substring(0, 500).replace(/["\\\n\r]/g, ' ');

  if (!text.trim()) {
    return c.json(400, { error: "No text provided" });
  }

  const apiKey = $os.getenv("GEMINI_API_KEY");
  if (!apiKey) {
    return c.json(500, { error: "Gemini API key not configured" });
  }

  const prompt = `Parse this food description into individual ingredients with nutrition data. Estimate calories and macros as accurately as possible based on standard serving sizes.

Food: "${text}"

Respond ONLY with valid JSON, no markdown, no code blocks:
{
  "items": [
    { "name": "2 large eggs", "calories": 140, "protein": 12, "carbs": 1, "fat": 10 },
    { "name": "1 slice wheat toast", "calories": 80, "protein": 3, "carbs": 14, "fat": 1 }
  ]
}

Rules:
- Break down into individual ingredients/items
- Include quantity and preparation in the name (e.g. "1 tbsp butter", "6oz grilled chicken breast")
- Use realistic portion sizes
- All numbers should be integers`;

  let res;
  try {
    res = $http.send({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });
  } catch (err) {
    return c.json(500, { error: "HTTP request failed: " + String(err) });
  }

  if (res.statusCode !== 200) {
    return c.json(500, { error: "Gemini API error (HTTP " + res.statusCode + ")" });
  }

  try {
    const data = res.json;
    const responseText = data.candidates[0].content.parts[0].text;
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return c.json(200, parsed);
  } catch (err) {
    return c.json(500, { error: "Failed to parse: " + String(err) });
  }
}, $apis.requireRecordAuth());
