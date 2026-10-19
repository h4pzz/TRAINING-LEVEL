/**
 * execution/scan_ocr_parser.js
 * 
 * Deterministic AI OCR Engine & Intelligent Crew Matching for Scanned Training Flight Logs
 * Integrates Google Gemini Vision API (2.5-flash / 1.5-flash) with structured schema extraction,
 * bidirectional Cyrillic-Latin transliteration fuzzy matching, and rate-limited batch processing.
 */

// ================= UKRAINIAN <-> LATIN TRANSLITERATION TABLE =================
const UKR_TO_LATIN_MAP = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
  'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
  'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya'
};

/**
 * Transliterates a Ukrainian string to simplified lowercase Latin without special characters
 */
export function transliterateUaToEn(str) {
  if (!str) return '';
  return str.toLowerCase().split('').map(char => UKR_TO_LATIN_MAP[char] !== undefined ? UKR_TO_LATIN_MAP[char] : char).join('');
}

/**
 * Normalizes phonetic/transliteration variations (g<->h, yy/iy/oy/y, etc.)
 */
export function phoneticNormalize(str) {
  if (!str) return '';
  let s = transliterateUaToEn(str).toLowerCase().trim();
  // Standardize g -> h
  s = s.replace(/g/g, 'h');
  // Standardize kh -> h
  s = s.replace(/kh/g, 'h');
  // Standardize end of names: -yy, -iy, -oy, -ii, -y -> -y
  s = s.replace(/(yy|iy|oy|ii|yi)$/, 'y');
  // Standardize doubled letters
  s = s.replace(/([a-z])\1+/g, '$1');
  return s;
}

/**
 * Extracts possible (surname, initial) pairs from a name string
 */
export function extractNameVariations(nameStr) {
  if (!nameStr || typeof nameStr !== 'string') return [];
  
  // Clean punctuation except spaces
  let clean = nameStr.replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ').filter(p => p.length > 0);
  
  if (parts.length === 0) return [];
  
  const variations = [];
  
  if (parts.length === 1) {
    variations.push({
      surname: phoneticNormalize(parts[0]),
      initial: '',
      rawSurname: parts[0]
    });
    return variations;
  }
  
  // Pattern 1: Initial first, Surname last (e.g. "S. Berehovyy" or "S Berehovyy")
  if (parts[0].length <= 2) {
    variations.push({
      surname: phoneticNormalize(parts.slice(1).join(' ')),
      initial: phoneticNormalize(parts[0][0]),
      rawSurname: parts.slice(1).join(' ')
    });
  }
  
  // Pattern 2: Surname first, Initial last (e.g. "Berehovyy S." or "Береговий С.")
  if (parts[parts.length - 1].length <= 2) {
    variations.push({
      surname: phoneticNormalize(parts.slice(0, parts.length - 1).join(' ')),
      initial: phoneticNormalize(parts[parts.length - 1][0]),
      rawSurname: parts.slice(0, parts.length - 1).join(' ')
    });
  }
  
  // Pattern 3: Full names with 2+ words (e.g. "BEREHOVYY STANISLAV" or "STANISLAV BEREHOVYY")
  // First word as surname, second as first name
  variations.push({
    surname: phoneticNormalize(parts[0]),
    initial: phoneticNormalize(parts[1][0]),
    rawSurname: parts[0]
  });
  // Last word as surname, first as first name
  variations.push({
    surname: phoneticNormalize(parts[parts.length - 1]),
    initial: phoneticNormalize(parts[0][0]),
    rawSurname: parts[parts.length - 1]
  });
  
  return variations;
}

/**
 * Standard Levenshtein distance between two strings
 */
export function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const matrix = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) matrix[i][0] = i;
  for (let j = 0; j <= n; j++) matrix[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[m][n];
}

/**
 * Matches a scanned crew name against the combined pool of flight and cabin crew.
 * Returns { matchedMember, confidence: 'exact'|'fuzzy'|'none', candidates }
 * 
 * @param {string} scannedName - e.g. "S. Berehovyy", "O. Sokurenko", "D. Kotsar"
 * @param {Array} flightCrew - List of flight crew objects
 * @param {Array} cabinCrew - List of cabin crew objects
 */
