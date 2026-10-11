export interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "blocking" | "warning" | "info";
}

export interface VerificationResult {
  overall_passed: boolean;
  has_blocking_failures: boolean;
  checks: VerificationCheck[];
}

export function verifyArtifact(content: string): VerificationResult {
  const checks: VerificationCheck[] = [];

  // 1. Epistemic Labeling (D-EPI)
  const hasTiers = /\[(✓ VERIFIED|◆ DESIGN_CHOICE|~ CREATIVE_OVERLAY|\? NOT_VERIFIED)\]/.test(content);
  checks.push({
    name: "epistemic_labeling",
    passed: hasTiers,
    message: hasTiers 
      ? "Epistemic labeling standard applied." 
      : "Missing expectation: No explicit confidence tier labeling found. Defaulting to [? NOT_VERIFIED].",
    severity: "warning"
  });

  // 2. No Empirical Overclaim
  const hasOverclaim = /empirically confirmed as (?:the )?global optimum|Empirically Confirmed/i.test(content);
  checks.push({
    name: "no_empirical_overclaim",
    passed: !hasOverclaim,
    message: !hasOverclaim 
      ? "No empirical overclaim patterns detected." 
      : "BLOCKED: Content contains empirical overclaim pattern. This must be a DESIGN_CHOICE.",
    severity: "blocking"
  });

  // 3. Verified Claims Must Have Citations
  // Split by blocks and check if a block with VERIFIED has a URL.
  const blocks = content.split(/\n\s*\n/);
  const verifiedBlocks = blocks.filter(b => b.includes('[✓ VERIFIED]'));
  let missingCitations = false;
  
  if (verifiedBlocks.length > 0) {
    missingCitations = verifiedBlocks.some(b => !b.match(/https?:\/\//));
    checks.push({
      name: "verified_citations",
      passed: !missingCitations,
      message: !missingCitations 
        ? "All VERIFIED claims contain inline citations." 
        : "BLOCKED: [✓ VERIFIED] claim detected without a URL citation. Downgrade to [? NOT_VERIFIED].",
      severity: "blocking"
    });
  }

  const has_blocking_failures = checks.some(c => !c.passed && c.severity === "blocking");
  const overall_passed = !has_blocking_failures;

  return {
    overall_passed,
    has_blocking_failures,
    checks
  };
}
