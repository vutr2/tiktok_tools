import { requireUser } from "@/lib/auth";
import {
  COMMON_FIELDS,
  INDUSTRIES,
  INDUSTRY_FIELDS,
  INDUSTRY_LABEL,
  type Industry,
} from "@/lib/industries";
import PageHeader from "@/components/page-header";
import NewProductForm from "./form";

export default async function NewProduct() {
  const user = await requireUser();
  const industry = (user.industry ?? "MY_PHAM") as Industry;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Thêm mới"
        balance={user.wallet?.balance ?? 0}
        plan={user.plan}
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