export function matchCrewMember(scannedName, flightCrew = [], cabinCrew = []) {
  if (!scannedName || typeof scannedName !== 'string') {
    return { matchedMember: null, confidence: 'none', candidates: [] };
  }

  const scannedVariations = extractNameVariations(scannedName);
  if (scannedVariations.length === 0) {
    return { matchedMember: null, confidence: 'none', candidates: [] };
  }

  const allCrew = [
    ...flightCrew.map(m => ({ ...m, crewType: 'Flight' })),
    ...cabinCrew.map(m => ({ ...m, crewType: 'Cabin' }))
  ];

  const scoredCandidates = [];

  for (const member of allCrew) {
    // Generate all variations for the member's names (EN, UA, Short)
    const memberVariations = [
      ...extractNameVariations(member.Full_Name_EN),
      ...extractNameVariations(member.Full_Name_UA),
      ...extractNameVariations(member.Name_Shrt_UA),
      ...extractNameVariations(member.Name_Shrt_EN)
    ];

    let bestScoreForMember = -1;
    let minSurnameDist = 99;

    for (const scanVar of scannedVariations) {
      if (!scanVar.surname) continue;

      for (const memVar of memberVariations) {
        if (!memVar.surname) continue;

        const dist = levenshteinDistance(scanVar.surname, memVar.surname);
        if (dist < minSurnameDist) minSurnameDist = dist;

        const initialMatches = scanVar.initial && memVar.initial && scanVar.initial === memVar.initial;

        if (dist === 0) {
          if (initialMatches || !scanVar.initial || !memVar.initial) {
            bestScoreForMember = Math.max(bestScoreForMember, 100);
          } else {
            // Same surname, mismatched initial
            bestScoreForMember = Math.max(bestScoreForMember, 70);
          }
        } else if (dist <= 2) {
          // Typo or transliteration difference (e.g. 1-2 char diff)
          let s = 80 - (dist * 15);
          if (initialMatches) s += 15;
          bestScoreForMember = Math.max(bestScoreForMember, s);
        }
      }
    }

    if (bestScoreForMember >= 50) {
      scoredCandidates.push({ member, score: bestScoreForMember, dist: minSurnameDist });
    }
  }

  // Sort candidates by highest score
  scoredCandidates.sort((a, b) => b.score - a.score);

  if (scoredCandidates.length === 0) {
    return { matchedMember: null, confidence: 'none', candidates: [] };
  }

  const top = scoredCandidates[0];
  if (top.score >= 85) {
    return {
      matchedMember: top.member,
      confidence: 'exact',
      candidates: scoredCandidates.slice(0, 5).map(c => c.member)
    };
  } else if (top.score >= 50) {
    return {
      matchedMember: top.member,
      confidence: 'fuzzy',
      candidates: scoredCandidates.slice(0, 5).map(c => c.member)
    };
  }

  return {
    matchedMember: null,
    confidence: 'none',
    candidates: scoredCandidates.slice(0, 5).map(c => c.member)
  };
}

