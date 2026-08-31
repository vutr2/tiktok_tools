import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { allScenes } from "@/prompts";
import { CREDIT_COST } from "@/lib/pricing";
import { INDUSTRY_LABEL, type Industry } from "@/lib/industries";
import Workbench from "./workbench";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, userId: user.id },
  });
  if (!product) notFound();

  const industry = product.industry as Industry;

  return (
    <div>
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicUrl(product.cutoutImageKey ?? product.originalImageKey)}
          alt={product.name}
          className="h-24 w-24 rounded-lg border border-[--color-line] object-cover"
        />
        <div>
          <h1 className="text-xl font-bold">{product.name}</h1>
          <p className="text-sm text-[--color-muted]">
            {INDUSTRY_LABEL[industry]}
          </p>
        </div>
      </div>

      <Workbench
        productId={product.id}
        scenes={allScenes(industry).map((s) => ({
          id: s.id,
          name: s.name,
          useCase: s.useCase,
        }))}
        cost={CREDIT_COST}
        balance={user.wallet?.balance ?? 0}
      />
    </div>
  );
}
