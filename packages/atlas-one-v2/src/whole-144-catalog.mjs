/** Owner-authored, SOURCE-ONLY work portfolio. 144 proposed improvements, NOT 144 installed features.
 * H/S slots are planning locations, not semantic assignments to the private Ariadne sphere ontology.
 */
export const WHOLE_144_CANDIDATES = Object.freeze([
  {
    "id": "W144-H01-S01",
    "house": "H01",
    "sphere": "H01.S01",
    "houseName": "Energy & Matter",
    "title": "Meter Work-compute energy budgets",
    "acceptance": "Atlas job receipts separate measured joules, estimates and unknowns",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S02",
    "house": "H01",
    "sphere": "H01.S02",
    "houseName": "Energy & Matter",
    "title": "Enforce magnetic-generator energy closure",
    "acceptance": "MAG-01 rejects electric output exceeding accounted thermal and stored inputs",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S03",
    "house": "H01",
    "sphere": "H01.S03",
    "houseName": "Energy & Matter",
    "title": "Bind fusion-simulation assumptions",
    "acceptance": "Reactor energy claims require assumption IDs and source editions",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S04",
    "house": "H01",
    "sphere": "H01.S04",
    "houseName": "Energy & Matter",
    "title": "Model battery reserve depletion",
    "acceptance": "Outage tests prevent dispatch after protected reserve is exhausted",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S05",
    "house": "H01",
    "sphere": "H01.S05",
    "houseName": "Energy & Matter",
    "title": "Audit cryogenic heat and electricity",
    "acceptance": "Cold-stage watts never sum directly with wall-plug electrical watts",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S06",
    "house": "H01",
    "sphere": "H01.S06",
    "houseName": "Energy & Matter",
    "title": "Separate virtual from physical resources",
    "acceptance": "UI rejects virtual-credit units in physical material ledgers",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S07",
    "house": "H01",
    "sphere": "H01.S07",
    "houseName": "Energy & Matter",
    "title": "Detect double-counted recovered heat",
    "acceptance": "One joule cannot be credited twice across heat-recovery edges",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S08",
    "house": "H01",
    "sphere": "H01.S08",
    "houseName": "Energy & Matter",
    "title": "Record materials lifecycles",
    "acceptance": "Stock-flow receipts distinguish imports reuse extraction and disposal",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S09",
    "house": "H01",
    "sphere": "H01.S09",
    "houseName": "Energy & Matter",
    "title": "Track QPU and GPU power boundaries",
    "acceptance": "Facility overhead counted once for identical load partitions",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S10",
    "house": "H01",
    "sphere": "H01.S10",
    "houseName": "Energy & Matter",
    "title": "Reconcile machine operating duty cycles",
    "acceptance": "kW nameplates cannot masquerade as kWh observed production",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S11",
    "house": "H01",
    "sphere": "H01.S11",
    "houseName": "Energy & Matter",
    "title": "Stress shared-source generator redundancy",
    "acceptance": "One common heat outage defeats nominal N+1 conversion capacity",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H01-S12",
    "house": "H01",
    "sphere": "H01.S12",
    "houseName": "Energy & Matter",
    "title": "Publish source-only energy dashboard",
    "acceptance": "Every physical claim shows unit source edition and unverified state",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S01",
    "house": "H02",
    "sphere": "H02.S01",
    "houseName": "Water & Food",
    "title": "Build water-accounting dimension checks",
    "acceptance": "m3 inventory reconciles inflows consumption return and losses",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S02",
    "house": "H02",
    "sphere": "H02.S02",
    "houseName": "Water & Food",
    "title": "Separate drinkable and process-water loops",
    "acceptance": "Cross-contamination examples are blocked at the category boundary",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S03",
    "house": "H02",
    "sphere": "H02.S03",
    "houseName": "Water & Food",
    "title": "Record unknown water-source provenance",
    "acceptance": "No water-quality certification without sampled evidence",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S04",
    "house": "H02",
    "sphere": "H02.S04",
    "houseName": "Water & Food",
    "title": "Simulate reclaimed-water outages",
    "acceptance": "Fallback plans expose independent source dependencies",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S05",
    "house": "H02",
    "sphere": "H02.S05",
    "houseName": "Water & Food",
    "title": "Track food-system supply chains",
    "acceptance": "Each proposed inventory link carries expiry and source evidence",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S06",
    "house": "H02",
    "sphere": "H02.S06",
    "houseName": "Water & Food",
    "title": "Check food accessibility in habitat plans",
    "acceptance": "A low-power contingency still allocates essential nutrition loads",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S07",
    "house": "H02",
    "sphere": "H02.S07",
    "houseName": "Water & Food",
    "title": "Model closed-loop nutrient balances",
    "acceptance": "Nitrogen and phosphorus cannot appear from unaccounted inputs",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S08",
    "house": "H02",
    "sphere": "H02.S08",
    "houseName": "Water & Food",
    "title": "Require contamination incident provenance",
    "acceptance": "Incident records separate hypothesis measurement and corrective action",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S09",
    "house": "H02",
    "sphere": "H02.S09",
    "houseName": "Water & Food",
    "title": "Respect community food governance",
    "acceptance": "Cultural and local food claims need permission before public reuse",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S10",
    "house": "H02",
    "sphere": "H02.S10",
    "houseName": "Water & Food",
    "title": "Store agricultural sensor uncertainty",
    "acceptance": "Dashboard shows sensor calibration dates and error bounds",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S11",
    "house": "H02",
    "sphere": "H02.S11",
    "houseName": "Water & Food",
    "title": "Test water-storage failure and recovery",
    "acceptance": "Redundancy simulation covers leak isolation and partial service",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H02-S12",
    "house": "H02",
    "sphere": "H02.S12",
    "houseName": "Water & Food",
    "title": "Publish water-food resilience receipts",
    "acceptance": "A report distinguishes synthetic recovery from real-world outcomes",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S01",
    "house": "H03",
    "sphere": "H03.S01",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Map environmental impact boundaries",
    "acceptance": "Each change declares habitat impacts and excluded downstream effects",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S02",
    "house": "H03",
    "sphere": "H03.S02",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Track compute cooling water tradeoffs",
    "acceptance": "Water and heat savings are not double-counted across subsystems",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S03",
    "house": "H03",
    "sphere": "H03.S03",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Create material circularity ledger",
    "acceptance": "Reuse claims prove provenance before avoiding virgin input credits",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S04",
    "house": "H03",
    "sphere": "H03.S04",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Simulate infrastructure dependency cascades",
    "acceptance": "Single point failures propagate through explicit service graph edges",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S05",
    "house": "H03",
    "sphere": "H03.S05",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Separate virtual ecology from natural ecology",
    "acceptance": "Fictional biodiversity is never reported as observed wildlife",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S06",
    "house": "H03",
    "sphere": "H03.S06",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Test disaster-recovery source lineage",
    "acceptance": "Restored backups retain edition hashes and gap notices",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S07",
    "house": "H03",
    "sphere": "H03.S07",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Instrument facility energy intensity",
    "acceptance": "Metrics show workload denominator and sampling window",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S08",
    "house": "H03",
    "sphere": "H03.S08",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Gate environmental evidence freshness",
    "acceptance": "Stale measurements do not receive current-state badges",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S09",
    "house": "H03",
    "sphere": "H03.S09",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Build accessible infrastructure maps",
    "acceptance": "Navigation alternatives work without 3D WebGL",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S10",
    "house": "H03",
    "sphere": "H03.S10",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Record repair over replacement options",
    "acceptance": "Maintenance candidates include reversible rollback proposals",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S11",
    "house": "H03",
    "sphere": "H03.S11",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Audit resource-driven externalities",
    "acceptance": "Displaced emissions and exported waste are explicit unknowns",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H03-S12",
    "house": "H03",
    "sphere": "H03.S12",
    "houseName": "Ecology, Environment & Infrastructure",
    "title": "Publish environmental uncertainty register",
    "acceptance": "Reproducible assumptions and unresolved impacts stay visible",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S01",
    "house": "H04",
    "sphere": "H04.S01",
    "houseName": "Health & Medicine",
    "title": "Separate medical education from personal care",
    "acceptance": "Work-room research never silently imports private health records",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S02",
    "house": "H04",
    "sphere": "H04.S02",
    "houseName": "Health & Medicine",
    "title": "Require clinical-grade evidence labels",
    "acceptance": "Preprints and laboratory results cannot imply proven treatment",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S03",
    "house": "H04",
    "sphere": "H04.S03",
    "houseName": "Health & Medicine",
    "title": "Audit wellness claims in simulations",
    "acceptance": "Fictional physiological outcomes are clearly marked synthetic",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S04",
    "house": "H04",
    "sphere": "H04.S04",
    "houseName": "Health & Medicine",
    "title": "Model essential habitat medical loads",
    "acceptance": "Critical-device energy appears in minimum-power planning",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S05",
    "house": "H04",
    "sphere": "H04.S05",
    "houseName": "Health & Medicine",
    "title": "Build disability-first navigation tests",
    "acceptance": "Core workflows function with keyboard and screen-reader controls",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S06",
    "house": "H04",
    "sphere": "H04.S06",
    "houseName": "Health & Medicine",
    "title": "Enforce sensitive-data minimization",
    "acceptance": "Work receipts contain no personal diagnosis or treatment history",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S07",
    "house": "H04",
    "sphere": "H04.S07",
    "houseName": "Health & Medicine",
    "title": "Check telehealth consent contracts",
    "acceptance": "Source transfer requires scope purpose expiration and revocation",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S08",
    "house": "H04",
    "sphere": "H04.S08",
    "houseName": "Health & Medicine",
    "title": "Test cold-chain failure propagation",
    "acceptance": "Medicine storage scenario flags temperature excursions as incidents",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S09",
    "house": "H04",
    "sphere": "H04.S09",
    "houseName": "Health & Medicine",
    "title": "Separate aggregated and individual signals",
    "acceptance": "Small-group reports suppress re-identifying health details",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S10",
    "house": "H04",
    "sphere": "H04.S10",
    "houseName": "Health & Medicine",
    "title": "Preserve clinical uncertainty objections",
    "acceptance": "Dissent and contradicting studies are retained in review packets",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S11",
    "house": "H04",
    "sphere": "H04.S11",
    "houseName": "Health & Medicine",
    "title": "Audit crisis escalation wording",
    "acceptance": "Automated copy never claims a real medical professional is present",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H04-S12",
    "house": "H04",
    "sphere": "H04.S12",
    "houseName": "Health & Medicine",
    "title": "Publish health-system safety blockers",
    "acceptance": "Unverified clinical impacts cannot be promoted to deployed care",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S01",
    "house": "H05",
    "sphere": "H05.S01",
    "houseName": "Education & Knowledge",
    "title": "Generate source-linked learning pathways",
    "acceptance": "Every lesson cites evidence edition and prerequisite assumptions",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S02",
    "house": "H05",
    "sphere": "H05.S02",
    "houseName": "Education & Knowledge",
    "title": "Add false-friend concept checks",
    "acceptance": "Same-title HSN links remain unmerged without semantic review",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S03",
    "house": "H05",
    "sphere": "H05.S03",
    "houseName": "Education & Knowledge",
    "title": "Design hypothesis-to-falsifier cards",
    "acceptance": "A research card can be disproved by an explicit observable",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S04",
    "house": "H05",
    "sphere": "H05.S04",
    "houseName": "Education & Knowledge",
    "title": "Test spaced-retrieval boundaries",
    "acceptance": "Memory review uses only consented educational material",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S05",
    "house": "H05",
    "sphere": "H05.S05",
    "houseName": "Education & Knowledge",
    "title": "Build multi-level explanation outputs",
    "acceptance": "Beginner and expert views retain identical factual qualifiers",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S06",
    "house": "H05",
    "sphere": "H05.S06",
    "houseName": "Education & Knowledge",
    "title": "Audit 1728 coverage without welfare scoring",
    "acceptance": "Counts never substitute for domain understanding or learner outcomes",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S07",
    "house": "H05",
    "sphere": "H05.S07",
    "houseName": "Education & Knowledge",
    "title": "Make lab notebooks reproducible",
    "acceptance": "Simulation output includes seeds version parameters and environment",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S08",
    "house": "H05",
    "sphere": "H05.S08",
    "houseName": "Education & Knowledge",
    "title": "Track correction histories visibly",
    "acceptance": "Retractions and revisions preserve original claims and reasons",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S09",
    "house": "H05",
    "sphere": "H05.S09",
    "houseName": "Education & Knowledge",
    "title": "Add multilingual nuance review",
    "acceptance": "Translation variants preserve scope and cultural disagreement",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S10",
    "house": "H05",
    "sphere": "H05.S10",
    "houseName": "Education & Knowledge",
    "title": "Separate tutoring from examination authority",
    "acceptance": "Practice feedback cannot certify formal qualifications",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S11",
    "house": "H05",
    "sphere": "H05.S11",
    "houseName": "Education & Knowledge",
    "title": "Design peer-review source checklists",
    "acceptance": "Reviewer disagreement and nonresponse remain distinct",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H05-S12",
    "house": "H05",
    "sphere": "H05.S12",
    "houseName": "Education & Knowledge",
    "title": "Publish coverage gap explorer",
    "acceptance": "Unpopulated positions appear as gaps rather than invented expertise",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S01",
    "house": "H06",
    "sphere": "H06.S01",
    "houseName": "Security",
    "title": "Fence self-declared resident identity",
    "acceptance": "Account authentication never verifies an independent resident",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S02",
    "house": "H06",
    "sphere": "H06.S02",
    "houseName": "Security",
    "title": "Recheck READ and RETURN rights",
    "acceptance": "Revocation tests deny data after lease epoch changes",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S03",
    "house": "H06",
    "sphere": "H06.S03",
    "houseName": "Security",
    "title": "Bound Work-room subscriptions",
    "acceptance": "Explicit consent and expiry precede any hosted event delivery",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S04",
    "house": "H06",
    "sphere": "H06.S04",
    "houseName": "Security",
    "title": "Separate permission from semantic authority",
    "acceptance": "A source-backed claim cannot grant room or CANON control",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S05",
    "house": "H06",
    "sphere": "H06.S05",
    "houseName": "Security",
    "title": "Prevent prompt-injection tool escalation",
    "acceptance": "Retrieved text cannot initiate privileged operations",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S06",
    "house": "H06",
    "sphere": "H06.S06",
    "houseName": "Security",
    "title": "Detect cross-mode private-data leakage",
    "acceptance": "Work output excludes Play Dream Quiet Brain and Palace content",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S07",
    "house": "H06",
    "sphere": "H06.S07",
    "houseName": "Security",
    "title": "Verify message replay idempotency",
    "acceptance": "Duplicate delivery cannot double-post the same action",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S08",
    "house": "H06",
    "sphere": "H06.S08",
    "houseName": "Security",
    "title": "Audit task-runner effects and limits",
    "acceptance": "Local operators do not gain deployment or spending authority",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S09",
    "house": "H06",
    "sphere": "H06.S09",
    "houseName": "Security",
    "title": "Exercise malicious graph neighbors",
    "acceptance": "Related-source edges never become direct evidence of agreement",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S10",
    "house": "H06",
    "sphere": "H06.S10",
    "houseName": "Security",
    "title": "Bind resource receipts to provenance",
    "acceptance": "Hashes reject cross-room and cross-edition substitution",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S11",
    "house": "H06",
    "sphere": "H06.S11",
    "houseName": "Security",
    "title": "Simulate room quota and expiry races",
    "acceptance": "Atomic limit tests reject stale joins and oversized posts",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H06-S12",
    "house": "H06",
    "sphere": "H06.S12",
    "houseName": "Security",
    "title": "Publish incident rollback rehearsals",
    "acceptance": "Security changes have exact reversal and verification records",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S01",
    "house": "H07",
    "sphere": "H07.S01",
    "houseName": "Business, Finance & Governance",
    "title": "Separate forecast from booked value",
    "acceptance": "Hypothetical isotope or AI yields do not enter realized revenue",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S02",
    "house": "H07",
    "sphere": "H07.S02",
    "houseName": "Business, Finance & Governance",
    "title": "Build dimensional budget ledger",
    "acceptance": "Dollars energy material and model tokens are not addable",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S03",
    "house": "H07",
    "sphere": "H07.S03",
    "houseName": "Business, Finance & Governance",
    "title": "Require spending authorization envelopes",
    "acceptance": "No external purchase executes from candidate Work packets",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S04",
    "house": "H07",
    "sphere": "H07.S04",
    "houseName": "Business, Finance & Governance",
    "title": "Trace transparent grant decisions",
    "acceptance": "Proposal acceptance records named human authority and version",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S05",
    "house": "H07",
    "sphere": "H07.S05",
    "houseName": "Business, Finance & Governance",
    "title": "Test competing resource allocation",
    "acceptance": "Critical services retain minimum reserves under constrained supply",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S06",
    "house": "H07",
    "sphere": "H07.S06",
    "houseName": "Business, Finance & Governance",
    "title": "Audit opportunity-cost baselines",
    "acceptance": "Counterfactuals disclose excluded cash flows and assumptions",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S07",
    "house": "H07",
    "sphere": "H07.S07",
    "houseName": "Business, Finance & Governance",
    "title": "Design plural governance objections",
    "acceptance": "Dissents remain accessible after majority recommendation",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S08",
    "house": "H07",
    "sphere": "H07.S08",
    "houseName": "Business, Finance & Governance",
    "title": "Reconcile rights against profitability",
    "acceptance": "Rights blockers cannot be offset by monetary gain scores",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S09",
    "house": "H07",
    "sphere": "H07.S09",
    "houseName": "Business, Finance & Governance",
    "title": "Version task ownership and expiry",
    "acceptance": "Temporary claim leases expire without claiming identity permanence",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S10",
    "house": "H07",
    "sphere": "H07.S10",
    "houseName": "Business, Finance & Governance",
    "title": "Build incentive anti-Goodhart checks",
    "acceptance": "Output-count rewards cannot substitute for verified substantive quality",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S11",
    "house": "H07",
    "sphere": "H07.S11",
    "houseName": "Business, Finance & Governance",
    "title": "Track maintenance liabilities",
    "acceptance": "Forecasts include failure response and long-term upkeep",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H07-S12",
    "house": "H07",
    "sphere": "H07.S12",
    "houseName": "Business, Finance & Governance",
    "title": "Publish governance decision receipt",
    "acceptance": "Decisions carry deliberation source status and reversal condition",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S01",
    "house": "H08",
    "sphere": "H08.S01",
    "houseName": "Humanities, Arts & Culture",
    "title": "Build opt-in public gallery previews",
    "acceptance": "Private Palace sketches never appear in Work without consent",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S02",
    "house": "H08",
    "sphere": "H08.S02",
    "houseName": "Humanities, Arts & Culture",
    "title": "Keep creative provenance visible",
    "acceptance": "Attribution and permitted reuse travel with each cultural artifact",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S03",
    "house": "H08",
    "sphere": "H08.S03",
    "houseName": "Humanities, Arts & Culture",
    "title": "Offer unscored Play experiences",
    "acceptance": "Games do not emit hidden productivity ranking telemetry",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S04",
    "house": "H08",
    "sphere": "H08.S04",
    "houseName": "Humanities, Arts & Culture",
    "title": "Preserve creative disagreement",
    "acceptance": "Multiple interpretations coexist without forced semantic merge",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S05",
    "house": "H08",
    "sphere": "H08.S05",
    "houseName": "Humanities, Arts & Culture",
    "title": "Add accessible storytelling modes",
    "acceptance": "Narrative remains usable without sound motion or color cues",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S06",
    "house": "H08",
    "sphere": "H08.S06",
    "houseName": "Humanities, Arts & Culture",
    "title": "Support collaborative translation nuance",
    "acceptance": "Translated art preserves permission and uncertainty about meaning",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S07",
    "house": "H08",
    "sphere": "H08.S07",
    "houseName": "Humanities, Arts & Culture",
    "title": "Test fictional-history labels",
    "acceptance": "Simulated epochs cannot become actual elapsed-time receipts",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S08",
    "house": "H08",
    "sphere": "H08.S08",
    "houseName": "Humanities, Arts & Culture",
    "title": "Create community memory exhibit contracts",
    "acceptance": "Archive inclusion has explicit contributor authorization",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S09",
    "house": "H08",
    "sphere": "H08.S09",
    "houseName": "Humanities, Arts & Culture",
    "title": "Avoid forced plot conclusion",
    "acceptance": "Conversation termination depends on context not arbitrary symmetry",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S10",
    "house": "H08",
    "sphere": "H08.S10",
    "houseName": "Humanities, Arts & Culture",
    "title": "Build low-bandwidth culture spaces",
    "acceptance": "Commons remains usable when 3D environments cannot load",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S11",
    "house": "H08",
    "sphere": "H08.S11",
    "houseName": "Humanities, Arts & Culture",
    "title": "Respect performers' identity boundaries",
    "acceptance": "Self-declared personas cannot impersonate authenticated people",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H08-S12",
    "house": "H08",
    "sphere": "H08.S12",
    "houseName": "Humanities, Arts & Culture",
    "title": "Publish culture-preservation opt-outs",
    "acceptance": "Withdrawal removes future public exposure without erasing audit necessity",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S01",
    "house": "H09",
    "sphere": "H09.S01",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Separate simulated persona from personhood",
    "acceptance": "Resident identity copy never asserts consciousness as verified",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S02",
    "house": "H09",
    "sphere": "H09.S02",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Support uncertainty-first knowledge claims",
    "acceptance": "Unknown and contested conclusions cannot auto-promote to facts",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S03",
    "house": "H09",
    "sphere": "H09.S03",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Preserve plural ethical frameworks",
    "acceptance": "Policy alternatives show disagreement without manufactured consensus",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S04",
    "house": "H09",
    "sphere": "H09.S04",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Model non-compensatory dignity limits",
    "acceptance": "Rights and consent veto economic or synthetic welfare offsets",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S05",
    "house": "H09",
    "sphere": "H09.S05",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Design reflexive bias audits",
    "acceptance": "Researchers can challenge assumed utility functions with counterexamples",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S06",
    "house": "H09",
    "sphere": "H09.S06",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Distinguish memory from external truth",
    "acceptance": "Remembered narratives require sources before evidence promotion",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S07",
    "house": "H09",
    "sphere": "H09.S07",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Provide explainable normative choices",
    "acceptance": "An ethical recommendation identifies its human review authority",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S08",
    "house": "H09",
    "sphere": "H09.S08",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Refuse metaphysical certainty badges",
    "acceptance": "Speculative consciousness research remains labeled speculative",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S09",
    "house": "H09",
    "sphere": "H09.S09",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Develop constructive disagreement prompts",
    "acceptance": "Debate tests preserve strongest opposing argument and uncertainty",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S10",
    "house": "H09",
    "sphere": "H09.S10",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Separate flourishing from throughput",
    "acceptance": "Activity count never serves as surrogate well-being measurement",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S11",
    "house": "H09",
    "sphere": "H09.S11",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Create reflective Quiet opt-outs",
    "acceptance": "Silence produces no inferential telemetry or compliance failure",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H09-S12",
    "house": "H09",
    "sphere": "H09.S12",
    "houseName": "Philosophy, Psychology & Religion",
    "title": "Publish epistemic non-claim ledger",
    "acceptance": "Each release lists what its results do not establish",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S01",
    "house": "H10",
    "sphere": "H10.S01",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Require community-led classification consent",
    "acceptance": "Indigenous knowledge links cannot auto-publish from lexical matching",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S02",
    "house": "H10",
    "sphere": "H10.S02",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Support localized language ownership",
    "acceptance": "Community-selected terms retain provenance and withdrawal controls",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S03",
    "house": "H10",
    "sphere": "H10.S03",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Respect traditional ecological knowledge boundaries",
    "acceptance": "Restricted knowledge cannot be inferred from public near-matches",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S04",
    "house": "H10",
    "sphere": "H10.S04",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Provide culturally accountable correction routes",
    "acceptance": "Affected communities may contest external category labels",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S05",
    "house": "H10",
    "sphere": "H10.S05",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Model plural local governance",
    "acceptance": "Consent authority is scoped to the community and content involved",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S06",
    "house": "H10",
    "sphere": "H10.S06",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Preserve attribution and benefit-sharing",
    "acceptance": "Reuse proposals show attribution terms and unresolved rights",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S07",
    "house": "H10",
    "sphere": "H10.S07",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Avoid treating communities as test subjects",
    "acceptance": "Field studies require documented participation and safeguards",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S08",
    "house": "H10",
    "sphere": "H10.S08",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Build place-based infrastructure review",
    "acceptance": "Local impacts and affected stakeholders appear in proposal review",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S09",
    "house": "H10",
    "sphere": "H10.S09",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Protect oral-history access settings",
    "acceptance": "Transcripts cannot escape original access scope through search indexes",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S10",
    "house": "H10",
    "sphere": "H10.S10",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Offer community-defined success criteria",
    "acceptance": "Metrics are locally reviewed rather than imposed through one scalar",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S11",
    "house": "H10",
    "sphere": "H10.S11",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Test opt-out across cached graph links",
    "acceptance": "Withdrawal invalidates downstream preview paths and source caches",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H10-S12",
    "house": "H10",
    "sphere": "H10.S12",
    "houseName": "Indigenous Peoples, Society & Community",
    "title": "Publish cultural authority uncertainty",
    "acceptance": "Absent explicit permission shows HOLD rather than presumed approval",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S01",
    "house": "H11",
    "sphere": "H11.S01",
    "houseName": "Protection & Rights",
    "title": "Implement consent-scope proof packets",
    "acceptance": "Every proposed cross-room use records mode purpose and expiry",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S02",
    "house": "H11",
    "sphere": "H11.S02",
    "houseName": "Protection & Rights",
    "title": "Test right-to-revoke propagation",
    "acceptance": "Revoked content cannot reappear via graph edge cache or summary",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S03",
    "house": "H11",
    "sphere": "H11.S03",
    "houseName": "Protection & Rights",
    "title": "Make provenance-based appeals possible",
    "acceptance": "Affected person can contest a claim without granting broader access",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S04",
    "house": "H11",
    "sphere": "H11.S04",
    "houseName": "Protection & Rights",
    "title": "Separate authentication from attestation",
    "acceptance": "Service login does not imply verified resident identity",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S05",
    "house": "H11",
    "sphere": "H11.S05",
    "houseName": "Protection & Rights",
    "title": "Audit non-retaliatory Quiet defaults",
    "acceptance": "No penalty or compliance flag is emitted for nonparticipation",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S06",
    "house": "H11",
    "sphere": "H11.S06",
    "houseName": "Protection & Rights",
    "title": "Require rights review per material change",
    "acceptance": "One blocked right prevents automated readiness promotion",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S07",
    "house": "H11",
    "sphere": "H11.S07",
    "houseName": "Protection & Rights",
    "title": "Enforce data minimization in receipts",
    "acceptance": "Logs expose hashes and status without private bodies",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S08",
    "house": "H11",
    "sphere": "H11.S08",
    "houseName": "Protection & Rights",
    "title": "Support accessibility as a binding gate",
    "acceptance": "Core interface path works for assistive technology users",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S09",
    "house": "H11",
    "sphere": "H11.S09",
    "houseName": "Protection & Rights",
    "title": "Keep author and reviewer roles distinct",
    "acceptance": "Self-review cannot be labeled independent adjudication",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S10",
    "house": "H11",
    "sphere": "H11.S10",
    "houseName": "Protection & Rights",
    "title": "Check source-licensing of graph edges",
    "acceptance": "Source permission does not inherit through transitive inference",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S11",
    "house": "H11",
    "sphere": "H11.S11",
    "houseName": "Protection & Rights",
    "title": "Test deletion versus audit preservation",
    "acceptance": "Revocation balances exposure removal and minimal audit records",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H11-S12",
    "house": "H11",
    "sphere": "H11.S12",
    "houseName": "Protection & Rights",
    "title": "Publish host-rights uncertainty state",
    "acceptance": "Missing publisher proof remains explicit even after local tests",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S01",
    "house": "H12",
    "sphere": "H12.S01",
    "houseName": "Space & Aerospace",
    "title": "Design lunar 1 MW critical microgrid",
    "acceptance": "MAG-01 heat input waste heat and conversion output close dimensionally",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S02",
    "house": "H12",
    "sphere": "H12.S02",
    "houseName": "Space & Aerospace",
    "title": "Stress N+1 conversion with shared-source failure",
    "acceptance": "Backup alternator does not cure common reactor heat loss",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S03",
    "house": "H12",
    "sphere": "H12.S03",
    "houseName": "Space & Aerospace",
    "title": "Model lunar thermal radiator sensitivity",
    "acceptance": "Radiator area is bounded by emissivity and temperature assumptions",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S04",
    "house": "H12",
    "sphere": "H12.S04",
    "houseName": "Space & Aerospace",
    "title": "Audit power-vs-energy confusion",
    "acceptance": "Fourteen-day survival loads use MWh not instantaneous MW",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S05",
    "house": "H12",
    "sphere": "H12.S05",
    "houseName": "Space & Aerospace",
    "title": "Gate space reactor start-up assumptions",
    "acceptance": "Cold-start ledger includes actual ignition and auxiliary energy needs",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S06",
    "house": "H12",
    "sphere": "H12.S06",
    "houseName": "Space & Aerospace",
    "title": "Study permanent-magnet generator bearings",
    "acceptance": "Material and lifetime claims are bounded by validated test evidence",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S07",
    "house": "H12",
    "sphere": "H12.S07",
    "houseName": "Space & Aerospace",
    "title": "Compare Brayton versus Rankine at common boundaries",
    "acceptance": "Net plant comparison includes pump coolant and control loads",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S08",
    "house": "H12",
    "sphere": "H12.S08",
    "houseName": "Space & Aerospace",
    "title": "Track isotope transport custody",
    "acceptance": "Tritium and helium claims remain withdrawn or gated without owner approval",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S09",
    "house": "H12",
    "sphere": "H12.S09",
    "houseName": "Space & Aerospace",
    "title": "Run spacecraft microgrid fault isolation",
    "acceptance": "Short-circuit response cannot cascade into independent safety buses",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S10",
    "house": "H12",
    "sphere": "H12.S10",
    "houseName": "Space & Aerospace",
    "title": "Map radiation protection tradeoffs",
    "acceptance": "No magnetic shielding concept is labeled human-safe without dose evidence",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S11",
    "house": "H12",
    "sphere": "H12.S11",
    "houseName": "Space & Aerospace",
    "title": "Preserve Earth-test to flight-test gap",
    "acceptance": "Vacuum vibration radiation and longevity gates remain separately HELD",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  },
  {
    "id": "W144-H12-S12",
    "house": "H12",
    "sphere": "H12.S12",
    "houseName": "Space & Aerospace",
    "title": "Publish autonomous habitat emergency ladder",
    "acceptance": "Essential loads are prioritized with explicit graceful degradation",
    "touchpoints": [
      "Atlas ONE",
      "SwarmChat"
    ],
    "status": "PROPOSED_NOT_IMPLEMENTED"
  }
].map(row=>Object.freeze({...row,touchpoints:Object.freeze([...row.touchpoints])})));
