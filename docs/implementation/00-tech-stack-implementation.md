# Tech Stack & Architecture Implementation Specification

## Purpose

This document defines the complete technical architecture, coding standards, project structure, and implementation requirements for the Kids Discovery application.

This document is the source of truth for every implementation decision.

Claude Code **must always follow this document** before writing any code.

---

# Project Goal

Build a premium cross-platform mobile application for children aged **5–8 years** that feels native on both iOS and Android while sharing a single TypeScript codebase.

The application must prioritize:

- Excellent performance
- Smooth animations
- Offline-first architecture
- Simple maintenance
- Scalability
- Beautiful UI
- Clean architecture

The application should be maintainable by a solo developer.

---

# Core Principles

The application should always be:

- Fast
- Offline-first
- Component-driven
- Type-safe
- Modular
- Testable
- Accessible
- Easy to extend

Avoid unnecessary abstraction.

Avoid overengineering.

Prefer readability over cleverness.

---

# Technology Stack

## Mobile

React Native

Expo

TypeScript

Latest stable versions.

---

## Styling

NativeWind

Tailwind CSS

Design tokens must be used.

No inline colors.

No hardcoded spacing.

---

## Animations

React Native Reanimated

Gesture Handler

Lottie

Use native animations whenever possible.

Avoid unnecessary animation libraries.

---

## Navigation

React Navigation

Bottom Tabs

Native Stack Navigation

Typed navigation only.

---

## State Management

Zustand

Purpose:

- Theme
- Child selection
- Active deck
- Current discovery
- Purchase state
- UI state

Avoid Redux.

---

## Server State

TanStack Query

Used only for:

- Firebase requests
- Content updates
- Purchase synchronization

Never duplicate server state into Zustand.

---

## Local Storage

Expo SQLite

Purpose:

Downloaded discoveries

Categories

Progress cache

Settings cache

Collections

Offline support

The application must remain usable without internet.

---

# Backend

Firebase

Use only:

Authentication

Firestore

Cloud Messaging

Analytics

Crashlytics

Storage (future)

Cloud Functions (future)

---

# Authentication

Firebase Authentication

Support:

Anonymous users

Email

Google

Apple

Anonymous users must be able to convert into registered accounts without losing progress.

---

# Firestore

Store only user-specific information.

Examples:

Users

Children

Collections

Progress

Purchases

Settings

Notifications

Analytics metadata

Educational content must never live inside Firestore.

---

# Content Management System (CMS)

Educational content is managed using **Sanity CMS**. The mobile application must **never hardcode educational content** into the source code except for placeholder/mock data used during development.

Sanity is the single source of truth for all educational content.

---

## Responsibilities of Sanity

Sanity manages all content that can change without requiring an app update.

This includes:

- Categories
- Decks
- Discoveries
- Discovery Images
- Discovery Metadata
- Difficulty Variants
- Future Narration
- Future Quizzes
- Expansion Packs
- Category Ordering
- Featured Content
- Content Versioning
- Publishing Workflow

Sanity must **not** store user-specific information such as progress, purchases, child profiles, or settings.


---

# Images

All educational images are managed through **Sanity CMS**.

The application must not bundle educational content images inside the application binary.

Images should be uploaded, optimized, and versioned within Sanity.

---

# Audio

Not implemented in MVP.

Prepare architecture.

Each discovery should include:

audioUrl

duration

transcript

nullable until narration exists.

---

# Purchases

Use native platform purchases.

iOS

StoreKit 2

Android

Google Play Billing

Support:

Base App

Discovery Packs

Category Expansions

Restore Purchases

Feature flags for launch pricing.

---

# Push Notifications

Firebase Cloud Messaging

Two notification channels.

Child reminders.

Parent progress.

Notifications should always be configurable.

---

# Offline Support

The application should launch and operate without internet.

Content

Images

Collections

Progress

must all work offline.

Synchronization happens automatically when internet returns.

---

# Feature Structure

Every feature should contain:

components/

hooks/

types/

services/

constants/

screens/

utils/

Avoid large shared folders.

Keep code close to where it is used.

Do not write any test cases

---

# Components

Reusable components only.

Examples:

Button

Card

ProgressBar

DiscoveryCard

Sticker

Avatar

CategoryCard

Badge

SectionHeader

Never duplicate UI.

---

# Theme

Use Design Tokens.

Tokens include:

Primary colors

Spacing

Radius

Typography

Elevation

Animation durations

Never hardcode values.

---

# TypeScript

Strict mode enabled.

No "any".

Use interfaces for models.

Shared types live inside /types.

---

# Error Handling

Every Firebase request must:

Handle loading.

Handle failure.

Handle retry.

Display friendly UI.

Never crash.

---

# Performance

Target:

60 FPS

Lazy load heavy screens.

Memoize expensive components.

Avoid unnecessary renders.

Use FlatList for large collections.

Optimize images.

---

# Accessibility

Large touch targets.

VoiceOver compatible.

Dynamic font support.

Readable contrast.

Screen reader labels.

---

# Analytics

Track only meaningful events.

Examples:

Discovery Completed

Deck Finished

Sticker Earned

Expansion Purchased

Category Viewed

Do not collect unnecessary child personal information.

---

# Security

Firestore Rules

Authentication Rules

Environment variables

No secrets inside source code.

Use App Check when moving to production.

---

# Build Process

Claude should implement features in vertical slices.

Never scaffold the entire application first.

Each phase must produce a working application.

---

# Coding Standards

Prefer composition over inheritance.

Keep files under approximately 300 lines where practical.

Separate UI from business logic.

Separate business logic from Firebase.

Prefer pure functions.

Document public utilities.

---

# Testing

Critical purchase flows must always be tested.

---

# Definition of Done

A feature is complete only if:

UI implemented

Animations complete

Offline supported

Responsive

Accessibility checked

Types added

Tests written

No lint errors

No TypeScript errors

Documentation updated

---

# AI Rules

Claude Code must:

Never invent architecture.

Never introduce unnecessary libraries.

Never replace existing patterns.

Always reuse existing components.

Always follow this specification.

If an implementation conflicts with this document, this document takes precedence.

When uncertain, ask for clarification rather than making assumptions.
