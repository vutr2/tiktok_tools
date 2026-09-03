import { WB, WE, type PromptPack } from "./types";

export const THOI_TRANG: PromptPack = {
  industry: "THOI_TRANG",
  voice:
    "Nói về form dáng và chất vải trước, giá sau. Người mua online sợ nhất là mặc lên không giống ảnh — nên mô tả phải trả lời được 'mặc lên nhìn thế nào' chứ không phải 'đẹp lắm'.",
  buyerCares: [
    "Cao/nặng bao nhiêu thì mặc size gì — hỏi trước tiên, luôn luôn",
    "Vải có dày không, có bị lộ nội y không, mặc mùa nào",
    "Co giãn hay không, ngồi lâu có nhăn không",
    "Màu thật có giống ảnh không",
    "Giặt máy được không, có ra màu không",
    "Đổi trả nếu không vừa size thế nào",
  ],
  objections: [
    "Sợ mặc lên không giống người mẫu",
    "Sợ đặt sai size rồi ngại đổi",
    "Vải nhìn rẻ tiền qua ảnh",
    "Shop nào cũng nói đẹp, không tin được",
  ],
  searchPatterns: [
    "[loại đồ] + [kiểu dáng] + [chất liệu] + [đối tượng/dịp]",
    "áo sơ mi linen form rộng nữ công sở",
    "quần ống suông cạp cao che bụng",
    "váy midi dự tiệc vải tuyết mưa",
  ],
  bannedClaims: [
    {
      pattern: `${WB}(nike|adidas|zara|uniqlo|h&m|gucci|chanel|dior|louis vuitton|lv|hermes)${WE}`,
      why: "Nhắc tên thương hiệu khác trong tiêu đề/mô tả là lý do khoá listing phổ biến nhất của ngành thời trang.",
      fix: 'Mô tả bằng phong cách: "form basic kiểu Hàn", "phom oversize street".',
    },
    {
      pattern: `${WB}(hàng auth|auth|chính hãng|hàng hiệu|fake\\s*1|rep\\s*1|super fake)${WE}`,
      why: "Nếu không phải hàng chính hãng có giấy tờ, dùng các cụm này là gian dối. 'Rep/fake' thì bị gỡ ngay.",
      fix: 'Nói đúng bản chất: "hàng xưởng may", "chất vải cao cấp", kèm ảnh cận đường may.',
    },
    {
      pattern: `${WB}(free ?size|freesize)${WE}(?!.*\\d{2}\\s*-\\s*\\d{2}\\s*kg)`,
      why: "Ghi freesize mà không kèm dải cân nặng là nguyên nhân số 1 gây trả hàng.",
      fix: 'Luôn kèm dải cân: "Freesize (45-58kg, cao dưới 1m65)".',
    },
    {
      pattern: `${WB}(vải\\s+(xịn|đẹp|cao cấp))${WE}(?!.*\\d)`,
      why: "Tính từ suông không bán được hàng và không giúp SEO.",
      fix: 'Ghi thành phần: "95% cotton 5% spandex, dày 220gsm".',
    },
  ],
  compliance: [
    "Không dùng tên thương hiệu khác dưới mọi hình thức.",
    "Bảng size phải có dải chiều cao + cân nặng, không chỉ S/M/L.",
    "Nêu thành phần vải theo phần trăm.",
    "Nếu ảnh có người mẫu, ghi rõ số đo người mẫu và size đang mặc.",
  ],
  hookPatterns: [
    "Mặc thử ngay trong 3 giây đầu, quay từ dưới lên cho thấy dáng",
    "Nêu nỗi đau size: 'Cao 1m50 mặc quần ống rộng không bị lùn, chọn thế này'",
    "So sánh 2 màu / 2 form cạnh nhau trong 1 khung hình",
    "Bóc giá: 'Vải này ngoài shop 450k, đây 189k, khác nhau đúng cái mác'",
  ],
  shotVocabulary: [
    "Quay 360 độ quanh người mặc, tốc độ chậm, thấy rõ độ rủ",
    "Cận đường may gấu áo và khoá kéo",
    "Kéo giãn vải bằng hai tay rồi thả cho thấy độ đàn hồi",
    "Vò vải trong lòng bàn tay rồi mở ra cho thấy nhăn/không nhăn",
    "Đặt thước dây lên sản phẩm đo ngang ngực / dài áo",
    "Mix 3 cách phối cùng một món trong 3 cắt cảnh nhanh",
  ],
  scenes: [
    {
      id: "seamless_studio",
      emoji: "📸",
      name: "Phông liền studio",
      useCase: "Ảnh bìa chuẩn sàn — nền trắng sạch, sàn thích, dễ duyệt.",
      prompt:
        "Fashion product photography on a seamless light grey studio backdrop, even softbox lighting from both sides, garment presented flat and wrinkle-free with natural fabric drape, subtle contact shadow beneath, true-to-life color rendering, e-commerce catalogue standard, sharp focus across the whole garment",
      negative:
        "text overlay, watermark, mannequin face, wrinkled fabric, color cast, harsh shadow, extra garments, distorted proportions",
      aspect: "4:5",
    },
    {
      id: "concrete_loft",
      emoji: "🧱",
      name: "Loft bê tông",
      useCase: "Ảnh phong cách cho đồ street / oversize, hợp quảng cáo TikTok.",
      prompt:
        "Fashion editorial photography in a bright concrete loft, garment hanging on a matte black clothing rail, large window light from the left casting soft directional shadows on the raw concrete wall, muted urban palette, shallow depth of field on the background, sharp focus on the garment texture",
      negative:
        "text overlay, watermark, dark gloomy tone, graffiti, people in frame, cluttered background, distorted garment shape",
      aspect: "4:5",
    },
    {
      id: "wood_hanger",
      emoji: "🪝",
      name: "Móc gỗ tường trung tính",
      useCase: "Ảnh phụ cho đồ công sở / basic, làm nổi chất vải.",
      prompt:
        "Fashion product photography, garment on a natural wooden hanger against a warm beige plaster wall, soft afternoon window light raking across the fabric to reveal weave texture, minimal calm styling, natural fabric fall, sharp focus on fabric detail",
      negative:
        "text overlay, watermark, plastic hanger, busy wallpaper, harsh flash, people, distorted garment shape",
      aspect: "1:1",
    },
    {
      id: "flatlay_styled",
      emoji: "👗",
      name: "Flatlay phối đồ",
      useCase: "Cho người mua thấy phối với gì — tăng giá trị đơn hàng.",
      prompt:
        "Top-down flatlay of the garment neatly folded on a clean off-white linen surface, styled with a pair of minimal shoes, a small handbag and simple jewellery placed around the edges, soft even daylight, muted neutral palette, tidy arrangement, main garment centered and fully visible, sharp focus",
      negative:
        "text overlay, watermark, branded logos on props, messy pile, dark shadows, cropped garment, distorted proportions",
      aspect: "1:1",
    },
  ],
};
