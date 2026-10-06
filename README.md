# Amaya LinkedIn Calendar — Founder Review

A web app for the Amaya (Vera Vita Living LLP) LinkedIn content calendar, October 2026 to March 2027. The admin (BroaddCast) creates posts with images. The three founders sign in, mark each post **Approved** or **Not approved**, leave feedback, and send suggested changes that the admin approves before they reach the post. Data lives in MongoDB; images live on ImageKit.

Built with **Next.js 15 (App Router)**, **Tailwind CSS 3** and **MongoDB** (official Node driver).

## What it does

| Area | Features |
| --- | --- |
| Company page tab | 26 weekly posts grouped by month, with the full brief: headline, objective, audience, format, creative direction, visual and source |
| Founders tab | 39 founder posts (Arudradev Rao, Dhruv Badruka, Tanay Saboo) with angle, audience, visual and source |
| Monthly content mix tab | Heat table of the recommended content split per month, plus the reasoning notes |
| Search and filters | Full-text search (including feedback and remarks), filter by pillar or founder, source type and review status, expand or collapse all, clear filters |
| Post tools | Copy post (copy, CTA and hashtags ready for LinkedIn), copy a direct link to a post (`/#CO-W05`), fact-check and "hold" warnings |
| Sign-in | Four accounts: `admin` (BroaddCast team) and one per founder (`arudradev`, `dhruv`, `tanay`). Reviews are saved under the signed-in name |
| Admin area (`/admin`) | List, create, edit and delete posts for the company page or any founder; approve or decline suggestions; change passwords |
| Images | One or more images per post, uploaded from the browser straight to ImageKit. The cover shows beside each post; open a post for the gallery and full-size viewer |
| Post editor | Form with a live preview of the calendar row and a LinkedIn feed preview |
| Suggestions | Founders propose new wording (hook, copy, CTA, hashtags) and images. Nothing changes until the admin approves; approving applies the wording and adds the images |
| Founder review | Each founder saves their own status, feedback and remarks; others' reviews show read-only. Overall status: Not approved if anyone said no, otherwise Approved if anyone approved |
| Review rules | Feedback is required to mark a post Not approved |
| Review history | Every save and reset is logged with time and reviewer. Open **Review history** on any post |
| Reset review | Clears a post back to Awaiting review, with an in-page confirmation. The history keeps a record |
| Live updates | The page pulls other reviewers' changes every 15 seconds and when the tab regains focus. A reviewer's unsaved edits are never overwritten |
| Progress header | Counts for approved, not approved and awaiting review, with a progress bar |
| Export | Excel (`.xlsx`, styled, filterable) and CSV exports of every post with its review |
| Unsaved-changes guard | Warns before closing the tab with unsaved reviews. **Ctrl/Cmd + Enter** saves |

## Setup

Requirements: **Node.js 20.12 or newer**, and a MongoDB database (MongoDB Atlas free tier works, or MongoDB running locally).

```bash
npm install
cp .env.example .env.local      # then edit .env.local
npm run seed                    # loads the 65 posts, the monthly mix and the four users
npm run dev                     # http://localhost:3000
```

`.env.local`:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=amaya_linkedin
AUTH_SECRET=long-random-value    # signs the sign-in cookie (required in production)
SEED_PASSWORD_ADMIN=...          # optional; otherwise seed prints random passwords
SEED_PASSWORD_ARUDRADEV=...
SEED_PASSWORD_DHRUV=...
SEED_PASSWORD_TANAY=...
IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_PRIVATE_KEY=private_...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
IMAGEKIT_FOLDER=amaya-linkedin
```

Seeding never changes an existing user's password. To set new ones from the `SEED_PASSWORD_*` values, run `npm run seed -- --reset-passwords`, or change them in **Admin → Users**.

For production: `npm run build` then `npm start`.

### Deploy to Vercel

1. Push this folder to a GitHub repository and import it in Vercel.
2. Add `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET` and the `IMAGEKIT_*` keys under **Settings → Environment Variables**.
3. In MongoDB Atlas, under **Network Access**, allow `0.0.0.0/0` (Vercel uses changing IPs).
4. Run `npm run seed` once from your computer with the same `MONGODB_URI` to load the posts and create the users.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run seed` | Insert or update the posts and content mix from `data/calendar.json`, and create missing users. Reviews, passwords and posts created or edited in the app are kept |
| `npm run seed:reset-reviews` | Same, and also deletes every review, its history and every suggestion (use before a fresh review round) |
| `npm run typecheck` | TypeScript check |

