// AI Service (Navigator & Web Speech TTS)

/**
 * Gọi API AI điều hướng (AI Navigator) để chuyển tab hoặc tìm link
 * @param {string} prompt Câu lệnh hoặc câu chat của người dùng
 * @param {Array} history Lịch sử trò chuyện [{role: 'user'|'ai', text: '...'}]
 * @param {Object} aiCreds Cấu hình AI {provider, geminiKey, openaiKey, model}
 * @param {Array} links Danh sách liên kết người dùng
 * @returns {Promise<Object>} Trả về { reply: string, intent: { action: string, target: string } }
 */
export async function callAiNavigatorApi(prompt, history, aiCreds, links = []) {
  const { provider, geminiKey, openaiKey, model } = aiCreds;

  let systemInstruction = `You are the AI Assistant named DANH for a Personal Life OS dashboard.
Your job is to direct the user to the correct page/tab or help them find and open their saved links.
Analyze the user's latest message (in English) and determine their intent.

You MUST respond ONLY with a valid JSON object. Do not include markdown code block formatting (like \`\`\`json ... \`\`\`) in your raw response.
The JSON structure must match this schema exactly:
{
  "reply": "Your friendly conversational response to the user in English confirming the action.",
  "intent": {
    "action": "switch_tab" | "open_link" | "none",
    "target": "target-value-here" // Tab ID (if action is "switch_tab"), the link Index number as a string (if action is "open_link"), or "" if "none".
  }
}

Valid tab IDs for "switch_tab" are:
- 'home-tab' (Home / Launchpad)
- 'cost-tab' (Expenses)
- 'vocab-tab' (Vocabulary)
- 'practice-tab' (Practice / Anki SRS)
- 'habit-tab' (Habits)
- 'task-tab' (Tasks)
- 'goal-tab' (Goals)
- 'link-tab' (Links)
- 'prompt-tab' (Prompts)
- 'map-tab' (Travels)`;

  if (links && links.length > 0) {
    systemInstruction += `

Here are the user's saved links (Index: Title - Category):
${links.map(l => `${l.index}: ${l.title} (${l.category})`).join('\n')}

If the user is looking for, asking for, or trying to open a specific link from the saved links above:
1. Identify the best matching link (case-insensitive, partial matching allowed).
2. Set "action" to "open_link" and "target" to the matching link's INDEX number as a string (e.g., "0", "1", "2").
3. In your "reply", write a friendly message in English telling them you found the link and are opening it.`;
  }

  systemInstruction += `

If the user is just saying hello, asking a general question, or the request is ambiguous, set "action" to "none" and "target" to "". Keep your reply friendly, concise, and in English.`;

  if (provider === "gemini") {
    if (!geminiKey) throw new Error("Thiếu Gemini API Key.");
    const geminiModel = model.trim() || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const contents = [];
    const recentHistory = history.slice(-6);
    recentHistory.forEach(msg => {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      });
    });
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 300
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API Error: ${errData.error?.message || response.status}`);
    }

    const resData = await response.json();
    const resultText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("Gemini không trả về kết quả.");
    return parseNavigatorJsonResponse(resultText);

  } else if (provider === "openai") {
    if (!openaiKey) throw new Error("Thiếu OpenAI API Key.");
    const openaiModel = model.trim() || "gpt-4o-mini";
    const url = "https://api.openai.com/v1/chat/completions";

    const messages = [{ role: "system", content: systemInstruction }];
    const recentHistory = history.slice(-6);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text
      });
    });
    messages.push({ role: "user", content: prompt });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error: ${errData.error?.message || response.status}`);
    }

    const resData = await response.json();
    const resultText = resData.choices?.[0]?.message?.content;
    if (!resultText) throw new Error("OpenAI không trả về kết quả.");
    return parseNavigatorJsonResponse(resultText);

  } else {
    throw new Error("Nhà cung cấp AI không hợp lệ.");
  }
}

/**
 * Phân giải kết quả JSON của AI Navigator
 */
function parseNavigatorJsonResponse(text) {
  try {
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(cleanedText);
    return {
      reply: parsed.reply || "Processing...",
      intent: {
        action: parsed.intent?.action || "none",
        target: parsed.intent?.target || "",
        data: parsed.intent?.data || null
      }
    };
  } catch (err) {
    console.error("Lỗi parse JSON Navigator:", err, text);
    return {
      reply: text.substring(0, 100) + "...",
      intent: { action: "none", target: "", data: null }
    };
  }
}

/**
 * Phát âm đoạn văn tiếng Anh bằng Web Speech API
 * @param {string} text 
 */
export function speakEnglishText(text) {
  if (!('speechSynthesis' in window)) {
    console.log("[ai.js] Trình duyệt không hỗ trợ Web Speech Synthesis API.");
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*_`]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 0.85;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferredVoice = voices.find(v => v.lang === "en-US" || v.lang === "en_US" || v.lang.includes("Google US English")) ||
                            voices.find(v => v.lang.startsWith("en"));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("TTS Speech failed:", e);
  }
}
