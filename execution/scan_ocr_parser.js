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
    if (parts[0].length >= 3) {
      variations.push({
        surname: phoneticNormalize(parts[0]),
        initial: '',
        firstName: '',
        rawSurname: parts[0]
      });
    }
    return variations;
  }
  
  // Pattern 1: Initial(s) first, Surname last (e.g. "S. Berehovyy" or "O. O. Sokurenko")
  // Short initial (<= 2 chars) followed by full surname (>= 3 chars)
  if (parts[0].length <= 2 && parts[parts.length - 1].length >= 3) {
    const surnameWord = parts[parts.length - 1];
    variations.push({
      surname: phoneticNormalize(surnameWord),
      initial: phoneticNormalize(parts[0][0]),
      firstName: '',
      rawSurname: surnameWord
    });
  }
  
  // Pattern 2: Surname first, Initial(s) last (e.g. "Berehovyy S." or "Сокуренко О. О.")
  // Full surname (>= 3 chars) followed by short initial(s) (<= 2 chars)
  if (parts[0].length >= 3 && parts[parts.length - 1].length <= 2) {
    const surnameWord = parts[0];
    const initialWord = parts[1] || parts[parts.length - 1];
    variations.push({
      surname: phoneticNormalize(surnameWord),
      initial: phoneticNormalize(initialWord[0]),
      firstName: '',
      rawSurname: surnameWord
    });
  }
  
  // Pattern 3: Full names with 2+ full words (e.g. "BEREHOVYY STANISLAV" or "STANISLAV BEREHOVYY")
  if (parts[0].length >= 3) {
    // Dominant: First word as surname, second as first name
    variations.push({
      surname: phoneticNormalize(parts[0]),
      initial: parts[1] ? phoneticNormalize(parts[1][0]) : '',
      firstName: (parts[1] && parts[1].length >= 3) ? phoneticNormalize(parts[1]) : '',
      rawSurname: parts[0]
    });
  }
  const lastWord = parts[parts.length - 1];
  if (parts.length >= 2 && lastWord.length >= 3) {
    // Reverse: Last word as surname, first as first name
    variations.push({
      surname: phoneticNormalize(lastWord),
      initial: phoneticNormalize(parts[0][0]),
      firstName: parts[0].length >= 3 ? phoneticNormalize(parts[0]) : '',
      rawSurname: lastWord
    });
  }
  
  return variations;
}

/**
 * Extracts normalized name variations from a database crew member.
 * In the airline database, the first word of Full_Name_EN, Full_Name_UA, Name_Shrt_UA
 * is ALWAYS strictly the surname. First names must never be extracted as surnames.
 */
