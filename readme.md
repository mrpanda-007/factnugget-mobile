# 🦕 Kids Discovery

An offline-first educational discovery app for children aged **5–8 years**, designed to encourage curiosity through beautifully illustrated discovery cards, collectible stickers, and bite-sized learning experiences.

The app delivers a premium, distraction-free experience with **no ads**, **no infinite scrolling**, and **no manipulative engagement mechanics**. Every learning session has a clear beginning and end, helping children explore the world at their own pace.

---

# Vision

Kids Discovery helps children develop a lifelong love of learning by making exploration fun, visual, and rewarding.

Instead of endless videos or feeds, children complete themed discovery decks covering topics such as:

- 🦖 Dinosaurs
- 🚂 Trains
- 🌊 Oceans
- 🏜️ Deserts
- 🏛️ Monuments

Each discovery is presented as a single beautifully illustrated card with age-appropriate educational content.

---

# Core Principles

- Offline-first
- Safe for children
- No advertisements
- No infinite scrolling
- Parent-friendly
- Premium quality UI/UX
- Beautiful animations
- Simple, visual navigation
- Accessibility-first
- Cross-platform (iOS & Android)

---

# Technology Stack

## Mobile

- React Native
- Expo
- TypeScript

## UI

- NativeWind
- React Native Reanimated
- React Native Gesture Handler
- Lottie

## Backend

- Firebase Authentication
- Firestore
- Firebase Cloud Messaging
- Firebase Analytics
- Firebase Crashlytics

## Content Platform

- Sanity CMS

## Local Storage

- Expo SQLite
- Device File System for offline assets

---

# Architecture

The application follows an **offline-first, content-driven architecture**.

```
Sanity CMS
        │
        ▼
Content Service
        │
        ▼
SQLite + Local Asset Cache
        │
        ▼
Application UI

Firebase
        │
        ▼
Authentication
Progress
Collections
Purchases
Notifications
Analytics
```

Educational content is managed independently from user data.

---

# Project Structure

```
docs/
    implementation/
    ui/
    product/

app/

features/

components/

services/

repositories/

database/

navigation/

store/

assets/

tests/
```

---

# Documentation

The project is driven by documentation.

Implementation specifications are located in:

```
docs/implementation/
```

These documents define:

- Architecture
- Tech Stack
- Firebase
- Sanity CMS
- UI Specifications
- Coding Standards
- Offline Engine
- Purchases
- Performance
- Animation Guidelines

---

# Development Workflow

1. Product Planning
2. Architecture
3. UI Design
4. Content Creation
5. CMS Setup
6. Mobile Development
7. Testing
8. App Store Release

Development progress is tracked separately using the project roadmap.

---

# AI-Assisted Development

This project is developed with assistance from AI tools, including Claude Code.

To ensure consistency:

- Always follow the implementation documents under `docs/implementation/`.
- Treat those documents as the single source of truth for architecture and technical decisions.
- Do not infer implementation details from planning notes or roadmap documents.

---

# Current MVP

The initial release includes:

- 5 Discovery Categories
- 20 Discoveries per Category
- 100 Educational Discovery Cards
- Sticker Collection System
- Parent Dashboard
- Offline Support
- Child Profiles
- Premium-Ready Purchase Architecture

---

# Future Features

- AI-generated educational content
- Professional narration
- Interactive quizzes
- Multiple languages
- Additional discovery packs
- Seasonal content
- Learning analytics
- Enhanced parent insights

---

# Contributing

This repository is currently maintained as a solo-founder project.

Contributions are not being accepted at this stage.

---

# License

This project is proprietary.

All source code, artwork, educational content, and related assets are confidential and may not be copied, distributed, or reused without written permission from the project owner.