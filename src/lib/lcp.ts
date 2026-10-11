// Lattice Context Protocol (LCP)
// Facilitates INGEST, ACTIVATE, ROUTE, and SYNTHESIZE over the 12x12+1 Ontology

export const HOUSES: Record<string, string> = {
  H01: 'Consciousness',
  H02: 'Technology',
  H03: 'Economics',
  H04: 'Governance',
  H05: 'Culture',
  H06: 'Health',
  H07: 'Earth',
  H08: 'Mathematics',
  H09: 'Physics',
  H10: 'History',
  H11: 'Communication',
  H12: 'Security'
};

export interface ClassificationResult {
  houseId: string;
  sphereId: string;
  confidence: number;
}

/**
 * INGEST (Classify input -> Spheres)
 * Replaces Noosphere IntentEngine keyword patterns and 
 * legacy Grokbrain v4 Academic schemas.
 */
export const ingestContext = async (prompt: string): Promise<ClassificationResult[]> => {
  // In a robust integration, this proxies to a classification endpoint embedding
  // matching against `lattice_ontology.yaml` space.
  const lowerPrompt = prompt.toLowerCase();
  const results: ClassificationResult[] = [];

  for (const [houseId, name] of Object.entries(HOUSES)) {
    if (lowerPrompt.includes(name.toLowerCase())) {
        results.push({ houseId, sphereId: `${houseId}.S01`, confidence: 0.85 });
    }
  }

  return results;
};

/**
 * SYNTHESIZE (Element 145 Coordination)
 * Maps cross-domain interactions from active spheres and detects emergent risks/blind spots.
 */
export const generateSynthesisPrompt = (activeHouses: string[], query: string): string => {
  const houseNames = activeHouses.map(id => HOUSES[id]).join(', ');
  return `[SYSTEM PING - ELEMENT 145 SYNTHESIZER]
You are operating in the Synthesis Layer. The following Houses have been ACTIVATED for this task: ${houseNames || 'None strictly detected'}.
Query: "${query}"
Task: Perform a cross-domain analysis. Identify blind spots in the non-activated houses and construct structured, deeply reasoned outputs tagged explicitly with confidence tiers.`;
};
