import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { countOpenSuggestions } from "@/lib/suggestions";
import AdminNav from "@/components/admin/AdminNav";
import SignOutButton from "@/components/admin/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  const open = await countOpenSuggestions().catch(() => 0);

  return (
    <>
      <header className="bg-navy pt-8 text-mast-text">
        <div className="wrap">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="eyebrow text-brass-soft">Amaya on LinkedIn · Admin</div>
              <h1 className="mt-2 font-serif text-[clamp(32px,4.5vw,44px)] font-medium leading-none">Manage the calendar</h1>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-mast-sub">
              <span>{user.name}</span>
              <SignOutButton />
            </div>
          </div>
          <AdminNav openSuggestions={open} />
        </div>
      </header>
      <main className="wrap pb-20 pt-7">{children}</main>
    </>
  );
}
