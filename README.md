# Amaya LinkedIn Calendar — Founder Review

A web app for the Amaya (Vera Vita Living LLP) LinkedIn content calendar, October 2026 to March 2027. The three founders open each post, mark it **Approved** or **Not approved**, and leave feedback and remarks. Everyone sees the same reviews, saved in MongoDB.

Built with **Next.js 15 (App Router)**, **Tailwind CSS 3** and **MongoDB** (official Node driver).

## What it does

| Area | Features |
| --- | --- |
| Company page tab | 26 weekly posts grouped by month, with the full brief: headline, objective, audience, format, creative direction, visual and source |
| Founders tab | 39 founder posts (Arudradev Rao, Dhruv Badruka, Tanay Saboo) with angle, audience, visual and source |
| Monthly content mix tab | Heat table of the recommended content split per month, plus the reasoning notes |
| Search and filters | Full-text search (including feedback and remarks), filter by pillar or founder, source type and review status, expand or collapse all, clear filters |
| Post tools | Copy post (copy, CTA and hashtags ready for LinkedIn), copy a direct link to a post (`/#CO-W05`), fact-check and "hold" warnings |
| Founder review | Status (Awaiting review / Approved / Not approved), Reviewed by, Feedback and Remarks on every post |
| Review rules | A reviewer name is required to approve or reject. Feedback is required to mark a post Not approved |
| Review history | Every save and reset is logged with time and reviewer. Open **Review history** on any post |
| Reset review | Clears a post back to Awaiting review, with an in-page confirmation. The history keeps a record |
| Live updates | The page pulls other reviewers' changes every 15 seconds and when the tab regains focus. A reviewer's unsaved edits are never overwritten |
| Progress header | Counts for approved, not approved and awaiting review, with a progress bar |
| Reviewing as | Each person picks their name once. It is remembered on that device and prefilled on new reviews |
| Export | Excel (`.xlsx`, styled, filterable) and CSV exports of every post with its review |
| Unsaved-changes guard | Warns before closing the tab with unsaved reviews. **Ctrl/Cmd + Enter** saves |
| Access code (optional) | Set `ACCESS_CODE` to require a code before anyone can open the app or call the API |

## Setup

Requirements: **Node.js 20.12 or newer**, and a MongoDB database (MongoDB Atlas free tier works, or MongoDB running locally).

```bash
npm install
cp .env.example .env.local      # then edit .env.local
npm run seed                    # loads the 65 posts and the monthly mix
npm run dev                     # http://localhost:3000
```

`.env.local`:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=amaya_linkedin
ACCESS_CODE=choose-a-code        # optional; leave empty for no login
```

For production: `npm run build` then `npm start`.

### Deploy to Vercel

1. Push this folder to a GitHub repository and import it in Vercel.
2. Add `MONGODB_URI`, `MONGODB_DB` and (optionally) `ACCESS_CODE` under **Settings → Environment Variables**.
3. In MongoDB Atlas, under **Network Access**, allow `0.0.0.0/0` (Vercel uses changing IPs).
4. Run `npm run seed` once from your computer with the same `MONGODB_URI` to load the posts.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run seed` | Insert or update all posts and the content mix from `data/calendar.json`. Existing reviews are kept |
| `npm run seed:reset-reviews` | Same, and also deletes every review and its history (use before a fresh review round) |
| `npm run typecheck` | TypeScript check |

## Changing content

- **Posts:** edit `data/calendar.json` (or regenerate it from the spreadsheet), then run `npm run seed`. Posts are matched by `postId` (`CO-W01`…`CO-W26`, `FO-01`…`FO-39`), so reviews stay attached.
- **Reviewers:** edit `REVIEWERS` in `lib/config.ts`.
- **Colours and fonts:** `tailwind.config.ts` (Deep Navy `#1B2A41`, Antique Brass `#AD8A4E`, Cormorant Garamond and Jost).

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/posts?channel=company\|founder` | All posts |
| GET | `/api/posts/:postId` | One post with its review and history |
| GET | `/api/reviews` | All saved reviews |
| GET | `/api/reviews/:postId` | Review and history for one post |
| PUT | `/api/reviews/:postId` | Save a review: `{ status, reviewer, feedback, remarks }` |
| DELETE | `/api/reviews/:postId?reviewer=Name` | Reset a review to Awaiting review |
| GET | `/api/mix` | Monthly content mix |
| GET | `/api/export?format=xlsx\|csv&channel=&status=` | Download reviews |
| POST / DELETE | `/api/login` | Sign in with the access code / sign out |

`status` is one of `pending`, `approved`, `rejected`.

## MongoDB collections

| Collection | Contents |
| --- | --- |
| `posts` | The 65 calendar posts (unique index on `postId`) |
| `reviews` | One current review per post (unique index on `postId`) |
| `review_history` | Every save and reset, newest first per post |
| `settings` | The monthly content mix (`key: "monthly-mix"`) |

Indexes are created automatically by the app and by the seed script.

## Project structure

```
app/
  page.tsx                 Server page: loads posts, reviews and mix from MongoDB
  login/page.tsx           Access-code screen (only used when ACCESS_CODE is set)
  api/...                  Route handlers listed above
components/
  CalendarApp.tsx          Header, stats, tabs, live sync, export, reviewer identity
  PostList.tsx             Search, filters, month grouping, expand all
  PostCard.tsx             Post row, copy, brief, warnings
  ReviewPanel.tsx          Status, reviewer, feedback, remarks, history, reset
  MixPanel.tsx             Monthly content mix table
lib/
  mongodb.ts               Shared connection + indexes
  data.ts                  Data access and review validation
  config.ts                Reviewers, labels, limits, poll interval
  auth.ts, middleware.ts   Optional access-code gate
data/calendar.json         Seed data extracted from the spreadsheet
scripts/seed.mjs           Seeder
```

## Notes

- The access code is a simple shared gate, not per-person accounts. "Reviewed by" records who made each review, but it isn't tied to a login.
- Dates are calendar dates and display the same in every timezone. Save times are shown in IST.
