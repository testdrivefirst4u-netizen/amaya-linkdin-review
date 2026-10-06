"use client";

import { useState } from "react";
import { LIMITS } from "@/lib/config";
import { formatTimestamp } from "@/lib/format";
import type { UserSummary } from "@/lib/users";

export default function UsersPanel({ users }: { users: UserSummary[] }) {
  return (
    <section>
      <p className="mb-5 max-w-[78ch] text-muted">
        Everyone signs in with their own username. Founders review posts and send suggestions; only the admin creates and edits posts. Set a new password here and share it privately.
      </p>
      <ul className="grid gap-2">
        {users.map((u) => (
          <li key={u.username}>
            <UserRow user={u} />
          </li>
        ))}
      </ul>
      {users.length === 0 && <p className="text-muted">No users yet. Run npm run seed to create them.</p>}
    </section>
  );
}

function UserRow({ user }: { user: UserSummary }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);

  async function save() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNote({ text: "Password changed." });
      setPassword("");
      setOpen(false);
    } catch (e) {
      setNote({ text: e instanceof Error && e.message ? e.message : "Couldn't change it.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border border-line bg-white px-4 py-3">
      <div className="min-w-[200px] flex-1">
        <div className="font-medium text-navy">
          {user.name}
          <span className={`ml-2 rounded-sq px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider ${user.role === "admin" ? "bg-navy text-white" : "bg-brass-wash text-brass-dark"}`}>
            {user.role}
          </span>
        </div>
        <div className="text-[12.5px] text-muted">
          Username <b className="font-medium text-body">{user.username}</b> · Password set {formatTimestamp(user.updatedAt)}
        </div>
      </div>
      {open ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <input
            type="text"
            autoComplete="new-password"
            className="input w-[220px]"
            placeholder={`New password (${LIMITS.password}+ characters)`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-primary" disabled={busy || password.length < LIMITS.password}>
            Save
          </button>
          <button type="button" className="btn" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          Change password
        </button>
      )}
      {note && (
        <span className={`w-full text-[13px] ${note.error ? "text-no-fg" : "text-ok-fg"}`} role={note.error ? "alert" : "status"}>
          {note.text}
        </span>
      )}
    </div>
  );
}
