const COPY = {
  env: {
    title: "Connect the database",
    body: "MONGODB_URI isn't set. Copy .env.example to .env.local, add your MongoDB connection string, then restart the app.",
  },
  db: {
    title: "Can't reach MongoDB",
    body: "The app couldn't connect to the database in MONGODB_URI. Check the connection string, that the database is running, and (for Atlas) that this server's IP is allowed.",
  },
  empty: {
    title: "Load the calendar",
    body: "The database is connected but has no posts yet. Run npm run seed to load the 65 posts and the monthly content mix.",
  },
} as const;

export default function SetupNotice({ reason }: { reason: keyof typeof COPY }) {
  const c = COPY[reason];
  return (
    <main className="wrap py-24">
      <div className="max-w-xl border border-line bg-white p-8">
        <div className="eyebrow text-brass">Amaya on LinkedIn · Setup</div>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-navy">{c.title}</h1>
        <p className="mt-3 text-muted">{c.body}</p>
      </div>
    </main>
  );
}