## Changing content

- **Posts:** create and edit them in **Admin**. New posts get the next ID (`CO-W27`, `FO-40`, …). You can also edit `data/calendar.json` and run `npm run seed`; posts already edited in the app are left alone.
- **Founders:** edit `FOUNDERS` in `lib/config.ts` and `USERS` in `scripts/seed.mjs`.
- **Colours and fonts:** `tailwind.config.ts` (Deep Navy `#1B2A41`, Antique Brass `#AD8A4E`, Cormorant Garamond and Jost).

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/posts?channel=company\|founder` | All posts |
| POST | `/api/posts` | Create a post (admin) |
| GET | `/api/posts/:postId` | One post with its review and history |
| PUT / DELETE | `/api/posts/:postId` | Edit or delete a post (admin) |
| GET / POST | `/api/posts/:postId/suggestions` | List or send suggestions: `{ message, changes, images }` |
| GET | `/api/suggestions?status=` | All suggestions (admin) |
| PATCH | `/api/suggestions/:id` | `{ action: "accept" \| "decline", note }` (admin) |
| GET | `/api/imagekit/auth` | One-time ImageKit upload signature (signed-in users) |
| GET / PUT | `/api/users`, `/api/users/:username` | List users, set a password (admin) |
| GET | `/api/reviews` | All saved reviews |
| GET | `/api/reviews/:postId` | Review and history for one post |
| PUT | `/api/reviews/:postId` | Save your own review: `{ status, feedback, remarks }`. Returns the overall status and everyone's reviews |
| GET | `/api/reviews/people` | Each person's own latest review on every post |
| DELETE | `/api/reviews/:postId` | Reset every founder's review on a post (admin) |
| GET | `/api/mix` | Monthly content mix |
| GET | `/api/export?format=xlsx\|csv&channel=&status=` | Download reviews |
| POST / DELETE | `/api/login` | Sign in with `{ username, password }` / sign out |

`status` is one of `pending`, `approved`, `rejected`.

## MongoDB collections

| Collection | Contents |
| --- | --- |
| `posts` | The 65 calendar posts (unique index on `postId`) |
| `reviews` | One current review per post (unique index on `postId`) |
| `review_history` | Every save and reset, newest first per post |
| `settings` | The monthly content mix (`key: "monthly-mix"`) |
| `users` | The four sign-ins (bcrypt password hashes) |
| `suggestions` | Founders' suggested changes and the admin's decision |

Indexes are created automatically by the app and by the seed script.

## Project structure

```
app/
  page.tsx                 Server page: loads posts, reviews and mix from MongoDB
  login/page.tsx           Username and password sign-in
  admin/...                Posts, post editor, suggestions, users (admin only)
  api/...                  Route handlers listed above
components/
  CalendarApp.tsx          Header, stats, tabs, live sync, export, reviewer identity
  PostList.tsx             Search, filters, month grouping, expand all
  PostCard.tsx             Post row, copy, brief, warnings
  ReviewPanel.tsx          Status, feedback, remarks, history, reset
  SuggestPanel.tsx         Founders' suggestions on a post
  Images.tsx               ImageKit uploader, row thumbnail, gallery, lightbox
  admin/                   Admin posts table, PostEditor with live previews, suggestion queue, users
  MixPanel.tsx             Monthly content mix table
lib/
  mongodb.ts               Shared connection + indexes
  data.ts                  Data access and review validation
  config.ts                Reviewers, labels, limits, poll interval
  session.ts, auth.ts      Signed session cookie and role checks (middleware.ts guards every page)
  posts.ts, suggestions.ts Create/edit/delete posts; suggestion approval
  imagekit.ts              Upload signatures, URL checks, deletes
data/calendar.json         Seed data extracted from the spreadsheet
scripts/seed.mjs           Seeder
```

## Notes

- Removing an image from a post, or deleting a post, also deletes the file from ImageKit. Images uploaded to a form that is then abandoned stay in the ImageKit library.
- Changing a password doesn't sign that person out of devices already signed in (sessions last 30 days). Change `AUTH_SECRET` to sign everyone out.
- Dates are calendar dates and display the same in every timezone. Save times are shown in IST.