// ================= GEMINI PROMPT & SCHEMA =================
const SYSTEM_INSTRUCTION = `
You are an expert aviation document OCR reader for "Ukrainian Helicopters".
Your task is to extract all data from the scanned training flight log sheet titled:
"Log sheet of duty time and flight time during training flights" (or similar training log sheet).

EXTRACT INTO THIS STRICT JSON STRUCTURE:
{
  "date": "YYYY-MM-DD",
  "helicopterReg": "UR-...",
  "mainFlightTask": "...",
  "fuelStart": "...",
  "fuelEnd": "...",
  "refuel": "...",
  "preBgn": "HH:MM",
  "preEnd": "HH:MM",
  "preTtl": "HH:MM",
  "postBgn": "HH:MM",
  "postEnd": "HH:MM",
  "postTtl": "HH:MM",
  "dutyTime": "HH:MM",
  "totalFlightTime": "HH:MM",
  "totalBlockTime": "HH:MM",
  "crew": [
    {
      "pstn": "PIC" | "PI" | "FE instr" | "AR FA instr" | "FE" | "FA",
      "name": "Full name or initial + surname (e.g. S. Berehovyy, O. Sokurenko)",
      "flightDay": "HH:MM",
      "flightNght": "HH:MM",
      "flightNvg": "HH:MM",
      "blockDay": "HH:MM",
      "blockNght": "HH:MM",
      "instDay": "HH:MM",
      "instNght": "HH:MM",
      "flightTask": "e.g. SPO 356/26/1",
      "trainingTypes": ["TRI", "NVG", "LPC", "OPC", "GI_275_PRCT", "HESLO_PRCT", "HHO_PRCT", "MSB", "PALL", "Before Rotation", "Type Rating"],
      "isInstructor": true/false
    }
  ]
}

CRITICAL OCR RULES:
1. Ignore empty rows or crew rows that are crossed out with a diagonal Z-strike or horizontal strike.
2. Ditto marks: If Flight Task or Time fields have repetition marks like -"-, //, do, ditto, copy the exact value from the row directly above it!
3. Format all times strictly as 2-digit HH:MM (e.g. "02:30", "00:00"). If a field is empty, use "00:00" for times.
4. Detect training checkboxes: Look at the headers or handwritten notes for TRI (Type Rating Instructor), NVG (Night Vision Goggles), LPC, OPC, GI 275, HESLO, HHO, MSB, Before Rotation, Type Rating. Include all detected training types in the trainingTypes array for each crew member.
5. If the document has a header date like "16.10.2026", convert it to ISO format "2026-10-16".
6. If the helicopter registration says "UR-UHB" or similar, extract the full registration "UR-UHB".
7. Block Time vs Flight Time rules:
   - Extract "totalBlockTime" (Час блоку / Total Block Time).
   - In Ukrainian Helicopters training flight sheets, Block Time is always greater than or equal to Flight Time.
   - For each crew member, extract blockDay and blockNght if written in the columns.
   - If blockDay and blockNght are not separated in the row:
     * If flightNght is "00:00" and flightDay > "00:00", set blockDay to totalBlockTime (or >= flightDay) and blockNght to "00:00".
     * If flightDay is "00:00" and flightNght > "00:00", set blockNght to totalBlockTime (or >= flightNght) and blockDay to "00:00".
     * If both flightDay > 0 and flightNght > 0, distribute block time proportionally so blockDay >= flightDay and blockNght >= flightNght.
     * Block Day must NEVER be less than Flight Day, and Block Night must NEVER be less than Flight Night. If block time is missing, default blockDay = flightDay and blockNght = flightNght.
8. Return ONLY valid JSON, with NO preamble or extra markdown outside the JSON.
`;

/**
 * Pings Google Gemini API to test if the provided API key is valid.
 * @param {string} apiKey 
 * @returns {Promise<{success: boolean, error?: string, model?: string}>}
 */
// Cache the resolved working model to avoid querying ListModels on every file
let cachedWorkingModel = null;

/**
 * Discovers available models for the given API key via ModelService.ListModels
 * and selects the best model supporting generateContent and multimodal vision.
 * @param {string} apiKey 
 * @returns {Promise<{apiVersion: string, modelName: string, allAvailable: string[]}>}
 */
