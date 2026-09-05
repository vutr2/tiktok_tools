import { requireUser } from "@/lib/auth";
import {
  COMMON_FIELDS,
  INDUSTRIES,
  INDUSTRY_FIELDS,
  INDUSTRY_LABEL,
  type Industry,
} from "@/lib/industries";
import { getEntitlement } from "@/lib/entitlement";
import PageHeader from "@/components/page-header";
import NewProductForm from "./form";

export default async function NewProduct() {
  const user = await requireUser();
  const ent = await getEntitlement(user.id);
  const industry = (user.industry ?? "MY_PHAM") as Industry;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Thêm mới"
        plan={user.plan}
        remaining={ent.remaining}
      />

      <NewProductForm
        defaultIndustry={industry}
        industries={INDUSTRIES.map((i) => ({
          value: i,
          label: INDUSTRY_LABEL[i],
        }))}
        fieldsByIndustry={INDUSTRY_FIELDS}
        commonFields={COMMON_FIELDS}
      />
    </div>
  );
}
