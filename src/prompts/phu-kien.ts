import { WB, WE, type PromptPack } from "./types";

export const PHU_KIEN: PromptPack = {
  industry: "PHU_KIEN",
  voice:
    "Thông số trước, cảm xúc sau. Người mua phụ kiện sợ nhất là mua về không lắp vừa — nên câu đầu tiên của mô tả luôn phải là danh sách tương thích.",
  buyerCares: [
    "Có vừa đúng máy/đời máy của mình không",
    "Thông số thật: công suất sạc, dung lượng, chuẩn kết nối",
    "Có làm nóng máy, có ảnh hưởng bảo hành không",
    "Chất liệu có ố vàng sau vài tháng không",
    "Trong hộp có kèm gì",
    "Bảo hành và đổi trả nếu lắp không vừa",
  ],
  objections: [
    "Sợ mua về không vừa máy",
    "Phụ kiện rẻ hay làm hỏng máy",
    "Ốp trong dùng 2 tháng là vàng khè",
    "Sạc nhanh quảng cáo 20W thực tế chắc 5W",
  ],
  searchPatterns: [
    "[tên phụ kiện] + [dòng máy tương thích] + [thông số] + [chất liệu]",
    "ốp lưng iphone 15 pro max chống sốc trong không ố",
    "sạc nhanh 20w type c cho iphone",
    "dán cường lực full màn samsung s23 ultra",
  ],
  bannedClaims: [
    {
      pattern: `(?<!dùng cho )(?<!dành cho )(?<!tương thích )${WB}(chính hãng|zin|apple|samsung|xiaomi|sony|anker)${WE}`,
      why: "Ghi tên hãng như thể là hàng của hãng khi chỉ là phụ kiện tương thích — lý do khoá shop rất phổ biến.",
      fix: 'Viết đúng cấu trúc: "dùng cho iPhone 15", "tương thích Samsung S23".',
    },
    {
      pattern: `${WB}(không bao giờ|vĩnh viễn không)\\s*(ố|vàng|xước|hỏng)${WE}`,
      why: "Ốp silicone/TPU nào cũng ố theo thời gian. Cam kết này chắc chắn dẫn tới đánh giá 1 sao.",
      fix: 'Nói có điều kiện: "chống ố tốt hơn TPU thường, giữ trong khoảng 8-12 tháng".',
    },
    {
      pattern: `${WB}(chống nước|kháng nước)\\s*(tuyệt đối|100%|mọi độ sâu)${WE}`,
      why: "Claim chống nước phải kèm chuẩn IP, nếu không là quảng cáo sai.",
      fix: 'Ghi chuẩn: "IPX4 — chống nước bắn, không ngâm nước".',
    },
    {
      pattern: `${WB}(chống rơi|chống sốc)\\s*(tuyệt đối|mọi độ cao|không vỡ máy)${WE}`,
      why: "Không ốp nào bảo đảm được điều này.",
      fix: 'Ghi độ cao đã test: "đã test rơi 1.5m trên nền gạch".',
    },
  ],
  compliance: [
    "Câu đầu mô tả phải là danh sách đời máy tương thích, liệt kê đủ.",
    "Thông số điện phải ghi đơn vị (W, mAh, V/A) và chuẩn (PD, QC).",
    'Không dùng tên hãng ở vị trí gây hiểu là hàng hãng — luôn kèm "dùng cho".',
    "Liệt kê rõ trong hộp có gì.",
  ],
  hookPatterns: [
    "Lắp thử ngay trong 3 giây đầu, nghe tiếng khớp 'tách'",
    "Bóc mẽ thông số: cắm máy đo công suất lên màn hình",
    "Thử phá: thả rơi từ tầm ngực xuống gạch, quay slow-motion",
    "So kèo: đặt hàng 89k và hàng 400k cạnh nhau, chỉ ra khác biệt thật",
  ],
  shotVocabulary: [
    "Cận cảnh lắp vào máy, thấy rõ khớp viền camera và nút bấm",
    "Cắm máy đo watt/ampe, quay số nhảy trên màn hình",
    "Quay slow-motion cảnh thả rơi trên nền gạch",
    "Xoay sản phẩm dưới đèn để thấy độ trong / vân bề mặt",
    "Đặt cạnh đồng xu hoặc ngón tay để so độ dày",
    "Quay cảnh mở hộp, đổ hết phụ kiện đi kèm ra bàn",
  ],
  scenes: [
    {
      id: "dark_acrylic",
      emoji: "🖤",
      name: "Acrylic đen phản chiếu",
      useCase: "Ảnh chính cho đồ công nghệ — nhìn cao cấp, hợp thumbnail tối.",
      prompt:
        "Product photography on a glossy black acrylic surface with a clean mirror reflection, dramatic rim lighting from behind, deep black gradient background, crisp specular highlights along the product edges, premium tech product aesthetic, sharp focus on the product detail",
      negative:
        "text overlay, watermark, dust and fingerprints, cluttered props, hands, muddy reflection, distorted product shape",
      aspect: "1:1",
    },
    {
      id: "leather_desk",
      emoji: "🗂️",
      name: "Bàn làm việc da",
      useCase: "Ảnh ngữ cảnh — bán cho dân văn phòng, cảm giác dùng hằng ngày.",
      prompt:
        "Product photography on a dark brown leather desk pad, styled with a closed laptop corner and a matte black pen just at the frame edge, warm directional desk lighting, shallow depth of field, understated professional workspace mood, sharp focus on the product",
      negative:
        "text overlay, watermark, brand logos on props, messy desk, people, harsh flash, distorted product shape",
      aspect: "4:5",
    },
    {
      id: "neon_gradient",
      emoji: "🌈",
      name: "Gradient neon gaming",
      useCase: "Đồ gaming / phụ kiện giới trẻ — nổi bật trên feed TikTok.",
      prompt:
        "Product photography with vivid neon gradient lighting in cyan and magenta, dark seamless background, strong colored rim lights on both sides of the product, subtle haze in the air, modern gaming accessory aesthetic, sharp focus on the product",
      negative:
        "text overlay, watermark, blown out neon, unreadable product, cluttered background, hands, distorted product shape",
      aspect: "9:16",
    },
    {
      id: "geometric_blocks",
      emoji: "🔷",
      name: "Khối hình học tối giản",
      useCase: "Ảnh phụ khoe kích thước và độ mỏng, nhìn rất gọn.",
      prompt:
        "Product photography on minimal geometric concrete blocks in soft grey and sand tones, product elevated on the tallest block, clean studio lighting from the upper right, crisp geometric shadows, calm neutral background, editorial product styling, sharp focus",
      negative:
        "text overlay, watermark, cluttered composition, busy colors, hands, harsh contrast, distorted product shape",
      aspect: "1:1",
    },
  ],
};
