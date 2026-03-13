import { redirect } from "next/navigation";

export default function DraftsArchiveRedirect() {
  redirect("/posts/archive");
}
