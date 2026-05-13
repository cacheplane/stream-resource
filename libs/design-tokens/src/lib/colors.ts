/**
 * @deprecated Re-exported from `baseTokens.brand` for backwards compatibility
 * with existing consumers. New code should import from `baseTokens` directly.
 *
 * Theme-variant color tokens live in `lightOverrides` / `darkOverrides` and
 * are resolved at runtime via `cssVars(theme)` in @ngaf/ui-react.
 */
import { baseTokens } from './base';

export const colors = baseTokens.brand;
export type Colors = typeof colors;
