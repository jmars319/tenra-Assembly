import { redirect } from "next/navigation";

export default function DraftsNewRedirect() {
  redirect("/posts/new");
}
