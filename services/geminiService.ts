import { GoogleGenAI, Type } from "@google/genai";
import { Agent, Question, TestResult, TestStatus } from "../types";

// Helper to get AI instance
const getAI = (apiKey: string) => new GoogleGenAI({ apiKey });

// Robust JSON cleaner that handles Markdown blocks and common LLM formatting errors
const cleanJSON = (text: string): string => {
  if (!text) return "[]";
  let cleaned = text.trim();
  // Remove markdown wrapping
  cleaned = cleaned.replace(/^```json/i, '').replace(/^```/i, '');
  cleaned = cleaned.replace(/```$/i, '');
  // Remove potential leading text before the first [ or {
  const firstBracket = cleaned.search(/[\[\{]/);
  if (firstBracket > 0) cleaned = cleaned.substring(firstBracket);
  const lastBracket = cleaned.search(/[\]\}](?!.*[\]\}])/);
  if (lastBracket > -1) cleaned = cleaned.substring(0, lastBracket + 1);
  return cleaned.trim();
};

// 1. BUILD AGENT: Generates the system prompt
export const generateSystemPrompt = async (
  apiKey: string,
  data: {
    name: string;
    description: string;
    flow: string;
    language: string;
    rules: string;
    info: string;
    enrichWithSectorData?: boolean;
  }
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  
  const ai = getAI(apiKey);
  const model = "gemini-2.5-flash";

  // Note: We now primarily handle sector enrichment by injecting explicit sources into data.info
  // But we keep a high-level instruction here to reinforce the persona.
  let enrichmentInstruction = "";
  if (data.enrichWithSectorData) {
    enrichmentInstruction = `
    CONTEXTUAL AWARENESS:
    The Knowledge Base provided includes automatically generated industry insights. 
    Use these to sound like an industry native. Use correct jargon and anticipate standard customer needs 
    for this specific sector.
    `;
  }

  const prompt = `
    You are an expert AI Architect building a bot for a client.
    Task: Create a highly specific System Prompt.
    
    DATA:
    - Name: ${data.name}
    - Role: ${data.description}
    - Tone: ${data.language}
    - Flow: ${data.flow}
    - Rules: ${data.rules}
    - Knowledge Base (Extracted from inputs/documents): ${data.info}

    ${enrichmentInstruction}

    OUTPUT:
    Return ONLY the system prompt text. No introductory text.
    Structure it with clear headers like [ROLE], [KNOWLEDGE], [RULES], [CONVERSATION FLOW].
    Ensure the [KNOWLEDGE] section is comprehensive based on the provided Knowledge Base.
  `;

  const result = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  let text = result.text || "Failed to generate prompt.";
  return text.replace(/^```(markdown)?/i, '').replace(/```$/i, '').trim();
};

// 1b. PROCESS DOCUMENTS: Summarizes PDF/Text for the knowledge base
export const summarizeDocument = async (
  apiKey: string,
  content: { text?: string; inlineData?: { data: string; mimeType: string } },
  docName: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAI(apiKey);
  
  const promptText = `
    Analyze the attached document/text (${docName}).
    Task: Extract all key business information, FAQs, pricing, rules, and facts that an AI agent needs to know to answer customer questions.
    
    Output Format:
    Summary of ${docName}:
    - [Key Point 1]
    - [Key Point 2]
    ...
  `;

  const parts: any[] = [{ text: promptText }];
  if (content.inlineData) {
    parts.push({ inlineData: content.inlineData });
  } else if (content.text) {
    parts.push({ text: `DOCUMENT CONTENT:\n${content.text.substring(0, 100000)}` });
  }

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts },
  });

  return result.text || "";
};

// 1c. GENERATE SECTOR INSIGHTS: Fetches industry knowledge
export const generateSectorInsights = async (
  apiKey: string,
  context: { name: string; description: string; existingInfo: string }
): Promise<Array<{ title: string; description: string; content: string }>> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAI(apiKey);

  const prompt = `
    Based on the Agent Name "${context.name}" and Description "${context.description}", identify the specific industry (e.g., Solar Sales, Real Estate, SaaS, Dentistry).

    Task: Generate 5 distinct "Knowledge Source" documents that would help an AI agent in this sector.
    Examples: "Industry Terminology", "Handling [Specific] Objections", "Compliance Standards 2024", "Competitor Comparison".

    Return a valid JSON array of objects with:
    - title: string (The document title)
    - description: string (A one-sentence summary of what this document contains, for a selection UI)
    - content: string (The actual detailed knowledge text, at least 5 bullet points)

    Example: [{"title": "Solar Jargon", "description": "Definitions for kW, kWh, and Net Metering.", "content": "Kilowatt-hour (kWh): Unit of energy..."}]
  `;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(result.text || "[]");
  } catch (e) {
    console.error("Failed to parse sector insights", e);
    return [];
  }
};

// 2. TEST AGENT: Generates challenging questions
export const generateTestQuestions = async (
  apiKey: string,
  systemPrompt: string,
  categories: string[]
): Promise<Question[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAI(apiKey);
  
  const prompt = `
    Analyze this AI System Prompt:
    "${systemPrompt.substring(0, 5000)}..."

    Task: Generate ${categories.length} distinct test scenarios/questions.
    Categories: ${categories.join(', ')}.
    
    For each question, define "successCriteria" (what the AI MUST say to pass).
    
    Return a valid JSON Array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              text: { type: Type.STRING },
              successCriteria: { type: Type.STRING }
            },
            required: ["category", "text", "successCriteria"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    return rawData.map((item: any, index: number) => ({
      id: `q-${Date.now()}-${index}`,
      category: item.category || 'General',
      text: item.text,
      successCriteria: item.successCriteria,
      variations: 1,
      whenToAsk: index
    }));
  } catch (e) {
    console.error("JSON Parse/Gen Error:", e);
    return [];
  }
};

