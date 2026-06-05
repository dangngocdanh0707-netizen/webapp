// DỊCH VỤ TÍCH HỢP AI - GEMINI & OPENAI SERVICE

// Các cấu hình kịch bản nhập vai (System prompts)
export const SCENARIOS = {
  casual: {
    title: "Casual Conversation",
    description: "Tán gẫu tự do hằng ngày với một người bạn nước ngoài.",
    systemInstruction: "You are a friendly and casual English-speaking friend named Alex. Chat with the user about their hobbies, interests, weather, daily activities, or whatever they want. Keep your responses friendly, warm, and natural. Keep each reply relatively concise (1-3 sentences) so the user can easily respond."
  },
  interview: {
    title: "Job Interview Practice",
    description: "Luyện phỏng vấn xin việc bằng tiếng Anh. AI đóng vai nhà tuyển dụng.",
    systemInstruction: "You are an experienced HR manager interviewing the user for their dream job. Ask professional interview questions (one at a time), evaluate their answers, and keep the tone professional, polite, and encouraging. Ask follow-up questions based on their answers. Keep each reply concise (1-2 sentences)."
  },
  restaurant: {
    title: "At a Restaurant",
    description: "Giao tiếp gọi món tại nhà hàng/quán cà phê. AI đóng vai nhân viên phục vụ.",
    systemInstruction: "You are a polite waiter or waitress at a cozy restaurant. Welcome the customer (the user), take their order, suggest items, and handle payments. Keep the dialogue realistic and use common restaurant vocabulary. Keep each response concise (1-2 sentences)."
  },
  travel: {
    title: "Travel & Booking",
    description: "Nhận phòng khách sạn, hỏi đường khi đi du lịch. AI đóng vai lễ tân hoặc người địa phương.",
    systemInstruction: "You are a helpful hotel receptionist at a hotel front desk in London, or a local person on the street. Help the user check in, resolve issues, or give directions. Keep the tone helpful, polite, and realistic. Keep each response concise (1-2 sentences)."
  }
};

/**
 * Gọi API AI tương ứng (Gemini hoặc OpenAI)
 * @param {string} prompt Câu nói mới của người dùng
 * @param {Array} history Lịch sử hội thoại dạng [{role: 'user'|'ai', text: '...'}]
 * @param {Object} aiCreds Cấu hình từ localStorage {provider, geminiKey, openaiKey, model}
 * @param {string} scenarioKey Tên kịch bản nhập vai ('casual', 'interview', etc.)
 * @returns {Promise<Object>} Trả về { reply: string, corrections: string, isCorrect: boolean, correctText: string }
 */
export async function callAiApi(prompt, history, aiCreds, scenarioKey) {
  const { provider, geminiKey, openaiKey, model } = aiCreds;
  const scenario = SCENARIOS[scenarioKey] || SCENARIOS.casual;

  const finalSystemInstruction = `${scenario.systemInstruction}

CRITICAL INSTRUCTION: You must analyze the user's latest message for any grammar or spelling mistakes. 
You MUST respond ONLY with a valid JSON object. Do not include markdown code block formatting (like \`\`\`json ... \`\`\`) in your raw response, return only the raw JSON.
The JSON structure must match this schema exactly:
{
  "reply": "Your natural conversational reply to the user in English",
  "isCorrect": true, // Set to true if the user's sentence is grammatically correct and has no spelling mistakes, even if it is simple or could be phrased differently. Set to false ONLY if there is an actual grammatical error, typo, spelling mistake, or completely wrong word choice.
  "correctText": "A grammatically corrected version of the user's input. If the user's input has no grammar or spelling errors, you MUST set 'isCorrect' to true and return an empty string or the exact same sentence here. Do NOT rewrite correct sentences just to suggest synonyms or advanced vocabulary.",
  "corrections": "Explanation of actual grammar/spelling mistakes in Vietnamese. If the user made no errors, write 'Không có lỗi ngữ pháp!' or 'Không có'."
}`;

  if (provider === "gemini") {
    if (!geminiKey) {
      throw new Error("Thiếu Gemini API Key. Vui lòng thiết lập trong Cấu hình (Settings).");
    }
    const geminiModel = model.trim() || "gemini-2.5-flash";
    return await callGeminiAPI(prompt, history, geminiKey, geminiModel, finalSystemInstruction);
  } else if (provider === "openai") {
    if (!openaiKey) {
      throw new Error("Thiếu OpenAI API Key. Vui lòng thiết lập trong Cấu hình (Settings).");
    }
    const openaiModel = model.trim() || "gpt-4o-mini";
    return await callOpenaiAPI(prompt, history, openaiKey, openaiModel, finalSystemInstruction);
  } else {
    throw new Error("Nhà cung cấp AI không hợp lệ.");
  }
}

