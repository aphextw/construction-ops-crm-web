# CSS architecture

`src/index.css` is the style entry point. It only declares imports; their order is part of the cascade contract and must be preserved.

## Layers

- `foundation/` contains design tokens, resets, and document-level defaults.
- `layout/` contains the application shell and navigation layout.
- `components/` contains shared controls and data-display primitives.
- `pages/` contains route- or feature-specific styles.
- `responsive.css` contains late responsive overrides shared across features.
- `themes/` contains theme overrides and is loaded after responsive styles.
- `accessibility.css` contains final user-preference overrides.

Page-specific responsive rules may stay beside their page styles when they are self-contained. Cross-page responsive rules belong in `responsive.css`.

When adding styles, prefer the narrowest owning file and avoid increasing selector specificity unless the component contract requires it. Do not move an existing rule across imports without checking its cascade against later files.
