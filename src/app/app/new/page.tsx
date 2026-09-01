import { requireUser } from "@/lib/auth";
import {
  COMMON_FIELDS,
  INDUSTRIES,
  INDUSTRY_FIELDS,
  INDUSTRY_LABEL,
  type Industry,
} from "@/lib/industries";
import NewProductForm from "./form";

export default async function NewProduct() {
  const user = await requireUser();
  const industry = (user.industry ?? "MY_PHAM") as Industry;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold">Thêm sản phẩm</h1>
      <p className="mt-1 text-sm text-muted">
        Ảnh chụp bằng điện thoại là được. Càng điền đủ thông tin, mô tả và kịch
        bản càng bớt chung chung.
      </p>

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