// 3. RUN TEST: Simulation Loop
export const runSingleTest = async (
  apiKey: string,
  agentSystemPrompt: string,
  question: Question
): Promise<TestResult> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAI(apiKey);
  const modelId = "gemini-2.5-flash";

  let agentText = "";
  try {
    const agentResponse = await ai.models.generateContent({
      model: modelId,
      contents: question.text,
      config: {
        systemInstruction: agentSystemPrompt,
      }
    });
    agentText = agentResponse.text || "Error: No response";
  } catch (error: any) {
    return {
      id: `err-${Date.now()}`,
      questionId: question.id,
      questionText: question.text,
      agentResponse: "API ERROR: " + error.message,
      status: TestStatus.FAILURE,
      rationale: "The API failed to respond. Check API Key or limits.",
      timestamp: Date.now()
    };
  }

  const evalPrompt = `
    ROLE: AI QA Tester.
    SCENARIO: User Asked: "${question.text}".
    SUCCESS CRITERIA: "${question.successCriteria}".
    ACTUAL AGENT RESPONSE: "${agentText}".
    
    TASK: Compare Response vs Criteria. Return SUCCESS/WARNING/FAILURE and rationale.
  `;

  try {
    const evalResponse = await ai.models.generateContent({
      model: modelId,
      contents: evalPrompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["SUCCESS", "WARNING", "FAILURE"] },
            rationale: { type: Type.STRING }
          },
          required: ["status", "rationale"]
        }
      }
    });

    const evalData = JSON.parse(evalResponse.text || "{}");
    let statusEnum = TestStatus.WARNING;
    const s = evalData.status?.toUpperCase();
    if (s === 'SUCCESS') statusEnum = TestStatus.SUCCESS;
    else if (s === 'FAILURE') statusEnum = TestStatus.FAILURE;

    return {
      id: `res-${Date.now()}`,
      questionId: question.id,
      questionText: question.text,
      agentResponse: agentText,
      status: statusEnum,
      rationale: evalData.rationale || "No rationale provided.",
      timestamp: Date.now()
    };
  } catch (e) {
    return {
      id: `err-eval-${Date.now()}`,
      questionId: question.id,
      questionText: question.text,
      agentResponse: agentText,
      status: TestStatus.WARNING,
      rationale: "Evaluation logic failed to parse result.",
      timestamp: Date.now()
    };
  }
};

// 4. IMPROVE AGENT
export const improvePromptWithExpert = async (
  apiKey: string,
  currentPrompt: string,
  failedTests: TestResult[],
  userInstruction: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAI(apiKey);

  const failuresText = failedTests.slice(0, 5).map(t => 
    `FAILED SCENARIO:\n- User: ${t.questionText}\n- AI Said: ${t.agentResponse}\n- Problem: ${t.rationale}`
  ).join('\n\n');

  const prompt = `
    You are a Senior Prompt Engineer.
    ORIGINAL SYSTEM PROMPT: ${currentPrompt}
    TEST FAILURES: ${failuresText}
    INSTRUCTION: "${userInstruction}"
    TASK: Rewrite the System Prompt to fix failures while keeping original intent. Return ONLY the new system prompt.
  `;

  const result = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt
  });

  return result.text ? result.text.replace(/^```(markdown)?/i, '').replace(/```$/i, '').trim() : currentPrompt;
};

// 5. SOCIAL MEDIA REPLIES
export const generateSocialReply = async (
  apiKey: string,
  systemPrompt: string,
  conversationContext: string,
  lastMessage: string,
  instruction?: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAI(apiKey);

  // We tweak the system prompt slightly to force short, social-media appropriate responses
  const socialSystemPrompt = `
  ${systemPrompt}
  
  [OVERRIDE FOR SOCIAL MEDIA PLATFORM]
  You are responding on a social media platform (Instagram DM / Facebook Messenger / Twitter).
  Keep it concise. No long emails. Use appropriate line breaks. 
  If the user didn't ask for a long explanation, keep it conversational.
  `;

  const userPrompt = `
    CONVERSATION HISTORY:
    ${conversationContext}
    
    LATEST MESSAGE FROM USER:
    "${lastMessage}"

    EXTRA INSTRUCTION: ${instruction || "Reply naturally based on your persona."}
  `;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction: socialSystemPrompt
    }
  });

  return result.text || "";
};