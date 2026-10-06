"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn border-mast-muted text-white hover:bg-navy-2"
      onClick={async () => {
        await fetch("/api/login", { method: "DELETE" });
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
