/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/parse-exercise", (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const body = info.data;
  const text = String(body.text || "").substring(0, 500).replace(/["\\\n\r]/g, ' ');
  const weightLbs = Math.min(Math.max(parseInt(body.weight_lbs) || 160, 50), 700);

  if (!text.trim()) {
    return c.json(400, { error: "No text provided" });
  }

  const apiKey = $os.getenv("GEMINI_API_KEY");
  if (!apiKey) {
    return c.json(500, { error: "Gemini API key not configured" });
  }

  const prompt = `Parse this exercise description and estimate calories burned. The person weighs ${weightLbs} lbs. Use standard MET values for accuracy.

Exercise: "${text}"

Respond ONLY with valid JSON, no markdown, no code blocks:
{
  "items": [
    { "name": "Running (6 mph)", "calories_burned": 350, "duration_min": 30 }
  ]
}

Rules:
- Break into individual exercises if multiple
- Include intensity in name if mentioned
- Use MET values × weight × duration for calorie estimates
- Duration in minutes, calories as integers`;

  let res;
  try {
    res = $http.send({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
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
