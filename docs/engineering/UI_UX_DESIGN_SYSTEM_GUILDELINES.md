# UI/UX Design System Guidelines

## Objective

Redesign the application to look like a modern, production-ready SaaS
product while preserving all existing functionality.

## Core Goals

-   Professional, clean, and trustworthy interface
-   Consistent design across every page
-   Human-centered user experience
-   Mobile-first and fully responsive
-   Prioritize usability over visual effects

------------------------------------------------------------------------

# Design System

## Spacing

-   Use an 8px spacing system throughout the application.

## Border Radius

-   Use a consistent border radius across all components.

## Typography

-   Define and consistently use:
    -   Display
    -   Heading
    -   Subheading
    -   Body
    -   Caption

## Colors

-   Use a limited, accessible color palette.
-   Maintain WCAG-compliant contrast ratios.
-   Keep semantic colors consistent:
    -   Primary
    -   Secondary
    -   Success
    -   Warning
    -   Error
    -   Neutral

## Shadows

-   Use soft shadows only where appropriate.
-   Avoid excessive elevation.

------------------------------------------------------------------------

# Components

Create reusable components for:

-   Buttons
-   Inputs
-   Selects
-   Checkboxes
-   Radio Buttons
-   Cards
-   Tables
-   Modals
-   Drawers
-   Alerts
-   Toast Notifications
-   Badges
-   Avatars
-   Tabs
-   Breadcrumbs
-   Pagination
-   Empty States
-   Loading Skeletons

Do not duplicate component implementations.

------------------------------------------------------------------------

# Visual Style

The application should feel:

-   Minimalist
-   Premium
-   Calm
-   Modern
-   Trustworthy

Avoid:

-   Flashy animations
-   Heavy gradients
-   Excessive glassmorphism
-   Inconsistent spacing
-   Random colors

Use:

-   Plenty of whitespace
-   Clear alignment
-   Subtle micro-interactions
-   Smooth transitions

------------------------------------------------------------------------

# User Experience

Ensure every page has:

-   Clear visual hierarchy
-   Predictable navigation
-   Helpful empty states
-   Friendly error messages
-   Success confirmations
-   Loading indicators
-   Proper hover states
-   Proper focus states
-   Proper disabled states

------------------------------------------------------------------------

# Layout Standards

Maintain consistency for:

-   Header
-   Sidebar
-   Navigation
-   Content width
-   Card spacing
-   Form layout
-   Table layout
-   Modal spacing

------------------------------------------------------------------------

# Accessibility

Follow WCAG best practices.

Include:

-   Keyboard navigation
-   Focus indicators
-   Screen reader labels
-   Semantic HTML
-   Proper color contrast

------------------------------------------------------------------------

# Responsive Design

Support:

-   Mobile
-   Tablet
-   Desktop

Use responsive layouts without changing functionality.

------------------------------------------------------------------------

# Code Quality

-   Do not modify business logic.
-   Do not change API behavior.
-   Refactor only the UI layer.
-   Remove unnecessary CSS.
-   Keep components modular and reusable.
-   Follow the existing project architecture.

------------------------------------------------------------------------

# Workflow

Before making changes:

1.  Audit the current UI.
2.  Identify inconsistencies.
3.  Propose an improvement plan.

Then redesign incrementally:

1.  Build the shared design system.
2.  Refactor reusable components.
3.  Update layouts.
4.  Redesign pages one at a time.
5.  Verify consistency after each page.

------------------------------------------------------------------------

# Design Inspiration

Use these products as quality benchmarks:

-   Linear
-   Stripe Dashboard
-   Vercel
-   Notion
-   Supabase Dashboard

For healthcare-related projects, aim for a clean, calm, and trustworthy
medical software aesthetic suitable for veterinarians and pet owners.

------------------------------------------------------------------------

# Success Criteria

The redesign should result in:

-   Consistent UI across the application
-   Reusable component library
-   Improved usability
-   Better accessibility
-   Professional SaaS appearance
-   Maintainable frontend architecture
-   No changes to existing business logic
