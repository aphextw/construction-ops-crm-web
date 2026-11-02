---
name: motion-react
description: Use when adding or reviewing animation and interaction motion in this React application. Choose CSS for simple effects and Motion for stateful, layout, exit, gesture, spring, or scroll-linked animation.
metadata:
  source: https://motion.dev/docs/react-app-builders
---

# Motion for React

Apply motion only when it improves feedback, continuity, or comprehension.

## Choose the lightest suitable tool

- Use CSS transitions for hover, focus, and press states.
- Use CSS keyframes for simple mount fades, spinners, skeletons, and shimmer.
- Use `AnimatePresence` when an element must animate out after React removes it.
- Use Motion `layout` for reordering, resizing, and expanding UI.
- Use `layoutId` when an element visually moves between two locations.
- Use Motion for height-to-`auto`, drag, swipe, reorder, interruptible springs, and gestures.
- Prefer CSS scroll-driven animation when supported by every target browser; otherwise use Motion `useScroll`.

## React rules

- Use the `motion` package and import from `motion/react`; do not introduce the old `framer-motion` package name.
- Wrap the application in `<MotionConfig reducedMotion="user">` before introducing Motion components.
- Preserve keyboard behavior and usable static states when motion is reduced or unavailable.
- Do not import Motion+ components such as `Carousel`, `Ticker`, or `AnimateNumber` unless `motion-plus` is already installed.
- Do not add the library for effects that CSS can express clearly.

## Product direction

This is an operational CRM interface. Keep movement short, restrained, and informative. Avoid decorative scroll reveals, elastic entrances, and animation that delays repeated work.
