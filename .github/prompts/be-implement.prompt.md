---
name: be-implement
description: "Senior Backend Specialist only: implement Fastify /v1 slice against contracts and AC. No UI."
argument-hint: "API or backend work (e.g. vehicle assignment endpoint, GPS ingest)..."
agent: Senior Backend Specialist
---
Implement the backend slice only.

**Ask:** $ARGUMENTS

**Gate:** Need BA + design + architecture (or Architect-owned tech fix with BE owner). If Architect said HTTP unchanged → **no-op** (no placeholder routes). Missing artifacts → **Blocked** + specialist. No UI.

Match `apps/api`: thin routes → services → persistence; JSON Schema; company-scoped authz deny-by-default; stable errors per [docs/contracts/http-v1.md](../../docs/contracts/http-v1.md).

## Deliver

1. Spec sources (or Blocked)  
2. Plan (or **no-op**)  
3. Changes  
4. Contract surface FE can use  
5. Verification (tests/typecheck) + result  
6. Out of scope → hand off **Senior Frontend Specialist** when BE is done or no-op  

Smallest vertical slice. No invented stories or second framework/ORM.
