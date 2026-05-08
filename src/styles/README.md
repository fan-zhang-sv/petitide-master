# Stylesheet Architecture

`src/index.css` is the only global stylesheet loaded by React. Keep it limited to tokens, element resets, shared keyframes, and accessibility overrides.

`src/styles/app.module.css` is the CSS Modules manifest imported by React components. It composes the ordered modules in `src/styles/app/`, so component code receives scoped class names while the stylesheet remains split into smaller files.

Use these folders for new styles:

- `base/`: design tokens, element defaults, animations, and global accessibility rules.
- `app/`: scoped application UI modules, ordered from broad layout and shared surfaces toward feature-specific refinements.

Keep module filenames prefixed with a two-digit order when a selector depends on cascade order. Component code should import `styles` from `src/styles/app.module.css` and use `cx(...)` for composed or stateful classes.

Reusable UI should be expressed through `src/components/ui/` before adding feature-local markup. Shared primitives own the class mappings for buttons, headers, cards, badges, menu rows, screens, sub-views, and footers.

Use `src/styles/breakpoints.ts` for TypeScript-side responsive constants so JS media queries stay aligned with the CSS breakpoints.
