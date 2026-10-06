import PostEditor from "@/components/admin/PostEditor";
import { editorOptions } from "@/lib/editor";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  return <PostEditor {...await editorOptions()} />;
}
