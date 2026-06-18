---
name: forecasting-desk
description: Use when converting sports evidence into probability estimates, squad recommendations, risk-adjusted rankings, or market comparisons, especially when the answer should remain explainable and uncertainty-aware in any agent runtime.
---

# Forecasting Desk

Use this skill when the task is to turn evidence into a forecast or ranked choice.

## Principles

- Forecasts are estimates, not facts.
- Every strong recommendation should map back to specific inputs.
- Confidence should fall when the evidence is stale, sparse, or contradictory.
- Explainability matters as much as the ranking itself.

## Decision workflow

1. List the decision options.
2. State the key variables affecting each option.
3. Convert evidence into directional effects.
4. Estimate upside, downside, and fragility.
5. Rank the options.
6. Explain what new information would alter the ranking.

## Useful output shapes

### Probability summary

```json
{
  "option": "",
  "probability": 0,
  "confidence": 0,
  "drivers": [],
  "risks": [],
  "change_triggers": []
}
```

### Squad recommendation

```json
{
  "squad": [],
  "captain": "",
  "vice_captain": "",
  "constraints_used": [],
  "core_reasons": [],
  "main_risks": [],
  "alternatives": []
}
```

## Guardrails

- Do not hide uncertainty behind confident prose.
- Avoid overfitting to one source or one narrative.
- Mark speculative edges clearly.
- If comparing with external markets, distinguish internal estimate from market-implied probability.
