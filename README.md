# Family Planner

A first MVP for a family-friendly planner app that runs in the browser, stores data locally, and is prepared for Supabase and Android via Capacitor.

## Included Areas

- Shopping list
- To-do lists
- Notes
- Calendar
- Meal plan
- Documents
- Role model with `admin` and `familyuser`

## Tech Stack

- Vite
- React
- TypeScript
- PWA foundation with `manifest.webmanifest`
- Local Storage for immediate persistence
- Supabase client prepared for auth, sync, and family sharing
- Capacitor configuration for Android

## Current Status

The app now stores its state persistently in Local Storage. In addition, Supabase and Capacitor are prepared so you can extend it with real user accounts, family sharing, and an Android app. All planner modules now run through Supabase for signed-in users. Built-in mock data has been removed, and new accounts start empty.

## Storage Recommendation

- Short term: Local Storage is perfect for rapid prototyping and offline MVPs.
- Medium term: Supabase is the right choice for multiple users, family sharing, and device synchronization.
- Recommendation for this project: Keep Local Storage for the current stage and then extend to Supabase for user accounts and shared data.

## Security with Supabase

- Supabase is sufficiently secure for this use case if you enable Row Level Security.
- The `anon key` is not secret. Security comes from authentication, policies, and clean data modeling.
- In new Supabase projects, you can use the `publishable key` directly instead of the old `anon key`.
- Role model in this project: `admin` and `familyuser`.
- Example tables and initial policies are in `supabase/schema.sql`.

## Set Up Supabase

1. Copy `.env.example` to `.env`.
2. Enter `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Run the SQL from `supabase/schema.sql` in the Supabase SQL Editor.
4. Then enable auth and data synchronization in the frontend.

## Auth Flow

- Email and password sign-up is built into the frontend.
- After the first sign-in, a profile entry is created automatically in `profiles`.
- If no family exists yet, the app leads the user through onboarding and creates a new family.
- The first user of that family automatically becomes `admin`.
- Additional users are later handled through shared cloud tables and invitation logic.

## First Cloud Modules

- Shopping, to-dos, notes, calendar, meal plan, and documents are loaded from Supabase for authenticated family members.
- New shopping items, tasks, notes, appointments, meals, and documents are stored directly in Supabase.
- Documents can optionally contain a link to an external file or shared resource.
- Documents can also be uploaded directly as files to Supabase Storage, for example as a PDF or photo.
- Documents now also support Word files, multi-upload, drag and drop, image previews, and deletion including the storage file.
- The document view provides search, filtering, and sorting, metadata editing, and an in-app preview for images and PDFs.
- Status changes in shopping, to-dos, and the meal plan are updated directly in Supabase.
- Important: After extending the schema, you must rerun the current SQL from `supabase/schema.sql` in Supabase.

## Family Invitations

- Admins can create email invitations for additional family members.
- After the invite is created, the app calls the Supabase Edge Function `send-family-invite` to send a real invitation email.
- If a user signs up or signs in with the same email address, the invitation is accepted automatically during login.
- For existing Supabase projects, also run `supabase/add-family-invites.sql`.
- For existing Supabase projects with document uploads, also run `supabase/add-document-uploads.sql`. The current script now also includes the update policy for editable document metadata.

### Configure Invite Emails

1. Deploy the Edge Function:
   `supabase functions deploy send-family-invite`
2. Set the required secrets in Supabase:
   `supabase secrets set RESEND_API_KEY=... FAMILY_INVITE_FROM_EMAIL=frey frey <noreply@your-domain.tld> INVITE_APP_URL=https://your-app-url`
3. Use a verified sender address in Resend.
4. After that, new family invitations are stored in Supabase and sent by email.

## Supabase Troubleshooting

- If Supabase reports `infinite recursion detected in policy for relation "family_members"`, run the SQL from `supabase/fix-family-members-recursion.sql` in the SQL Editor for existing projects.
- The cause was a recursive RLS check on `family_members`. The fix script replaces those checks with safe helper functions.

## Roles

- `admin`: can create and manage the family.
- `familyuser`: works with the daily content.

## Test the Auth Setup

1. In Supabase, enable the email provider under Authentication.
2. Optionally configure email confirmation.
3. Start the app and register a new user.
4. Create the family after login.
5. The protected app view is then available.

## CI

A GitHub Actions pipeline is located at `.github/workflows/ci.yml` and runs the following for pushes and pull requests:

1. `npm run build`
2. `npm run test:unit`
3. `npm run test:e2e`

## Android with Capacitor

After a successful web build:

```bash
npm run build
npm run cap:sync
npm run cap:android
```

Note: You need Android Studio for the last step.

## Run

Prerequisite: Node.js and npm must be installed and available in your path.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