export function extractMemberVariations(member) {
  const variations = [];
  const fields = [member.Full_Name_EN, member.Full_Name_UA, member.Name_Shrt_UA, member.Name_Shrt_EN];
  for (const f of fields) {
    if (!f || typeof f !== 'string') continue;
    const clean = f.replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
    const parts = clean.split(' ').filter(p => p.length > 0);
    if (parts.length === 0) continue;
    
    // First word is ALWAYS the surname in database
    if (parts[0].length >= 3) {
      const surname = phoneticNormalize(parts[0]);
      const initial = parts.length > 1 ? phoneticNormalize(parts[1][0]) : '';
      const firstName = (parts.length > 1 && parts[1].length >= 3) ? phoneticNormalize(parts[1]) : '';
      variations.push({ surname, initial, firstName, rawSurname: parts[0] });
    }
  }
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
    // Generate all variations strictly treating first word as surname for database records
    const memberVariations = extractMemberVariations(member);

    let bestScoreForMember = -1;
    let minSurnameDist = 99;

    for (const scanVar of scannedVariations) {
      if (!scanVar.surname || scanVar.surname.length < 3) continue;

      for (const memVar of memberVariations) {
        if (!memVar.surname || memVar.surname.length < 3) continue;

        const dist = levenshteinDistance(scanVar.surname, memVar.surname);
        if (dist < minSurnameDist) minSurnameDist = dist;

        const initialMatches = scanVar.initial && memVar.initial && scanVar.initial === memVar.initial;
        const firstNameMatches = scanVar.firstName && memVar.firstName && (scanVar.firstName === memVar.firstName || levenshteinDistance(scanVar.firstName, memVar.firstName) <= 1);

        if (dist === 0) {
          if (firstNameMatches) {
            // Full first name match (e.g. "Kushch Oleksiy" vs "Kushch Oleksiy")
            bestScoreForMember = Math.max(bestScoreForMember, 110);
          } else if (initialMatches || !scanVar.initial || !memVar.initial) {
            bestScoreForMember = Math.max(bestScoreForMember, 100);
          } else {
            // Same surname, mismatched initial
            bestScoreForMember = Math.max(bestScoreForMember, 70);
          }
        } else if (dist <= 2) {
          // Typo or transliteration difference (e.g. 1-2 char diff)
          let s = 80 - (dist * 15);
          if (initialMatches) s += 15;
          if (firstNameMatches) s += 20;
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
  const isTie = scoredCandidates.length > 1 && scoredCandidates[1].score === top.score;

  if (top.score >= 85 && !isTie) {
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

/**
 * Special permanent VIP instructor definitions:
 * - Berehovyy Serhiy, Turchyn Oleksandr, Kutko Yuriy -> ALWAYS PI
 * - Formaniuk Iurii, Chernysh Oleksii -> ALWAYS FE inst
 * - Aleksa Sergii, Dubinin Andrii -> ALWAYS FA-AR inst
 */
export const PERMANENT_INSTRUCTORS = [
  { match: ['berehovyy', 'beregovoy', 'береговий', 'береговой'], name: 'Berehovyy Serhiy', pstn: 'PI', isInstructor: true },
  { match: ['turchyn', 'турчин'], name: 'Turchyn Oleksandr', pstn: 'PI', isInstructor: true },
  { match: ['kutko', 'кутько'], name: 'Kutko Yuriy', pstn: 'PI', isInstructor: true },
  { match: ['formaniuk', 'форманюк'], name: 'Formaniuk Iurii', pstn: 'FE inst', isInstructor: true },
  { match: ['chernysh', 'черниш'], name: 'Chernysh Oleksii', pstn: 'FE inst', isInstructor: true },
  { match: ['aleksa', 'алекса'], name: 'Aleksa Sergii', pstn: 'FA-AR inst', isInstructor: true },
  { match: ['dubinin', 'дубінін', 'дубинин'], name: 'Dubinin Andrii', pstn: 'FA-AR inst', isInstructor: true },
];

/**
 * Normalizes crew member's name and position according to company standards:
 * - Names and positions are stored strictly in English
 * - КПС=PIC, 2П=SIC, ІБ=FE, БП=FA, БПАР/БП-АР=FA-AR
 * - If instructor is checked: append " inst" (e.g. PIC inst, SIC inst, FE inst, FA inst, FA-AR inst)
 * - Berehovyy Serhiy, Turchyn Oleksandr, Kutko Yuriy -> ALWAYS PI
 * - Formaniuk Iurii, Chernysh Oleksii -> ALWAYS FE inst
 * - Aleksa Sergii, Dubinin Andrii -> ALWAYS FA-AR inst
 * 
 * @param {string} rawName 
 * @param {string} rawRankOrPstn 
 * @param {boolean} isInstructor 
 * @param {object} matchedMember (optional database member record)
 * @returns {{ name: string, pstn: string, isInstructor: boolean }}
 */
export function normalizeFlightCrewRole(rawName, rawRankOrPstn = '', isInstructor = false, matchedMember = null) {
  const nameStr = String(rawName || (matchedMember ? (matchedMember.Full_Name_EN || matchedMember.Full_Name_UA) : '')).trim();
  const lowerName = nameStr.toLowerCase();

  // 1. Check permanent instructors
  for (const pi of PERMANENT_INSTRUCTORS) {
    if (pi.match.some(m => lowerName.includes(m))) {
      return {
        name: pi.name,
        pstn: pi.pstn,
        isInstructor: true
      };
    }
  }

  // 2. Resolve English Name
  let enName = nameStr;
  if (matchedMember && matchedMember.Full_Name_EN) {
    enName = matchedMember.Full_Name_EN.trim();
  }

  // 3. Determine if instructor flag is active
  const pNorm = String(rawRankOrPstn || '').trim().toUpperCase();
  const isInst = !!isInstructor || pNorm.includes('INST') || pNorm.includes('ІНСТ') || pNorm === 'PI';

  // 4. Determine base position
  let basePstn = '';
  const memberRank = matchedMember && matchedMember.Rank ? matchedMember.Rank.trim().toUpperCase() : '';

  // Clean candidate token
  const candidate = pNorm.replace(/\s*(INST\w*|ІНСТР\w*)/gi, '').trim() || memberRank;
  if (candidate === 'КПС' || candidate === 'PIC') {
    basePstn = 'PIC';
  } else if (candidate === '2П' || candidate === '2P' || candidate === 'SIC' || candidate === 'PI') {
    basePstn = 'SIC';
  } else if (candidate === 'ІБ' || candidate === 'FE') {
    basePstn = 'FE';
  } else if (candidate === 'БП-АР' || candidate === 'БП-РА' || candidate === 'БПАР' || candidate === 'FA-AR' || candidate === 'FA-RA' || candidate === 'AR') {
    basePstn = 'FA-AR';
  } else if (candidate === 'БП' || candidate === 'FA') {
    basePstn = 'FA';
  } else if (memberRank) {
    if (memberRank === 'КПС' || memberRank === 'PIC') basePstn = 'PIC';
    else if (memberRank === '2П' || memberRank === 'SIC') basePstn = 'SIC';
    else if (memberRank === 'ІБ' || memberRank === 'FE') basePstn = 'FE';
    else if (memberRank.includes('АР') || memberRank.includes('РА') || memberRank.includes('AR')) basePstn = 'FA-AR';
    else if (memberRank.includes('БП') || memberRank.includes('FA')) basePstn = 'FA';
    else basePstn = 'PIC';
  } else {
    basePstn = 'PIC';
  }

  const finalPstn = isInst ? `${basePstn} inst` : basePstn;

  return {
    name: enName,
    pstn: finalPstn,
    isInstructor: isInst
  };
}

/**
 * Maps Ukrainian company rank or abbreviations to standard aviation English positions:
 * КПС -> PIC, 2П -> SIC, ІБ -> FE, БП -> FA, БП-АР / БП-РА / БПАР -> FA-AR.
 * If instructor is true: appends " inst" (e.g. PIC inst).
 * @param {string} rank 
 * @param {boolean} isInstructor 
 * @returns {string}
 */
export function mapRankToPstn(rank, isInstructor = false) {
  if (!rank || typeof rank !== 'string') return isInstructor ? 'PIC inst' : 'PIC';
  const r = rank.trim().toUpperCase();
  if (r === 'PI') return 'PI';

  const hasInst = isInstructor || r.includes('INST') || r.includes('ІНСТР') || r.includes('ІНС');

  let base = '';
  if (r.includes('КПС') || r.includes('PIC')) {
    base = 'PIC';
  } else if (r.includes('2П') || r.includes('2P') || r.includes('SIC') || r.includes('PI')) {
    base = 'SIC';
  } else if (r.includes('ІБ') || r.includes('FE')) {
    base = 'FE';
  } else if (r.includes('БП-АР') || r.includes('БП-РА') || r.includes('БПАР') || r.includes('FA-AR') || r.includes('FA-RA') || r.includes('AR')) {
    base = 'FA-AR';
  } else if (r.includes('БП') || r.includes('FA') || r.includes('CC')) {
    base = 'FA';
  } else {
    base = r.replace(/\s*inst\w*/i, '').replace(/\s*інстр\w*/i, '').trim() || 'PIC';
  }

  return hasInst ? `${base} inst` : base;
}

/**
 * Maps standard aviation English position back to Ukrainian company rank:
 * PIC -> КПС, SIC -> 2П, FE -> ІБ, FA -> БП, FA-AR -> БП-АР.
 * @param {string} pstn 
 * @returns {string}
 */
export function mapPstnToRank(pstn) {
  if (!pstn || typeof pstn !== 'string') return 'КПС';
  const p = pstn.trim().toUpperCase();
  if (p.includes('PIC') || p.includes('КПС')) return 'КПС';
  if (p.includes('SIC') || p.includes('2П') || p.includes('2P') || p === 'PI') return '2П';
  if (p.includes('FE') || p.includes('ІБ')) return 'ІБ';
  if (p.includes('FA-AR') || p.includes('FA-RA') || p.includes('БП-АР') || p.includes('БП-РА') || p.includes('БПАР')) return 'БП-АР';
  if (p.includes('FA') || p.includes('БП')) return 'БП';
  return pstn;
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
      "pstn": "PIC" | "SIC" | "FE" | "FA" | "FA-AR" | "PI" | "PIC inst" | "SIC inst" | "FE inst" | "FA inst" | "FA-AR inst",
      "name": "Full English name (e.g. Berehovyy Serhiy, Sokurenko Oleksandr, Bondarenko Mykhailo, Kotsar Oleh, Turchyn Oleksandr, Kutko Yuriy, Formaniuk Iurii, Chernysh Oleksii, Aleksa Sergii, Dubinin Andrii)",
      "flightDay": "HH:MM",
      "flightNght": "HH:MM",
      "flightNvg": "HH:MM",
      "blockDay": "HH:MM",
      "blockNght": "HH:MM",
      "instDay": "HH:MM",
      "instNght": "HH:MM",
      "flightTask": "e.g. SPO 356/26/1",
      "trainingTypes": ["TRI", "NVG", "VFR night", "LPC", "OPC", "GI_275_PRCT", "HESLO_PRCT", "HHO_PRCT", "MSB", "PALL", "Before Rotation", "Type Rating"],
      "isInstructor": true/false
    }
  ]
}

CRITICAL OCR RULES:
1. Ignore empty rows or crew rows that are crossed out with a diagonal Z-strike or horizontal strike.
2. Ditto marks: If Flight Task or Time fields have repetition marks like -"-, //, do, ditto, copy the exact value from the row directly above it!
3. Format all times strictly as 2-digit HH:MM (e.g. "02:30", "00:00"). If a field is empty, use "00:00" for times.
4. Detect training checkboxes: Look at the headers or handwritten notes for TRI (Type Rating Instructor), NVG (Night Vision Goggles), VFR night (Visual Flight Rules Night), LPC, OPC, GI 275, HESLO, HHO, MSB, Before Rotation, Type Rating. Include all detected training types in the trainingTypes array for each crew member.
5. Dates in Ukrainian documents are strictly in Day.Month.Year format (DD.MM.YYYY). For example, "03.11.2026" is November 3, 2026 -> "2026-11-03", NOT June or March! "05.11.2026" is November 5, 2026 -> "2026-11-05", NOT January or May! Always convert DD.MM.YYYY to ISO format "YYYY-MM-DD".
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
8. Handwriting disambiguation & English Output:
   - Always cross-reference handwritten crew names with the provided REFERENCE CREW ROSTER.
   - ALWAYS return crew names and positions in ENGLISH.
9. Company Position (pstn) Mapping Rules:
   - Standard roles:
     * "КПС" (Командир повітряного судна) -> "PIC" (Pilot in Command)
     * "2П" (Другий пілот) -> "SIC" (Second in Command)
     * "ІБ" (Інженер бортовий / бортінженер) -> "FE" (Flight Engineer)
     * "БП" (Бортпровідник) -> "FA" (Flight Attendant)
     * "БПАР" / "БП-АР" / "БП-РА" (Бортпровідник-рятувальник) -> "FA-AR" (Flight Attendant - Aerial Rescuer)
     * If instructor checkbox is marked or notes say instructor: append " inst" (e.g. "PIC inst", "SIC inst", "FE inst", "FA inst", "FA-AR inst") and set "isInstructor": true.
   - MANDATORY PERMANENT ROLES:
     * Berehovyy Serhiy, Turchyn Oleksandr, Kutko Yuriy -> ALWAYS "PI" (Pilot Instructor) and "isInstructor": true
     * Formaniuk Iurii, Chernysh Oleksii -> ALWAYS "FE inst" and "isInstructor": true
     * Aleksa Sergii, Dubinin Andrii -> ALWAYS "FA-AR inst" and "isInstructor": true
   - CRITICAL PILOT PROTECTION RULE: In training flights, multiple pilots (e.g. PIC and SIC or two PICs) fly together. Check the crew member's Rank in the REFERENCE CREW ROSTER! If a crew member's Rank is "КПС", they are "PIC" (or "PIC inst"), NEVER "FE"! If a crew member's Rank is "2П", they are "SIC" (or "SIC inst"), NEVER "FE"! ONLY crew members with Rank "ІБ" can be "FE"!
10. Return ONLY valid JSON, with NO preamble or extra markdown outside the JSON.
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
  const cleanKey = (apiKey || '').trim();
  cachedWorkingModel = { 
    apiVersion: 'v1beta', 
    modelName: 'gemini-3.8-flash', 
    apiKey: cleanKey, 
    allAvailable: ['gemini-3.8-flash'] 
  };
  return cachedWorkingModel;
}

/**
 * Pings Google Gemini API to test if the provided API key is valid.
 * @param {string} apiKey 
 * @returns {Promise<{success: boolean, error?: string, model?: string, allAvailable?: string[]}>}
 */
export async function testGeminiApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return { success: false, error: 'API ключ не вказано' };
  }

  const cleanKey = apiKey.trim();

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${cleanKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Respond with "OK"' }]
        }]
      })
    });

    if (response.ok) {
      cachedWorkingModel = { apiVersion: 'v1beta', modelName: 'gemini-3.8-flash', apiKey: cleanKey, allAvailable: ['gemini-3.8-flash'] };
      return { success: true, model: 'gemini-3.8-flash (v1beta)', allAvailable: ['gemini-3.8-flash'] };
    }

    const errData = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 403) {
      return { 
        success: false, 
        error: errData.error?.message || `Помилка авторизації (HTTP ${response.status}). Перевірте правильність ключа.` 
      };
    }

    return { 
      success: false, 
      error: errData.error?.message || `Помилка Gemini API (HTTP ${response.status}). Перевірте доступність моделі gemini-3.8-flash.` 
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
 * @param {string} knownCrewRoster
 * @returns {Promise<object>}
 */
export async function callGeminiVisionAPI(base64Data, mimeType, apiKey, retryCount = 0, onStatusUpdate = null, knownCrewRoster = '') {
  if (!apiKey) throw new Error('Gemini API ключ не налаштовано в системі');

  const cleanKey = apiKey.trim();
  const modelInfo = await getBestAvailableGeminiModel(cleanKey);
  
  const candidateList = [
    { ver: 'v1beta', name: 'gemini-3.8-flash' }
  ];

  let rateLimitError = null;
  let lastError = null;

  for (const { ver, name: model } of candidateList) {
    const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${cleanKey}`;
    
    if (onStatusUpdate) {
      onStatusUpdate(`Розпізнавання через ${model}...`);
    }

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
            text: 'Extract all flight data, duty time, block time, briefing times, and crew member table from this training flight log sheet according to your system instruction.' +
              (knownCrewRoster ? `\n\nREFERENCE CREW ROSTER (Compare handwritten names against this list of actual Ukrainian Helicopters employees; do not misread letters to create other names):\n${knownCrewRoster}` : '')
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Handle 429 (Rate Limit) and 503 / High Demand Spikes on Google servers
      if (response.status === 429 || response.status === 503) {
        const errJson = await response.json().catch(() => ({}));
        const googleMsg = errJson.error?.message || (response.status === 503 ? 'High demand / Service Unavailable' : 'Resource Exhausted');
        const isHighDemandSpike = response.status === 503 || googleMsg.toLowerCase().includes('high demand');

        let waitMs = isHighDemandSpike ? [5000, 8000, 12000][retryCount] || 8000 : 15000;
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
          } else if (!isHighDemandSpike) {
            waitMs = [12000, 20000, 30000][retryCount] || 30000;
          }
        }

        // If wait time is > 35 seconds, this is a DAILY quota exhaustion (RPD), NOT a per-minute limit.
        if (waitMs > 35000) {
          console.warn(`[Gemini OCR] Model ${model} daily quota exhausted (retryDelay: ${Math.round(waitMs / 1000)}s). Skipping immediately to next model...`);
          rateLimitError = new Error(`Вичерпано добову квоту безкоштовного тарифу для ${model} (добовий ліміт RPD). Спробуйте інший API ключ або зачекайте оновлення добової квоти.`);
          continue;
        }

        // Auto-retry transient load spikes & rate limits (up to 3 attempts)
        if (retryCount < 3) {
          const secText = Math.round(waitMs / 1000);
          const reasonLabel = isHighDemandSpike ? 'Пікове навантаження на серверах Google' : 'Ліміт запитів Gemini';
          console.warn(`[Gemini OCR] ${response.status} (${reasonLabel}) on ${model}. Waiting ${secText}s... (Спроба ${retryCount + 1}/3)`);
          
          if (onStatusUpdate) {
            for (let s = secText; s > 0; s--) {
              onStatusUpdate(`${reasonLabel}. Автоповтор через ${s} сек... (Спроба ${retryCount + 1}/3)`);
              await new Promise(r => setTimeout(r, 1000));
            }
          } else {
            await new Promise(r => setTimeout(r, waitMs));
          }

          return callGeminiVisionAPI(base64Data, mimeType, apiKey, retryCount + 1, onStatusUpdate, knownCrewRoster);
        }

        console.warn(`Model ${ver}/${model} busy after retries.`);
        rateLimitError = new Error(`Сервери Google Gemini тимчасово перевантажені (${googleMsg}). Натисніть кнопку 🔄 біля файлу для повторної спроби.`);
        continue;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${response.status}`;
        
        // If message is high demand spike that came with another status code, retry
        if (errMsg.toLowerCase().includes('high demand') && retryCount < 3) {
          if (onStatusUpdate) onStatusUpdate('Пікове навантаження на модель. Автоповтор через 5 сек...');
          await new Promise(r => setTimeout(r, 5000));
          return callGeminiVisionAPI(base64Data, mimeType, apiKey, retryCount + 1, onStatusUpdate, knownCrewRoster);
        }

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
 * Normalizes a date string to standard YYYY-MM-DD for reliable duplicate comparison.
 * Handles: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, etc.
 * @param {string} dateStr 
 * @returns {string}
 */
export function normalizeDateForComparison(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  // match YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  // match DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  return s;
}

/**
 * Normalizes a flight task string by removing "№", "#", whitespaces and converting to lowercase.
 * @param {string} taskStr 
 * @returns {string}
 */
export function normalizeFlightTask(taskStr) {
  if (!taskStr) return '';
  return String(taskStr).replace(/[№#\s]/g, '').toLowerCase().trim();
}

/**
 * Checks if candidate flight is a duplicate of an existing flight.
 * DETERMINATION RULE:
 * 1 - Основний детермінатор: Дата польоту (date). Якщо дати різні -> точно не дублікат.
 * 2 - Якщо дата співпадає: перевіряємо номер польотного завдання (mainFlightTask або завдання екіпажу).
 *     - Якщо в обох записах вказано номер завдання і вони РІЗНІ -> це різні завдання/польоти того ж дня (не дублікат).
 *     - Якщо номери завдань співпадають, або в одному/обох номер не вказаний -> ДУБЛІКАТ за датою.
 * 
 * @param {object} candidate 
 * @param {object} existing 
 * @returns {boolean}
 */
export function isFlightDuplicate(candidate, existing, options = {}) {
  if (!candidate || !existing) return false;
  
  // If explicitly requested to exclude comparing against self (e.g. form collision check while editing)
  if (options && options.excludeSelfId && candidate.id && existing.id && candidate.id === existing.id) {
    return false;
  }

  // Same ID is definitively the same flight record / duplicate
  if (candidate.id && existing.id && candidate.id === existing.id) {
    return true;
  }

  const candDate = normalizeDateForComparison(candidate.date);
  const existDate = normalizeDateForComparison(existing.date);

  // 1 - Дата є головним детермінатором
  if (!candDate || !existDate || candDate !== existDate) {
    return false;
  }

  // 2 - Якщо дата співпадає, перевіряємо номер польотного завдання
  const candTask = normalizeFlightTask(candidate.mainFlightTask || (candidate.crew && candidate.crew[0]?.flightTask));
  const existTask = normalizeFlightTask(existing.mainFlightTask || (existing.crew && existing.crew[0]?.flightTask));

  // Якщо в обох вказано номер завдання і вони різняться -> різні завдання/польоти в один день
  if (candTask && existTask && candTask !== existTask) {
    return false;
  }

  // В інших випадках (номери завдань співпадають або в одному/обох не вказано) -> ДУБЛІКАТ
  return true;
}

/**
 * Checks if a parsed flight record already exists in the local database.
 * @param {object} parsedFlight 
 * @param {Array} existingFlights 
 * @returns {{isDuplicate: boolean, duplicateId?: string, duplicateFlight?: object, reason?: string}}
 */
export function checkFlightDuplicate(parsedFlight, existingFlights = []) {
  if (!parsedFlight || !parsedFlight.date || !Array.isArray(existingFlights)) {
    return { isDuplicate: false };
  }

  // Skip comparing against itself if record has an ID (e.g. when editing)
  const existing = existingFlights.find(f => isFlightDuplicate(parsedFlight, f, { excludeSelfId: true }));

  if (existing) {
    const normDate = normalizeDateForComparison(parsedFlight.date);
    const candTask = normalizeFlightTask(parsedFlight.mainFlightTask || (parsedFlight.crew && parsedFlight.crew[0]?.flightTask));
    const existTask = normalizeFlightTask(existing.mainFlightTask || (existing.crew && existing.crew[0]?.flightTask));

    let reason = `Політ за дату ${normDate} вже існує в базі`;
    if (candTask && existTask && candTask === existTask) {
      reason += ` (співпадіння за номером завдання №${candTask})`;
    } else {
      reason += ` (основний детермінатор - дата)`;
    }

    return { 
      isDuplicate: true, 
      duplicateId: existing.id,
      duplicateFlight: existing,
      reason: reason
    };
  }
  return { isDuplicate: false };
}

/**
 * Processes a single scan file through Gemini Vision OCR and performs crew & duplicate matching.
 * @param {File|Blob} file 
 * @param {object} itemResult 
 * @param {string} apiKey 
 * @param {Array} flightCrew 
 * @param {Array} cabinCrew 
 * @param {Array} existingFlights 
 * @param {Function} onStatusUpdate 
 * @returns {Promise<object>}
 */
export async function processSingleScan(file, itemResult, apiKey, flightCrew, cabinCrew, existingFlights, onStatusUpdate = null) {
  itemResult.status = 'processing';
  itemResult.statusMessage = 'ШІ підключається та готує аналіз...';
  if (onStatusUpdate) onStatusUpdate(itemResult.statusMessage);

  // Build compact crew roster for Gemini vision disambiguation
  const knownCrewList = [...(flightCrew || []), ...(cabinCrew || [])]
    .map(m => {
      const en = m.Full_Name_EN || '';
      const ua = m.Full_Name_UA || '';
      const norm = normalizeFlightCrewRole(en, m.Rank, false, m);
      return `${en} (${ua}) [Role: ${norm.pstn}]`;
    })
    .filter(Boolean);
  const knownCrewRoster = knownCrewList.join(', ');

  try {
    const base64Data = await fileToBase64(file);
    itemResult.base64Data = base64Data;
    const parsedData = await callGeminiVisionAPI(
      base64Data, 
      itemResult.mimeType, 
      apiKey, 
      0, 
      (statusMsg) => {
        itemResult.statusMessage = statusMsg;
        if (onStatusUpdate) onStatusUpdate(statusMsg);
      },
      knownCrewRoster
    );
    itemResult.statusMessage = null;
    
    // Auto-normalize & derive crew block times if missing or zero
    normalizeParsedFlightBlockTimes(parsedData);

    // Auto-correct date if filename has clear European date pattern (e.g. "03.11.2026")
    const fnDateMatch = (file.name || '').match(/(\d{1,2})[._-](\d{1,2})[._-](\d{4})/);
    if (fnDateMatch) {
      const d = fnDateMatch[1].padStart(2, '0');
      const m = fnDateMatch[2].padStart(2, '0');
      const y = fnDateMatch[3];
      const fnDateIso = `${y}-${m}-${d}`;
      if (!parsedData.date || parsedData.date.length < 8) {
        parsedData.date = fnDateIso;
      } else {
        const parsedParts = parsedData.date.split('-');
        if (parsedParts.length === 3 && parsedParts[0] === y && (parsedParts[1] !== m || parsedParts[2] !== d)) {
          if (parsedParts[2] === d || parsedParts[1] === d) {
            parsedData.date = fnDateIso;
          }
        }
      }
    }
    
    // Perform crew fuzzy matching & position validation
    if (Array.isArray(parsedData.crew)) {
      parsedData.crew = parsedData.crew.map(c => {
        const match = matchCrewMember(c.name, flightCrew, cabinCrew);
        const norm = normalizeFlightCrewRole(
          match.matchedMember ? (match.matchedMember.Full_Name_EN || c.name) : c.name,
          c.pstn,
          c.isInstructor,
          match.matchedMember
        );

        return {
          ...c,
          name: norm.name,
          pstn: norm.pstn,
          isInstructor: norm.isInstructor,
          matchedCrewId: match.matchedMember ? match.matchedMember.id : null,
          matchedCrewType: match.matchedMember ? match.matchedMember.crewType : 'Flight',
          matchedCrewName: norm.name,
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

  return itemResult;
}

/**
 * High-level batch processing for multiple scan files.
 * @param {Array<File>} files 
 * @param {string} apiKey 
 * @param {Array} flightCrew 
 * @param {Array} cabinCrew 
 * @param {Array} existingFlights 
 * @param {Function} onProgress - Callback (itemResult, index, total, customStatus)
 * @returns {Promise<Array>}
 */
export async function processScanBatch(files, apiKey, flightCrew, cabinCrew, existingFlights, onProgress) {
  const total = files.length;
  const results = files.map((file, i) => ({
    id: `scan_${Date.now()}_${i}`,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    fileBlob: file,
    status: i === 0 ? 'processing' : 'queued',
    statusMessage: i === 0 ? 'ШІ підключається та готує аналіз...' : 'В черзі на обробку...',
    error: null,
    parsedData: null,
    duplicateInfo: null
  }));

  // Announce all files upfront so UI lists them immediately!
  if (onProgress) {
    results.forEach((it, idx) => onProgress(it, idx, total, it.statusMessage));
  }

  for (let i = 0; i < total; i++) {
    const itemResult = results[i];
    await processSingleScan(files[i], itemResult, apiKey, flightCrew, cabinCrew, existingFlights, (statusMsg) => {
      if (onProgress) onProgress(itemResult, i, total, statusMsg);
    });

    if (onProgress) onProgress(itemResult, i, total);

    // Free tier safe pacing: 3000ms delay before processing next file to respect RPM limits
    if (i < total - 1) {
      if (onProgress) onProgress(itemResult, i, total, 'Пауза між файлами (3 сек)...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  return results;
}