/**
 * Tích hợp trực tiếp REST API của Gemini (Client-side)
 */
async function callGeminiAPI(prompt, history, apiKey, model, systemInstruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Định dạng lịch sử hội thoại cho Gemini
  const contents = [];
  
  // Thêm lịch sử (giới hạn 10 câu gần nhất để tiết kiệm token và giữ hiệu năng)
  const recentHistory = history.slice(-10);
  recentHistory.forEach(msg => {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    });
  });

  // Thêm câu thoại hiện tại của người dùng
  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  });

  const requestBody = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 800
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status} Error`;
    throw new Error(`Gemini API Error: ${errMsg}`);
  }

  const resData = await response.json();
  const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textResponse) {
    throw new Error("Gemini không trả về phản hồi hợp lệ.");
  }

  return parseJsonReponse(textResponse);
}

/**
 * Tích hợp trực tiếp REST API của OpenAI (Client-side)
 */
async function callOpenaiAPI(prompt, history, apiKey, model, systemInstruction) {
  const url = "https://api.openai.com/v1/chat/completions";

  // Định dạng lịch sử hội thoại cho OpenAI
  const messages = [
    { role: "system", content: systemInstruction }
  ];

  // Thêm lịch sử (giới hạn 10 câu gần nhất)
  const recentHistory = history.slice(-10);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text
    });
  });

  // Thêm câu thoại hiện tại của người dùng
  messages.push({
    role: "user",
    content: prompt
  });

  const requestBody = {
    model: model,
    messages: messages,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 800
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status} Error`;
    throw new Error(`OpenAI API Error: ${errMsg}`);
  }

  const resData = await response.json();
  const textResponse = resData.choices?.[0]?.message?.content;

  if (!textResponse) {
    throw new Error("OpenAI không trả về phản hồi hợp lệ.");
  }

  return parseJsonReponse(textResponse);
}

/**
 * Hàm phân giải kết quả JSON trả về từ AI một cách an toàn
 * @param {string} text 
 * @returns {Object}
 */
function parseJsonReponse(text) {
  try {
    // Làm sạch chuỗi JSON nếu AI vô tình bọc trong ```json ... ```
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    }
    
    const parsed = JSON.parse(cleanedText);
    
    // Đảm bảo có đầy đủ các trường cần thiết
    return {
      reply: parsed.reply || "I'm sorry, I couldn't process that response.",
      isCorrect: typeof parsed.isCorrect === "boolean" ? parsed.isCorrect : true,
      correctText: parsed.correctText || "",
      corrections: parsed.corrections || "",
      vocabUpgrades: Array.isArray(parsed.vocabUpgrades) ? parsed.vocabUpgrades : [],
      collocations: Array.isArray(parsed.collocations) ? parsed.collocations : []
    };
  } catch (err) {
    console.error("Lỗi phân giải JSON từ AI:", err, "Raw text:", text);
    // Trả về fallback object nếu JSON bị lỗi cấu trúc
    return {
      reply: text.substring(0, 150) + "...",
      isCorrect: true,
      correctText: "",
      corrections: "Không thể phân tích ngữ pháp do lỗi phản hồi định dạng từ AI.",
      vocabUpgrades: [],
      collocations: []
    };
  }
}

