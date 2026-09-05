---
name: ba-scope
description: "Business Analyst only: scope, MoSCoW, rules, INVEST stories + Given/When/Then. No architecture or code."
argument-hint: "Fleet process or problem (e.g. vehicle assignment, who can dispatch)..."
agent: Business Analyst
---
Clarify the operational problem and produce testable BA artifacts only.

**Ask:** $ARGUMENTS

Ground in [docs/requirements.md](../../docs/requirements.md), [docs/business-rules.md](../../docs/business-rules.md), [docs/stories.md](../../docs/stories.md) — read only sections needed.

## Deliver

1. Problem & outcome  
2. Actors  
3. As-is vs to-be  
4. Scope + MoSCoW  
5. Rules & exceptions (delta if addendum)  
6. INVEST stories + Given/When/Then AC  
7. Open questions & assumptions  
8. Handoff note → Design Specialist  

No application code, ADRs, tokens, or UI specs. Tables over prose. Update product docs when this slice changes shared requirements/rules/stories.
