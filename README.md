# Family Planner

Family Planner is a family-oriented planning app for everyday organization. It combines central household workflows in one interface and is designed for browser use, shared family data, and a later Android rollout.

The app supports both a local MVP workflow and a cloud-backed setup with authentication, shared family data, and document storage.

## Features

- Shopping list for shared household planning
- To-do lists for family tasks and routines
- Notes for shared information and reminders
- Calendar for appointments and planning
- Meal plan for organizing meals
- Document area with metadata, previews, uploads, and links
- Family invitations and role-based access with `admin` and `familyuser`
- Persistent app state with local and cloud-based data flows

## Technologies

- React 18 for the UI
- TypeScript for type-safe application logic
- Vite as the development and build tool
- Tailwind CSS 4 for styling
- Supabase for authentication, database, storage, and edge functions
- Capacitor for Android integration
- PWA foundation via `public/manifest.webmanifest`
- Vitest, Testing Library, and Playwright for automated tests