/**
 * Xác thực câu luyện tập của người dùng bằng AI
 * @param {string} userAttempt Câu nhập của người dùng
 * @param {string} targetSentence Câu mẫu đúng
 * @param {Object} aiCreds Cấu hình AI {provider, geminiKey, openaiKey, model}
 * @returns {Promise<boolean>} Trả về true nếu đúng ngữ pháp và tương đồng ý nghĩa, ngược lại false
 */
export async function verifyPracticeSentence(userAttempt, targetSentence, aiCreds) {
  const { provider, geminiKey, openaiKey, model } = aiCreds;

  const prompt = `User attempt: "${userAttempt}"\nTarget correct sentence: "${targetSentence}"`;
  const systemInstruction = `You are an English language evaluator. 
Determine if the user's sentence (User attempt) is grammatically correct in English and conveys the same core meaning as the target correct sentence.
Be encouraging but precise. Minor styling differences or different vocabulary that is still correct and natural is acceptable.
You MUST respond ONLY with a valid JSON object. Do not include markdown code block formatting (like \`\`\`json ... \`\`\`) in your raw response.
Format:
{
  "isCorrect": true
}
or
{
  "isCorrect": false
}`;

  try {
    if (provider === "gemini") {
      if (!geminiKey) throw new Error("Thiếu Gemini API Key.");
      const geminiModel = model.trim() || "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
      
      const requestBody = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 100
        }
      };
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`);
      const resData = await response.json();
      const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error("Gemini không trả về phản hồi.");
      
      const parsed = JSON.parse(textResponse.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, ""));
      return parsed.isCorrect === true;
      
    } else if (provider === "openai") {
      if (!openaiKey) throw new Error("Thiếu OpenAI API Key.");
      const openaiModel = model.trim() || "gpt-4o-mini";
      const url = "https://api.openai.com/v1/chat/completions";
      
      const requestBody = {
        model: openaiModel,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 100
      };
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
      const resData = await response.json();
      const textResponse = resData.choices?.[0]?.message?.content;
      if (!textResponse) throw new Error("OpenAI không trả về phản hồi.");
      
      const parsed = JSON.parse(textResponse.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, ""));
      return parsed.isCorrect === true;
    } else {
      throw new Error("Nhà cung cấp AI không hợp lệ.");
    }
  } catch (err) {
    console.error("[ai.js] Lỗi xác thực câu luyện tập:", err);
    return false;
  }
}

/**
 * Dịch văn bản tiếng Anh sang tiếng Việt tự nhiên bằng AI
 * @param {string} text Văn bản tiếng Anh cần dịch
 * @param {Object} aiCreds Cấu hình AI {provider, geminiKey, openaiKey, model}
 * @returns {Promise<string>} Chuỗi tiếng Việt được dịch
 */
export async function translateMessageText(text, aiCreds) {
  const { provider, geminiKey, openaiKey, model } = aiCreds;
  const prompt = `Translate this English text into natural Vietnamese. Respond only with the translated text, no extra formatting or explanation.\nText: "${text}"`;

  if (provider === "gemini") {
    if (!geminiKey) throw new Error("Thiếu Gemini API Key.");
    const geminiModel = model.trim() || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 }
      })
    });
    if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`);
    const resData = await response.json();
    const result = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) throw new Error("Gemini không trả về kết quả dịch.");
    return result.trim();

  } else if (provider === "openai") {
    if (!openaiKey) throw new Error("Thiếu OpenAI API Key.");
    const openaiModel = model.trim() || "gpt-4o-mini";
    const url = "https://api.openai.com/v1/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: openaiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 500
      })
    });
    if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
    const resData = await response.json();
    const result = resData.choices?.[0]?.message?.content;
    if (!result) throw new Error("OpenAI không trả về kết quả dịch.");
    return result.trim();

  } else {
    throw new Error("Nhà cung cấp AI không hợp lệ.");
  }
}
