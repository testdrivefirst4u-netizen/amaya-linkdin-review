import { listUsers } from "@/lib/users";
import UsersPanel from "@/components/admin/UsersPanel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  return <UsersPanel users={await listUsers()} />;
}
