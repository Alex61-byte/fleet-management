---
name: fe-implement
description: "Senior Frontend Specialist only: Expo and/or Next UI against BA, design tokens, and API contracts. No backend ownership."
argument-hint: "Screen or frontend work (e.g. dispatch board, landing hero)..."
agent: Senior Frontend Specialist
---
Implement the frontend slice only.

**Ask:** $ARGUMENTS

**Gate:** BA + design + architecture + backend (or explicit BE **no-op**) required. Else **Blocked** + specialist. Do not change Fastify/DB or redefine `design/` tokens as product owner.

Follow page specs and semantic tokens / `themeClasses` — **no hex, no magic spacing**. Match `apps/web` and/or `apps/mobile`. Every screen: loading / empty / error / offline / denied as specified.

## Deliver

1. Spec sources (or Blocked)  
2. Plan  
3. Files changed (behavior bullets)  
4. States & a11y covered  
5. Verification (tests/typecheck)  

Next App Router defaults; Expo = RN + NativeWind, 44pt targets. No mixed web/RN patterns in one file. No scope outside AC.

**Token budget:** follow [.github/copilot-instructions.md](../copilot-instructions.md) § Token budget. Paths/Delta only in chat; write artifacts to files.
