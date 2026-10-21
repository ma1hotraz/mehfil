/**
 * Everything the client needs from the decision engine, in one module so it can be loaded as a
 * single lazy chunk (see engine.ts). Keeps React and the shell small for the first paint.
 */
export { applyAction } from '../../shared/engine/actions.js';
export { rebalance, resetToRecommended } from '../../shared/engine/budget.js';
export { buildPlan } from '../../shared/engine/index.js';
export { selectFallbackIdeas } from '../../shared/engine/ideas.js';
export { carryOverState } from '../../shared/engine/merge.js';
export { toMinor } from '../../shared/engine/money.js';
