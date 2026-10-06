"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ openSuggestions }: { openSuggestions: number }) {
  const path = usePathname();
  const items = [
    {
      href: "/admin",
      label: "Posts",
      hint: "Create, edit and delete posts, and add or replace their images.",
      active: path === "/admin" || path.startsWith("/admin/posts"),
    },
    {
      href: "/admin/reviews",
      label: "Founder reviews",
      hint: "What each founder approved or didn't approve, with their feedback.",
      active: path.startsWith("/admin/reviews"),
    },
    {
      href: "/admin/suggestions",
      label: "Suggestions to approve",
      badge: openSuggestions,
      hint: "Changes founders asked for. Approve to apply them to the post, or decline.",
      active: path.startsWith("/admin/suggestions"),
    },
    {
      href: "/admin/users",
      label: "Logins",
      hint: "The four sign-ins. Change a password here.",
      active: path.startsWith("/admin/users"),
    },
  ];
  const current = items.find((i) => i.active);

  return (
    <>
      <nav className="mt-6 flex items-center gap-7 overflow-x-auto">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={i.active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3.5 text-[14.5px] transition-colors ${i.active ? "border-brass text-white" : "border-transparent text-mast-muted hover:text-white"}`}
          >
            {i.label}
            {i.badge ? <span className="rounded-full bg-brass px-1.5 text-[11.5px] font-semibold leading-[18px] text-navy">{i.badge}</span> : null}
          </Link>
        ))}
        <Link href="/" className="ml-auto whitespace-nowrap py-3.5 text-[13.5px] text-brass-soft hover:text-white">
          ← Back to calendar
        </Link>
      </nav>
      {current && <p className="border-t border-navy-line py-3 text-[13px] text-mast-sub">{current.hint}</p>}
    </>
  );
}
