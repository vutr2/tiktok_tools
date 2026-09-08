import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { signedUrls } from "@/lib/storage";
import { allScenes } from "@/prompts";
import { CREDIT_COST } from "@/lib/pricing";
import { INDUSTRY_EMOJI, INDUSTRY_LABEL, type Industry } from "@/lib/industries";
import { getEntitlement } from "@/lib/entitlement";
import PageHeader, { PlanPill } from "@/components/page-header";
import Workbench from "./workbench";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const { data: product } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("userId", user.id)
    .maybeSingle();
  if (!product) notFound();

  const industry = product.industry as Industry;

  const thumbKey = product.cutoutImageKey ?? product.originalImageKey;
  const urls = await signedUrls([thumbKey, product.originalImageKey]);
  const ent = await getEntitlement(user.id);

  return (
    <div>
      <PageHeader back={{ href: "/app", label: "Sản phẩm" }} />

      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls.get(thumbKey) ?? ""}
          alt={product.name}
          className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">
            {product.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {INDUSTRY_EMOJI[industry]} {INDUSTRY_LABEL[industry]}
          </p>
        </div>
        <PlanPill plan={user.plan} remaining={ent.remaining} />
      </div>

      <Workbench
        productId={product.id}
        productName={product.name}
        originalUrl={urls.get(product.originalImageKey) ?? ""}
        scenes={allScenes(industry).map((s) => ({
          id: s.id,
          name: s.name,
          emoji: s.emoji,
          useCase: s.useCase,
        }))}
        cost={CREDIT_COST}
        remaining={ent.remaining}
        lifetime={user.plan === "LIFETIME"}
      />
    </div>
  );
}