export async function getBestAvailableGeminiModel(apiKey) {
  if (cachedWorkingModel && cachedWorkingModel.apiKey === apiKey.trim()) {
    return cachedWorkingModel;
  }

  const cleanKey = apiKey.trim();
  const apiVersions = ['v1beta', 'v1'];
  let candidateNames = [];

  for (const ver of apiVersions) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${cleanKey}`);
      if (response.ok) {
        const data = await response.json();
        const models = (data.models || []).filter(m => 
          Array.isArray(m.supportedGenerationMethods) && 
          m.supportedGenerationMethods.includes('generateContent')
        );

        if (models.length > 0) {
          candidateNames = models.map(m => m.name.replace(/^models\//, ''));

          // Preferred models in priority order for OCR Vision tasks (Flash models first for 1500 RPD)
          const preferredPatterns = [
            /^gemini-3\.\d+-flash/i,
            /^gemini-3-flash/i,
            /^gemini-2\.5-flash/i,
            /^gemini-2\.0-flash/i,
            /flash/i,
            /^gemini-3\.1-pro-preview/i,
            /^gemini-3\.\d+-pro/i,
            /pro/i,
            /gemini/i
          ];

          for (const pat of preferredPatterns) {
            const found = candidateNames.find(n => pat.test(n));
            if (found) {
              cachedWorkingModel = { apiVersion: ver, modelName: found, apiKey: cleanKey, allAvailable: candidateNames };
              return cachedWorkingModel;
            }
          }

          cachedWorkingModel = { apiVersion: ver, modelName: candidateNames[0], apiKey: cleanKey, allAvailable: candidateNames };
          return cachedWorkingModel;
        }
      }
    } catch (e) {
      console.warn(`[Gemini ListModels] Failed for ${ver}:`, e);
    }
  }

  // Static fallback list with high-quota Gemini 3.x Flash models
  return { 
    apiVersion: 'v1beta', 
    modelName: 'gemini-3.8-flash', 
    apiKey: cleanKey, 
    allAvailable: [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3-flash-preview',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-3.1-pro-preview'
    ] 
  };
}

/**
 * Pings Google Gemini API to test if the provided API key is valid.
 * @param {string} apiKey 
 * @returns {Promise<{success: boolean, error?: string, model?: string}>}
 */
export async function testGeminiApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return { success: false, error: 'API ключ не вказано' };
  }

  const cleanKey = apiKey.trim();

  try {
    const modelInfo = await getBestAvailableGeminiModel(cleanKey);
    const modelsToTry = [
      modelInfo.modelName,
      ...(modelInfo.allAvailable || []).filter(m => m !== modelInfo.modelName),
      'gemini-3.1-pro-preview',
      'gemini-3.8-flash',
      'gemini-3.5-flash'
    ];
    const uniqueModels = [...new Set(modelsToTry)];

    for (const model of uniqueModels) {
      for (const ver of ['v1beta', 'v1']) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${cleanKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'Respond with "OK"' }]
              }]
            })
          });

          if (response.ok) {
            cachedWorkingModel = { apiVersion: ver, modelName: model, apiKey: cleanKey };
            return { success: true, model: `${model} (${ver})` };
          }

          const errData = await response.json().catch(() => ({}));
          if (response.status === 400 || response.status === 403) {
            return { 
              success: false, 
              error: errData.error?.message || `Помилка авторизації (HTTP ${response.status}). Перевірте правильність ключа.` 
            };
          }
        } catch (netErr) {
          // Continue to next model/version
        }
      }
    }

    return { 
      success: false, 
      error: 'Жодна з доступних моделей Gemini не відповіла на тестовий запит. Перевірте квоти та налаштування ключа в Google AI Studio.' 
    };
  } catch (err) {
    return { success: false, error: err.message || 'Мережева помилка під час перевірки ключа Gemini' };
  }
}

/**
 * Converts a browser File/Blob to a Base64 string (without the data URL prefix)
 * @param {File|Blob} file 
 * @returns {Promise<string>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Calls Gemini Vision API with a base64 encoded PDF or image.
 * Implements dynamic model fallback and retry with exponential backoff on HTTP 429 rate limit errors.
 * 
 * @param {string} base64Data 
 * @param {string} mimeType 
 * @param {string} apiKey 
 * @param {number} retryCount 
 * @param {Function} onStatusUpdate
 * @returns {Promise<object>}
 */
export async function callGeminiVisionAPI(base64Data, mimeType, apiKey, retryCount = 0, onStatusUpdate = null) {
  if (!apiKey) throw new Error('Gemini API ключ не налаштовано в системі');

  const cleanKey = apiKey.trim();
  const modelInfo = await getBestAvailableGeminiModel(cleanKey);
  
  const isVisionCapable = (name) => name.toLowerCase().includes('gemini') || name.toLowerCase().includes('paligemma');
  const candidateList = [];

  // Prioritize high-quota Flash models (1,500 RPD) over Pro models (50 RPD)
  const flashPriorityModels = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
  ];

  for (const name of flashPriorityModels) {
    candidateList.push({ ver: 'v1beta', name });
  }

  // Next: model from ListModels if vision capable
  if (isVisionCapable(modelInfo.modelName) && !candidateList.some(c => c.name === modelInfo.modelName)) {
    candidateList.push({ ver: modelInfo.apiVersion, name: modelInfo.modelName });
  }

  // Next: other vision models from user's account
  if (Array.isArray(modelInfo.allAvailable)) {
    for (const name of modelInfo.allAvailable) {
      if (isVisionCapable(name) && !candidateList.some(c => c.name === name)) {
        candidateList.push({ ver: modelInfo.apiVersion, name });
      }
    }
  }

  // Pro model as last resort due to strict 50 RPD daily quota
  if (!candidateList.some(c => c.name === 'gemini-3.1-pro-preview')) {
    candidateList.push({ ver: 'v1beta', name: 'gemini-3.1-pro-preview' });
  }

  let rateLimitError = null;
  let lastError = null;

  for (const { ver, name: model } of candidateList) {
    const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${cleanKey}`;
    
    const payload = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType || 'application/pdf',
              data: base64Data
            }
          },
          {
            text: 'Extract all flight data, duty time, block time, briefing times, and crew member table from this training flight log sheet according to your system instruction.'
          }
        ]
      }],
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        const errJson = await response.json().catch(() => ({}));
        const googleMsg = errJson.error?.message || 'Resource Exhausted';

        let waitMs = 15000;
        const retryInfo = errJson.error?.details?.find(d => d.retryDelay);
        if (retryInfo && retryInfo.retryDelay) {
          const parsedSec = parseFloat(retryInfo.retryDelay);
          if (!isNaN(parsedSec)) {
            waitMs = Math.ceil(parsedSec * 1000) + 1000;
          }
        } else {
          const retryHeader = response.headers?.get ? response.headers.get('retry-after') : null;
          if (retryHeader) {
            const sec = parseFloat(retryHeader);
            if (!isNaN(sec)) waitMs = Math.ceil(sec * 1000) + 1000;
          } else {
            waitMs = [12000, 20000, 30000][retryCount] || 30000;
          }
        }

        // If wait time is > 35 seconds, this is a DAILY quota exhaustion (RPD), NOT a per-minute limit.
        // DO NOT block the user for hours! Skip to the next candidate model immediately!
        if (waitMs > 35000) {
          console.warn(`[Gemini OCR] Model ${model} daily quota exhausted (retryDelay: ${Math.round(waitMs / 1000)}s). Skipping immediately to next model...`);
          rateLimitError = new Error(`Вичерпано добову квоту безкоштовного тарифу для ${model} (добовий ліміт RPD). Спробуйте інший API ключ або зачекайте оновлення добової квоти.`);
          continue;
        }

        // Normal per-minute burst limit (<= 35 seconds): wait and retry
        if (retryCount < 3) {
          const secText = Math.round(waitMs / 1000);
          console.warn(`[Gemini OCR] 429 Minute rate limit hit on ${model}. Waiting ${secText}s... (Attempt ${retryCount + 1}/3)`);
          
          if (onStatusUpdate) {
            for (let s = secText; s > 0; s--) {
              onStatusUpdate(`Очікування квоти Gemini ШІ (${s} сек)...`);
              await new Promise(r => setTimeout(r, 1000));
            }
          } else {
            await new Promise(r => setTimeout(r, waitMs));
          }

          return callGeminiVisionAPI(base64Data, mimeType, apiKey, retryCount + 1, onStatusUpdate);
        }

        console.warn(`Model ${ver}/${model} rate limited after retries. Trying next candidate model...`);
        rateLimitError = new Error(`Перевищено ліміт запитів Gemini (Rate Limit 429): ${googleMsg}.`);
        continue;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${response.status}`;
        
        // If 404 on model, continue to try fallback model
        if (response.status === 404) {
          console.warn(`Model ${ver}/${model} returned 404: ${errMsg}. Trying fallback model...`);
          lastError = new Error(`Gemini API Error: ${errMsg}`);
          continue;
        }
        throw new Error(`Gemini API Error: ${errMsg}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('ШІ не зміг прочитати або повернути дані з цього документа');
      }

      // Successful call: update cache to this model for subsequent files in batch
      cachedWorkingModel = { apiVersion: ver, modelName: model, apiKey: cleanKey };

      // Parse JSON from text
      let cleanedText = rawText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      const parsed = JSON.parse(cleanedText);
      return parsed;

    } catch (err) {
      if (err.message.includes('Rate Limit') || err.message.includes('429')) {
        rateLimitError = err;
        continue;
      }
      lastError = err;
    }
  }

  // Prioritize rate limit error over 404 errors from missing fallbacks
  if (rateLimitError) {
    throw rateLimitError;
  }

  throw lastError || new Error('Не вдалося отримати відповідь від моделей Gemini');
}

