# Unified Architecture & Integration Plan
**Scope:** Integration of `aluminum-os`, `aluminum-os-v3`, `sheldongemini-GPI`, `sheldonbrain-rag-api`, and `noosphere-defense` into Element 145 / ATLAS.

## 1. Executive Summary

This document represents the unified architecture resulting from the comprehensive codebase integration. Rather than operating 5 isolated repositories with conflicting schemas, **this repository (Element 145 / ATLAS)** acts as the Sovereign Unified Control Plane. 

It implements the **Lattice Context Protocol (LCP)** to normalize all systems exclusively onto the **12×12+1 Lattice Ontology**, discarding the legacy Grokbrain v4 academic categories and bridging the Five-Ring runtime directly into Element 145.

## 2. Integrated Architecture: The 12×12+1 Substrate

All previous "Rings" are now subsystems coordinated under the Element 145 Synthesis Layer.

| Legacy v3 Ring | Element 145 Subsystem Mapping | Integration Status |
|----------------|-------------------------------|--------------------|
| **Ring 0: Forge Core** | Infrastructure Layer | Migrated. Handled by Server/Vite and Firebase Init. |
| **Ring 1: Manus Core** | Routing & Orchestration (LCP) | Active. `server.ts` LLM proxy handles cross-provider routing and budget. |
| **Ring 2: Sheldonbrain**| Three-Tier Memory | Active. `firestore.rules` enforces core immutability. Vector components migrate to Lattice metadata tags (`houseId`, `sphereId`). |
| **Ring 3: Pantheon Council**| Governance Layer | Active. Token-gated canonical commits (`convenorTokenId`) provide BFT constraints. |
| **Ring 4: Noosphere** | Intent Engine / LCP Gateway | Active. Intent routing translates directly into `INGEST` operations to query the lattice. |

## 3. Implementation of the Lattice Context Protocol (LCP)

The integration relies on dropping all legacy keyword simulations and implementing standard LCP capabilities across the ecosystem:

1. **INGEST (Classify input → Spheres):** Replaces old vector matching and static keywords. Every incoming request is tagged with an `[H{id}.S{id}]` index.
2. **ACTIVATE (Load Sphere context):** Long-term memories (whether in Firebase or Pinecone) are queried explicitly by their Lattice House/Sphere tags, dropping the cross-schema translation.
3. **ROUTE (Cross-domain analysis):** The Agent task dispatcher automatically queries adjacent Houses based on graph topology, replacing static complexity tiers.
4. **SYNTHESIZE (Element 145 Coordination):** Acts as the meta-layer. Evaluates outputs from activated Sphere agents, runs adversarial council review, and flags emerging blind spots for the 12 House Agents.

## 4. Priority Executions (Completed & Active)

*   **Priority 1: Ontology Migration:** Memory schemas updated to support `houseId` and `sphereId`. All memories now sit directly on the 12×12+1 grid. Core schema definitions localized securely in Firebase.
*   **Priority 2: API Consolidation:** Express proxy `/api/llm/generate` takes over the previous fragmentation of external provider calls. Normalization rules explicitly handle multiple provider responses.
*   **Priority 3: Lattice-Aware Routing:** The `spawnHouseAgents` logic explicitly utilizes the 12-House topology for independent autonomous agent generation rather than using simulated heuristics.
*   **Priority 4: Synthesis Generation:** Element 145 acts as the final reduction layer. Council roles (SYNTHESIZER, AUDITOR) are validated explicitly via Firestore security enums and system prompts.
