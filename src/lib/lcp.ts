// Lattice Context Protocol (LCP)
// Historical application labels, separate from the original Ariadne registry.
// The Nov23 HyperMatrix amendment forbids assuming ordinal identity between them.
export const LEGACY_LCP_NAMESPACE = 'ATLAS_LCP_LEGACY';
export { ARIADNE_SOURCE, ariadneNodeReference, validateAriadneReference,
  createAriadneSourceAdapter, createAtlasContextAdapter } from '../../programs/context-integration/index.mjs';

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
  namespace: typeof LEGACY_LCP_NAMESPACE;
  confidence: null;
  semanticCrosswalkAccepted: false;
}

/**
 * Select historical application labels by literal name substring.
 * This is not a semantic classifier or an original Ariadne crosswalk.
 */
export const ingestContext = async (prompt: string): Promise<ClassificationResult[]> => {
  const lowerPrompt = prompt.toLowerCase();
  const results: ClassificationResult[] = [];

  for (const [houseId, name] of Object.entries(HOUSES)) {
    if (lowerPrompt.includes(name.toLowerCase())) {
        results.push({ houseId, sphereId: `${houseId}.S01`, namespace: LEGACY_LCP_NAMESPACE,
          confidence: null, semanticCrosswalkAccepted: false });
    }
  }

  return results;
};

/**
 * Prepare a cross-domain prompt from historical labels.
 * This function does not run a model or verify the resulting analysis.
 */
export const generateSynthesisPrompt = (activeHouses: string[], query: string): string => {
  const houseNames = activeHouses.map(id => HOUSES[id]).join(', ');
  return `[SYSTEM PING - ELEMENT 145 SYNTHESIZER]
You are operating in the Synthesis Layer. The following historical application labels were selected in namespace ATLAS_LCP_LEGACY: ${houseNames || 'None strictly detected'}. These labels are not original Ariadne HSN identities or verified semantic classifications.
Query: "${query}"
Task: Perform a cross-domain analysis. Identify blind spots in the non-activated houses and construct structured, deeply reasoned outputs tagged explicitly with confidence tiers.`;
};
