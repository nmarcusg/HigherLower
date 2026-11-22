/**
 * `@types/react@19` declares the `<ViewTransition>` component only in its
 * canary surface (`react/canary`), not in the default entry point. The App
 * Router ships React canary at runtime, so the component resolves at runtime
 * but not at build time without this reference.
 *
 * Load the canary types so `import { ViewTransition } from "react"` type-checks.
 */
/// <reference types="react/canary" />
