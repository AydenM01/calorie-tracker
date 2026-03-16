/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/nutritionist", (c) => {
  const info = $apis.requestInfo(c);

  if (!info.authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const body = info.data;
  const remainingCal = body.remaining_cal || 2000;
  const remainingProtein = body.remaining_protein || 150;
  const remainingCarbs = body.remaining_carbs || 200;
  const remainingFat = body.remaining_fat || 60;
  const mealType = body.meal_type || "any";
  const preferences = body.preferences || "";
  const allergies = body.allergies || "";
  const cuisines = body.cuisines || "";

  const apiKey = $os.getenv("GEMINI_API_KEY");
  if (!apiKey) {
    return c.json(500, { error: "Gemini API key not configured" });
  }

  const seed = Math.floor(Math.random() * 100000);
  const prompt = `You are a creative nutritionist AI. Generate ${mealType === "any" ? "4 meals (1 breakfast, 1 lunch, 1 dinner, 1 snack)" : "3 " + mealType + " options"} that fit within these remaining daily macros. Be creative and varied — suggest different meals each time (seed: ${seed}):
- Calories: ${remainingCal} cal remaining
- Protein: ${remainingProtein}g remaining
- Carbs: ${remainingCarbs}g remaining
- Fat: ${remainingFat}g remaining

${preferences ? "Food preferences: " + preferences : ""}
${allergies ? "Allergies/restrictions: " + allergies : ""}
${cuisines ? "Preferred cuisines: " + cuisines : ""}

Each meal should use a reasonable portion of the remaining macros (not all of them, unless it's the only meal left).

Respond ONLY with valid JSON in this exact format, no markdown, no code blocks:
[
  {
    "name": "Meal name",
    "type": "breakfast",
    "calories": 450,
    "protein": 35,
    "carbs": 40,
    "fat": 15,
    "description": "Brief 1-line description",
    "ingredients": [
      { "item": "6oz chicken breast", "cal": 280, "p": 52, "c": 0, "f": 6 },
      { "item": "1 cup brown rice", "cal": 215, "p": 5, "c": 45, "f": 2 }
    ],
    "instructions": ["Step 1", "Step 2", "Step 3"]
  }
]

The total calories/protein/carbs/fat for the meal MUST equal the sum of all ingredients.`;

  let res;
  try {
    res = $http.send({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.2,
          maxOutputTokens: 2048,
        },
      }),
    });
  } catch (err) {
    return c.json(500, { error: "HTTP request failed: " + String(err) });
  }

  if (res.statusCode !== 200) {
    return c.json(500, { error: "Gemini API error (HTTP " + res.statusCode + ")", body: res.raw });
  }

  try {
    const data = res.json;
    const text = data.candidates[0].content.parts[0].text;
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const meals = JSON.parse(cleaned);
    return c.json(200, { meals: meals });
  } catch (err) {
    return c.json(500, { error: "Failed to parse response: " + String(err) });
  }
}, $apis.requireRecordAuth());
