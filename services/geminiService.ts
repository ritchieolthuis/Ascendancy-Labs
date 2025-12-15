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

// 0. NEW: DEEP WEBSITE ANALYSIS
export const analyzeCompanyWebsite = async (
  apiKey: string,
  url: string,
  companyName: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAI(apiKey);

  const prompt = `
    You are a Senior Business Analyst. 
    Perform a deep, comprehensive analysis of the company "${companyName}" based on their website: ${url}.
    
    You MUST use Google Search to explore the website and related verified sources. 
    Do not just look at the homepage; look for "About Us", "Products", "Projects", and "Technical Specifications".

    OUTPUT FORMAT (Strictly follow this structure):

    1. **Who are they?** 
       - Origin, location, core identity, and market positioning.
    
    2. **What do they do?** 
       - Core activities, services, and unique value proposition.
    
    3. **Product/Service Portfolio** (BE SPECIFIC):
       - List specific product categories.
       - **CRITICAL:** List specific BRAND NAMES, technical materials, or proprietary technologies mentioned (e.g., if they sell "Silbonit" or "Cetris", mention them).
    
    4. **Applications & Projects**:
       - Where are their products used? (e.g., Facades, Interiors).
       - Name specific reference projects if found (e.g., "Terminal at Airport X").
    
    5. **Technical & Compliance**:
       - List certifications (ISO, FSC, PEFC, EPD).
       - Mention sustainability commitments or specific technical standards they adhere to.

    Use a professional, factual tone.
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    return result.text || "Could not analyze website.";
  } catch (e: any) {
    console.error("Website Analysis Failed", e);
    throw new Error("Analysis failed. Ensure your API Key supports Google Search (Standard/Pay-as-you-go).");
  }
};

// 1. BUILD AGENT: Generates the system prompt
export const generateSystemPrompt = async (
  apiKey: string,
  data: {
    name: string;
    website?: string;
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
    [CONTEXTUAL AWARENESS & SECTOR INTELLIGENCE]
    The Knowledge Base below contains verified industry insights, regulations, and trends specifically for this company's sector.
    1. USE THIS KNOWLEDGE: If a user asks about certifications, regulations, or market trends, quote the provided knowledge sources accurately.
    2. ADAPT TO SECTOR: Use the specific jargon and professional tone found in the sector analysis.
    3. BE PROACTIVE: If the sector data suggests specific compliance needs (e.g. safety rules), mention them when relevant.
    `;
  }

  // Handle [AUTO-MATCH] logic for adaptive language agents
  let languageContext = data.language;
  if (languageContext.startsWith('[AUTO-MATCH] ')) {
     const style = languageContext.replace('[AUTO-MATCH] ', '');
     languageContext = `Style: ${style}. REQUIREMENT: The agent must auto-detect the user's language and reply in that same language. Do NOT default to English unless the user speaks English.`;
  }

  const prompt = `
    You are an expert AI Architect building a bot for a client.
    Task: Create a highly specific System Prompt.
    
    DATA:
    - Name: ${data.name}
    - Website: ${data.website || 'Not provided'}
    - Role: ${data.description}
    - Tone/Language: ${languageContext}
    - Flow: ${data.flow}
    - Rules: ${data.rules}
    - Knowledge Base (Extracted from inputs/documents): ${data.info}

    ${enrichmentInstruction}

    OUTPUT:
    Return ONLY the system prompt text. No introductory text.
    Structure it with clear headers like [ROLE], [KNOWLEDGE], [RULES], [CONVERSATION FLOW].
    Ensure the [KNOWLEDGE] section is comprehensive based on the provided Knowledge Base.
    If the Tone settings requested Auto-Match language, include a strict instruction in the system prompt for the agent to detect and match the user's language.
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

// 1c. GENERATE SECTOR INSIGHTS: Fetches industry knowledge with REAL SOURCES
export const generateSectorInsights = async (
  apiKey: string,
  context: { name: string; websiteUrl: string; description: string; existingInfo: string }
): Promise<Array<{ title: string; description: string; content: string; uri?: string }>> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAI(apiKey);

  let finalChunks: any[] = [];

  // IMPLEMENTATION OF ROBUST SECTOR INTELLIGENCE AGENT
  // Based on strict user procedure to avoid "No sources found" errors.

  const mainPrompt = `
    You are a Sector Intelligence Research Agent.

    Goal:
    For the company "${context.name}" located at "${context.websiteUrl}" (Context: "${context.description}"), you MUST find and verify external knowledge sources.
    You are NOT allowed to stop with “no specific sources found” as long as any relevant document exists online.

    Procedure:
    1. Open the company URL and infer: sector, country/region, and main products/services.
    2. Search and collect ONLY verifiable documents that match at least one of these categories:
       - Company documentation: manuals, product sheets, application guides, safety data sheets, FAQs, ESG reports, Annual Reports.
       - Sector & regulation: laws, guidelines, standards, certifications (ISO, NEN, GDPR), compliance requirements relevant to this industry.
       - Sustainability: LCA/EPD, ESG/CSR reports, CO₂ or energy data.
       - Technical / usage info: best practices, whitepapers.
    
    Verification rules:
    - Prefer official domains: the company’s own site, regulators, standards bodies, recognised industry associations.
    - Ignore blogs, opinions, marketing fluff without factual data.
    
    OUTPUT:
    Return a list of 5–15 verified sources.
    You MUST cite the sources so they appear in the grounding metadata.
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Upgraded to Pro for better reasoning and search capabilities
      contents: mainPrompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const validChunks = chunks.filter((c: any) => c.web?.uri && c.web?.title);
    finalChunks = [...validChunks];

    // Fallback: If results are low (< 2), perform a Targeted Document Search
    // This addresses the "Deloitte" issue by explicitly looking for filetypes and reports if generic browsing fails.
    if (finalChunks.length < 2) {
       console.log("Low grounding results. Attempting targeted document search fallback.");
       
       const fallbackPrompt = `
         PERFORM TARGETED DOCUMENT SEARCH for "${context.name}".
         
         We need specific files and reports. Search specifically for:
         1. "${context.name} annual report 2024 filetype:pdf"
         2. "${context.name} sustainability report filetype:pdf"
         3. "Regulations affecting ${context.name} industry"
         4. "${context.name} technical specifications OR manual"
         
         Find at least 5 documents. Return the list with citations.
       `;
       
       const fallbackRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: fallbackPrompt,
          config: { tools: [{ googleSearch: {} }] }
       });
       
       const fbChunks = fallbackRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
       const validFb = fbChunks.filter((c: any) => c.web?.uri && c.web?.title);
       
       // Deduplicate and add
       const uris = new Set(finalChunks.map(c => c.web.uri));
       for(const c of validFb) {
         if(!uris.has(c.web.uri)) {
           finalChunks.push(c);
           uris.add(c.web.uri);
         }
       }
    }

    // Processing & Cleanup
    const sources: Array<{ title: string; description: string; content: string; uri?: string }> = [];
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();

    for (const chunk of finalChunks) {
      if (!chunk.web?.uri || !chunk.web?.title) continue;
      
      const uri = chunk.web.uri;
      const title = chunk.web.title.trim();

      // Normalize URI for deduplication (strip protocol, www, trailing slash, anchors)
      // This ensures http://site.com/ and https://www.site.com/ are treated as duplicate
      const normalizedUri = uri.toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?/, '')
        .split('#')[0]
        .replace(/\/$/, '');

      // Filter out garbage/login links, but be less aggressive than before
      if (
        uri.includes('facebook.com/login') || 
        uri.includes('instagram.com/accounts') ||
        uri.includes('linkedin.com/login') ||
        uri.includes('twitter.com/login') ||
        seenUrls.has(normalizedUri)
      ) {
        continue;
      }

      // STRICT TITLE DEDUPLICATION
      // If we already have a source with this exact title, skip it to prevent repetitive lists.
      // This forces the UI to show distinct, valuable sources rather than 4 pages titled "Home - Company".
      if (seenTitles.has(title.toLowerCase())) {
        continue;
      }

      seenUrls.add(normalizedUri);
      seenTitles.add(title.toLowerCase());

      let hostname = "";
      try { hostname = new URL(uri).hostname.replace('www.', ''); } catch (e) { hostname = "Web Source"; }

      // Intelligent Categorization
      let category = "Industry Insight";
      const lowerTitle = chunk.web.title.toLowerCase();
      const lowerUri = uri.toLowerCase();
      
      if (lowerTitle.includes('wet') || lowerTitle.includes('law') || lowerTitle.includes('act') || lowerTitle.includes('rule') || lowerTitle.includes('regu') || lowerTitle.includes('iso') || lowerTitle.includes('compliance')) {
        category = "Regulation & Compliance";
      } else if (lowerTitle.includes('report') || lowerTitle.includes('annual') || lowerTitle.includes('esg') || lowerTitle.includes('sustain') || lowerUri.endsWith('.pdf')) {
        category = "Official Documentation/Report";
      } else if (lowerTitle.includes('trend') || lowerTitle.includes('forecast') || lowerTitle.includes('market') || lowerTitle.includes('growth')) {
        category = "Market Intelligence";
      } else if (lowerTitle.includes('review') || lowerTitle.includes('rating')) {
         category = "Public Sentiment";
      }

      sources.push({
        title: chunk.web.title,
        description: `${category} • ${hostname}`,
        content: `Verified source via Google Search.`,
        uri: uri
      });
    }

    return sources.slice(0, 15);

  } catch (e) {
    console.error("Deep Search failed:", e);
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