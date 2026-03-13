import { redirect } from "next/navigation";

type DraftsRedirectProps = {
  params: Promise<{ id: string }>;
};

export default async function DraftsIdRedirect({ params }: DraftsRedirectProps) {
  const { id } = await params;
  redirect(`/posts/${id}`);
}