/**
 * Normalizes and derives crew blockDay and blockNght values.
 * Ensures Block Time >= Flight Time and auto-derives block times if missing or "00:00".
 */
export function normalizeParsedFlightBlockTimes(parsedData) {
  if (!parsedData) return parsedData;

  const toMins = (t) => {
    if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
    const parts = t.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };
  const toDuration = (m) => {
    const safe = Math.max(0, Math.round(m || 0));
    const h = Math.floor(safe / 60);
    const min = safe % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const totalFltMins = toMins(parsedData.totalFlightTime || '00:00');
  let totalBlkMins = toMins(parsedData.totalBlockTime || '00:00');

  // If totalBlockTime is missing or "00:00", fallback to totalFlightTime
  if (totalBlkMins === 0 && totalFltMins > 0) {
    totalBlkMins = totalFltMins;
    parsedData.totalBlockTime = parsedData.totalFlightTime;
  }

  if (Array.isArray(parsedData.crew)) {
    parsedData.crew.forEach(c => {
      const fltDayMins = toMins(c.flightDay || '00:00');
      const fltNghtMins = toMins(c.flightNght || '00:00');
      let blkDayMins = toMins(c.blockDay || '00:00');
      let blkNghtMins = toMins(c.blockNght || '00:00');

      // If both blockDay and blockNght are 0, derive from flight times & total block time
      if (blkDayMins === 0 && blkNghtMins === 0) {
        if (fltNghtMins === 0 && fltDayMins > 0) {
          blkDayMins = totalBlkMins > 0 ? totalBlkMins : fltDayMins;
          blkNghtMins = 0;
        } else if (fltDayMins === 0 && fltNghtMins > 0) {
          blkNghtMins = totalBlkMins > 0 ? totalBlkMins : fltNghtMins;
          blkDayMins = 0;
        } else if (fltDayMins > 0 && fltNghtMins > 0) {
          const sumFlt = fltDayMins + fltNghtMins;
          if (totalBlkMins >= sumFlt && sumFlt > 0) {
            blkDayMins = Math.round(fltDayMins + (totalBlkMins - sumFlt) * (fltDayMins / sumFlt));
            blkNghtMins = totalBlkMins - blkDayMins;
          } else {
            blkDayMins = fltDayMins;
            blkNghtMins = fltNghtMins;
          }
        }
      }

      // Enforce Block Time >= Flight Time constraint
      if (blkDayMins < fltDayMins) {
        blkDayMins = fltDayMins;
      }
      if (blkNghtMins < fltNghtMins) {
        blkNghtMins = fltNghtMins;
      }

      c.blockDay = toDuration(blkDayMins);
      c.blockNght = toDuration(blkNghtMins);
      c.flightDay = toDuration(fltDayMins);
      c.flightNght = toDuration(fltNghtMins);
    });
  }

  return parsedData;
}

/**
 * Checks if a parsed flight record already exists in the local database.
 * @param {object} parsedFlight 
 * @param {Array} existingFlights 
 * @returns {{isDuplicate: boolean, duplicateId?: string}}
 */
export function checkFlightDuplicate(parsedFlight, existingFlights = []) {
  if (!parsedFlight || !parsedFlight.date || !parsedFlight.helicopterReg) {
    return { isDuplicate: false };
  }

  const existing = existingFlights.find(f => {
    return f.date === parsedFlight.date &&
           (f.helicopterReg || '').toUpperCase() === (parsedFlight.helicopterReg || '').toUpperCase() &&
           (f.dutyTime === parsedFlight.dutyTime || f.totalFlightTime === parsedFlight.totalFlightTime);
  });

  if (existing) {
    return { isDuplicate: true, duplicateId: existing.id };
  }
  return { isDuplicate: false };
}

/**
 * Processes a batch of scan files with rate limiting (4s pause between files for 15 RPM Free tier)
 * 
 * @param {Array<File>} files 
 * @param {string} apiKey 
 * @param {Array} flightCrew 
 * @param {Array} cabinCrew 
 * @param {Array} existingFlights 
 * @param {Function} onProgress - Callback (itemResult, index, total)
 * @returns {Promise<Array>}
 */
export async function processScanBatch(files, apiKey, flightCrew, cabinCrew, existingFlights, onProgress) {
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const itemResult = {
      id: `scan_${Date.now()}_${i}`,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      fileBlob: file,
      status: 'processing', // 'ready' | 'needs_review' | 'duplicate' | 'error'
      error: null,
      parsedData: null,
      duplicateInfo: null
    };

    if (onProgress) onProgress(itemResult, i, total);

    try {
      const base64Data = await fileToBase64(file);
      const parsedData = await callGeminiVisionAPI(
        base64Data, 
        itemResult.mimeType, 
        apiKey, 
        0, 
        (statusMsg) => {
          if (onProgress) onProgress(itemResult, i, total, statusMsg);
        }
      );
      
      // Auto-normalize & derive crew block times if missing or zero
      normalizeParsedFlightBlockTimes(parsedData);
      
      // Perform crew fuzzy matching
      if (Array.isArray(parsedData.crew)) {
        parsedData.crew = parsedData.crew.map(c => {
          const match = matchCrewMember(c.name, flightCrew, cabinCrew);
          return {
            ...c,
            matchedCrewId: match.matchedMember ? match.matchedMember.id : null,
            matchedCrewType: match.matchedMember ? match.matchedMember.crewType : 'Flight',
            matchedCrewName: match.matchedMember ? (match.matchedMember.Full_Name_EN || match.matchedMember.Full_Name_UA) : null,
            matchConfidence: match.confidence,
            candidates: match.candidates || []
          };
        });
      }

      // Check duplicates
      const dup = checkFlightDuplicate(parsedData, existingFlights);
      itemResult.duplicateInfo = dup;
      itemResult.parsedData = parsedData;

      if (dup.isDuplicate) {
        itemResult.status = 'duplicate';
      } else {
        // If any crew member has no match or fuzzy match, flag as needs_review
        const hasUncertainCrew = parsedData.crew?.some(c => c.matchConfidence !== 'exact');
        itemResult.status = hasUncertainCrew ? 'needs_review' : 'ready';
      }

    } catch (err) {
      console.error(`Error processing file ${file.name}:`, err);
      itemResult.status = 'error';
      itemResult.error = err.message || 'Помилка розпізнавання файлу';
    }

    results.push(itemResult);
    if (onProgress) onProgress(itemResult, i, total);

    // Free tier safe pacing: 6000ms delay before processing next file to respect 15 RPM
    if (i < total - 1) {
      if (onProgress) onProgress(itemResult, i, total, 'Пауза між файлами для дотримання квоти Google API (6 сек)...');
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  return results;
}
