# Simplified Pricing: Free + Paid ($79/mo)

## Context

The 3-tier pricing (Starter $199, Pro $349, Growth $499) created unnecessary decision friction — users had to evaluate metro counts and trade limits. The codebase already treated access as binary (`isPaid`), so the tiers were marketing copy only.

## Design

**Free (forever):** Browse & search all permits, filter by trade/value/status, save up to 5 permits. GC contacts locked.

**Paid ($79/mo):** Everything in Free + full GC contact info, unlimited saved permits, CSV export, weekly email digest. 7-day free trial with no credit card.

**Philosophy:** 80% of users find free sufficient. 20% who need to reach GCs will pay. Volume at $79 beats fewer users at $199+.

## Changes

- Plan type: `"free" | "paid"` (drop starter/pro/growth)
- `FREE_LIMIT`: 15 → 5 saved permits
- Pricing page: side-by-side Free vs Paid comparison
- Stripe: single `STRIPE_PAID_PRICE_ID` env var
- Webhook: any active subscription → `"paid"`
- Dashboard: simplified plan labels and dev mode toggle
- Backwards compat: old plan values (starter/pro/growth) map to `isPaid = true`
