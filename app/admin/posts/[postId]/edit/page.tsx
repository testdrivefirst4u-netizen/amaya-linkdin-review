import { notFound } from "next/navigation";
import PostEditor from "@/components/admin/PostEditor";
import { getPost } from "@/lib/data";
import { editorOptions } from "@/lib/editor";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const [post, options] = await Promise.all([getPost(decodeURIComponent(postId)), editorOptions()]);
  if (!post) notFound();
  return <PostEditor key={post.postId} post={post} {...options} />;
}
