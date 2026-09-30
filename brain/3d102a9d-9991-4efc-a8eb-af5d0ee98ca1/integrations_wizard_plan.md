# Implementation Plan: Google Integrations Multi-Step Wizard

## Goal Description
Implement a guided 3-step wizard for Google Integrations that exactly matches the provided high-fidelity enterprise designs (Step 1: Connect, Step 2: Select Resources, Step 3: Review & Sync). The implementation will restructure the UI into atomic components while strictly reusing existing backend logic, mapping APIs, and authorization rules.

## Proposed Component Architecture

The current monolithic `integrations-manager.tsx` (1700+ lines) will be refactored into a modular architecture inside `src/features/integrations/components/`:
- `integrations-manager.tsx` (Orchestrator, manages `activeStep`, draft state, and API orchestration)
- `google-integration-stepper.tsx` (Top horizontal progress bar)
- `google-product-icon.tsx` (Reusable product icons)
- `steps/connect-google-step.tsx` (View for Step 1)
- `steps/select-google-resources-step.tsx` (View for Step 2)
- `steps/review-google-resources-step.tsx` (View for Step 3)
- `resource-selection/google-account-card.tsx` (Displays connected email)
- `resource-selection/resource-section.tsx` (Grouping wrapper)
- `resource-selection/resource-row.tsx` (Individual checkbox row)
- `resource-selection/selection-summary.tsx` (Right sidebar)

## Data & State Management

**1. Draft State Concept:**
Changes in Step 2 will NOT trigger API calls. `integrations-manager` will hold a draft state:
```typescript
type ResourceSelection = {
  resourceType: 'GSC' | 'GBP' | 'GA4';
  externalResourceId: string;
  selected: boolean;
  target: { brandId: string; locationId?: string };
};
```
This state will be initialized from `initialState.internalMappings`.

**2. Mapping Validation:**
Before navigating from Step 2 to Step 3, the wizard will validate that:
- All selected GBP resources have a selected `locationId` mapped (a dropdown will be provided inline if necessary, defaulting to a location if only 1 exists).
- GA4 and GSC map to the current brand.

**3. Final Confirmation (Diffing & Syncing):**
In Step 3, clicking "Connect & Start Syncing" will trigger:
1. Calculation of additions (selected but not currently mapped) and removals (unselected but currently mapped).
2. Orchestration of existing single-map APIs via `Promise.allSettled`:
   - `POST /tenants/[slug]/integrations/google/mappings` for additions.
   - `DELETE /tenants/[slug]/integrations/google/mappings?mappingId=...` for removals.
3. Call `POST /tenants/[slug]/sync` to begin background sync.
4. Call `router.refresh()` to invalidate Next.js RSC payload and render success state.

## Open Questions & Verification
- **API Orchestration:** Because there is no bulk map endpoint, I will use `Promise.allSettled` for concurrent `POST`/`DELETE` calls. This avoids backend changes and strictly complies with the requirement to orchestrate existing APIs safely.
- **Testing:** I will manually verify empty states, partial discoveries, mapping diff correctness, and ensure no data leakage across brands.
