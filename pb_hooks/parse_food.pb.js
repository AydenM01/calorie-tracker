/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/parse-food", (c) => {
  const info = $apis.requestInfo(c);

  if (!info.authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const body = info.data;
  const text = body.text || "";

  if (!text.trim()) {
    return c.json(400, { error: "No text provided" });
  }

  const apiKey = $os.getenv("GEMINI_API_KEY");
  if (!apiKey) {
    return c.json(500, { error: "Gemini API key not configured" });
  }

  const prompt = `Parse this food description into structured nutrition data. Estimate calories and macros as accurately as possible based on standard serving sizes.

Food: "${text}"

Respond ONLY with valid JSON, no markdown, no code blocks:
{
  "name": "Clean, concise food name",
  "calories": 350,
  "protein": 25,
  "carbs": 30,
  "fat": 12
}

If the description contains multiple items, combine them into one entry with totals. Use realistic portion sizes. Calories and macros should be numbers (integers).`;

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
          maxOutputTokens: 256,
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
