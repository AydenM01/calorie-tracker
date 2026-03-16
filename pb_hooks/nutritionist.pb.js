/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/nutritionist", (c) => {
  const info = $apis.requestInfo(c);

  if (!info.authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const body = info.data;
  const sanitize = (s, maxLen) => String(s || "").substring(0, maxLen || 200).replace(/["\\\n\r]/g, ' ');
  const clamp = (n, min, max) => Math.min(Math.max(parseInt(n) || 0, min), max);
  const remainingCal = clamp(body.remaining_cal, 0, 10000) || 2000;
  const remainingProtein = clamp(body.remaining_protein, 0, 1000) || 150;
  const remainingCarbs = clamp(body.remaining_carbs, 0, 1000) || 200;
  const remainingFat = clamp(body.remaining_fat, 0, 500) || 60;
  const validTypes = ["any","breakfast","lunch","dinner","snack"];
  const mealType = validTypes.includes(body.meal_type) ? body.meal_type : "any";
  const preferences = sanitize(body.preferences, 300);
  const allergies = sanitize(body.allergies, 200);
  const cuisines = sanitize(body.cuisines, 200);

  const apiKey = $os.getenv("GEMINI_API_KEY");
  if (!apiKey) {
    return c.json(500, { error: "Gemini API key not configured" });
  }

  const seed = Math.floor(Math.random() * 100000);
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = dayNames[new Date().getDay()];
  const themes = ['comfort food','quick & easy','meal prep friendly','restaurant-quality','budget-friendly','one-pot meals','high protein','light & fresh','international flavors','seasonal ingredients'];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const prompt = `You are a creative home chef and nutritionist. Today is ${today}. Theme: ${theme}. Generate ${mealType === "any" ? "4 unique meals (1 breakfast, 1 lunch, 1 dinner, 1 snack)" : "3 " + mealType + " options"} that fit within these remaining daily macros. IMPORTANT: Be highly creative and suggest completely different meals each time. Avoid generic options like plain chicken and rice. Think of specific dishes with real recipe names. (variation seed: ${seed}):
- Calories: ${remainingCal} cal remaining
- Protein: ${remainingProtein}g remaining
- Carbs: ${remainingCarbs}g remaining
- Fat: ${remainingFat}g remaining

${preferences ? "Food preferences: " + preferences : ""}
${allergies ? "Allergies/restrictions: " + allergies : ""}
${cuisines ? "Preferred cuisines: " + cuisines : ""}

Each meal should use a reasonable portion of the remaining macros (not all of them, unless it's the only meal left).

Keep each meal to 4-6 ingredients max and 3-5 instruction steps. Be concise.

Respond ONLY with valid JSON, no markdown, no code blocks:
[{"name":"Meal name","type":"breakfast","calories":450,"protein":35,"carbs":40,"fat":15,"description":"Brief description","ingredients":[{"item":"6oz chicken breast","cal":280,"p":52,"c":0,"f":6}],"instructions":["Step 1","Step 2"]}]`;

  let res;
  try {
    res = $http.send({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 8192,
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
    const text = data.candidates[0].content.parts[0].text;
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const meals = JSON.parse(cleaned);
    return c.json(200, { meals: meals });
  } catch (err) {
    return c.json(500, { error: "Failed to parse response: " + String(err) });
  }
}, $apis.requireRecordAuth());
