export const INDUSTRIES = [
  "MY_PHAM",
  "THOI_TRANG",
  "GIA_DUNG",
  "ME_VA_BE",
  "PHU_KIEN",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABEL: Record<Industry, string> = {
  MY_PHAM: "Mỹ phẩm",
  THOI_TRANG: "Thời trang",
  GIA_DUNG: "Gia dụng",
  ME_VA_BE: "Mẹ & Bé",
  PHU_KIEN: "Phụ kiện",
};

export const INDUSTRY_EMOJI: Record<Industry, string> = {
  MY_PHAM: "💄",
  THOI_TRANG: "👗",
  GIA_DUNG: "🏠",
  ME_VA_BE: "🍼",
  PHU_KIEN: "⌚",
};

export function isIndustry(v: unknown): v is Industry {
  return typeof v === "string" && (INDUSTRIES as readonly string[]).includes(v);
}

/** Field thông tin sản phẩm hỏi riêng theo ngành — mỗi ngành bán bằng thứ khác nhau. */
export const INDUSTRY_FIELDS: Record<
  Industry,
  { key: string; label: string; placeholder: string; required?: boolean }[]
> = {
  MY_PHAM: [
    { key: "skinType", label: "Loại da phù hợp", placeholder: "Da dầu, da hỗn hợp thiên dầu", required: true },
    { key: "keyIngredient", label: "Thành phần chính", placeholder: "Niacinamide 10%, Zinc PCA 1%", required: true },
    { key: "volume", label: "Dung tích", placeholder: "30ml" },
    { key: "texture", label: "Kết cấu", placeholder: "Serum lỏng, thấm nhanh, không nhờn rít" },
  ],
  THOI_TRANG: [
    { key: "material", label: "Chất liệu", placeholder: "Cotton 2 chiều, 95% cotton 5% spandex", required: true },
    { key: "sizeRange", label: "Bảng size", placeholder: "S (45-52kg), M (53-60kg), L (61-68kg)", required: true },
    { key: "colors", label: "Màu có sẵn", placeholder: "Đen, trắng kem, xanh rêu" },
    { key: "occasion", label: "Dịp mặc", placeholder: "Đi làm, đi chơi, dự tiệc nhẹ" },
  ],
  GIA_DUNG: [
    { key: "capacity", label: "Dung tích / kích thước", placeholder: "1.8 lít, 24 x 18 x 22 cm", required: true },
    { key: "material", label: "Chất liệu", placeholder: "Inox 304, nhựa PP không BPA", required: true },
    { key: "power", label: "Công suất / nguồn điện", placeholder: "800W, 220V" },
    { key: "warranty", label: "Bảo hành", placeholder: "12 tháng đổi mới" },
  ],
  ME_VA_BE: [
    { key: "ageRange", label: "Độ tuổi phù hợp", placeholder: "0-6 tháng", required: true },
    { key: "material", label: "Chất liệu", placeholder: "Cotton hữu cơ, đã kiểm định QCVN", required: true },
    { key: "safetyCert", label: "Chứng nhận an toàn", placeholder: "CR, QCVN 01:2017/BCT" },
    { key: "washing", label: "Cách vệ sinh", placeholder: "Giặt máy 30°C, không dùng chất tẩy" },
  ],
  PHU_KIEN: [
    { key: "compatibility", label: "Tương thích với", placeholder: "iPhone 13/14/15, Samsung S22 trở lên", required: true },
    { key: "material", label: "Chất liệu", placeholder: "Silicone lỏng, viền nhôm CNC", required: true },
    { key: "spec", label: "Thông số nổi bật", placeholder: "Sạc nhanh 20W, chống rơi 2m" },
    { key: "boxContent", label: "Trong hộp có gì", placeholder: "1 ốp, 1 cường lực, 1 khăn lau" },
  ],
};

export const COMMON_FIELDS = [
  { key: "price", label: "Giá bán (đ)", placeholder: "199000", required: true },
  { key: "target", label: "Bán cho ai", placeholder: "Nữ 22-30, dân văn phòng", required: true },
  { key: "usp", label: "Điểm ăn tiền nhất", placeholder: "Rẻ hơn hàng ngoại 40% mà chất tương đương", required: true },
];
