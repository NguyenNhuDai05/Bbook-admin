import { redirect } from "next/navigation";
// Compatibility for old design links: every admin screen now requires real auth.
export default function RemovedPreview() {
  redirect("/login");
}
