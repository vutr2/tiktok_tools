import { signOut } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST() {
  await signOut();
  return ok({ ok: true });
}
