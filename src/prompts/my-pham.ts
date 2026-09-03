import { WB, WE, type PromptPack } from "./types";

export const MY_PHAM: PromptPack = {
  industry: "MY_PHAM",
  voice:
    "Nói như một người đã dùng thật, không như quảng cáo. Mô tả cảm giác trên da (thấm nhanh, hơi châm nhẹ lúc đầu, không bết) trước khi nói tới thành phần. Nêu con số nồng độ cụ thể thay vì tính từ.",
  buyerCares: [
    "Hợp loại da nào, da nhạy cảm dùng được không",
    "Nồng độ hoạt chất bao nhiêu, có gây kích ứng không",
    "Bao lâu thì thấy khác, dùng ngày hay tối",
    "Có kết hợp được với retinol / vitamin C đang dùng không",
    "Hàng thật hay hàng nhái, có tem chống giả không",
    "Hạn sử dụng còn bao lâu, đã mở nắp dùng được mấy tháng",
  ],
  objections: [
    "Rẻ vậy chắc hàng giả",
    "Da mình nhạy cảm, sợ kích ứng",
    "Dùng cái khác rồi, không thấy tác dụng gì",
    "Sợ mua về không hợp rồi bỏ phí",
  ],
  searchPatterns: [
    "[loại sản phẩm] + [thành phần chính] + [công dụng] + [loại da]",
    "serum niacinamide cho da dầu mụn",
    "kem chống nắng không bết dính da dầu",
    "[thương hiệu] + [dòng] + [dung tích]",
  ],
  bannedClaims: [
    {
      pattern: `${WB}(trị|đặc trị|chữa|chữa khỏi|điều trị)\\s*(mụn|nám|thâm|sẹo|viêm)`,
      why: "Mỹ phẩm không được quảng cáo như thuốc. Sàn gỡ listing, có thể bị xử phạt quảng cáo.",
      fix: 'Đổi thành "hỗ trợ giảm", "làm dịu", "cải thiện tình trạng".',
    },
    {
      pattern: `${WB}(100%|tuyệt đối|vĩnh viễn|khỏi hẳn|dứt điểm)${WE}`,
      why: "Cam kết tuyệt đối là quảng cáo sai sự thật.",
      fix: 'Nêu kết quả có điều kiện: "sau 4 tuần dùng đều, phần lớn người dùng thấy...".',
    },
    {
      pattern: `${WB}(an toàn tuyệt đối|không tác dụng phụ|lành tính 100%)${WE}`,
      why: "Không sản phẩm nào chứng minh được điều này.",
      fix: 'Nói "đã test kích ứng", "không cồn khô, không hương liệu".',
    },
    {
      pattern: `${WB}(thay thế|tương đương)\\s+(thuốc|bác sĩ|liệu trình)`,
      why: "Gợi ý thay thế điều trị y tế là vi phạm.",
      fix: "Bỏ hẳn, hoặc khuyên đi khám nếu tình trạng nặng.",
    },
  ],
  compliance: [
    "Không dùng động từ y tế: trị, chữa, đặc trị, điều trị.",
    "Không so sánh trực tiếp bằng tên thương hiệu khác.",
    "Nêu thành phần bằng tên INCI + nồng độ nếu có, đừng nói chung chung 'chiết xuất thiên nhiên'.",
    "Nhắc test cổ tay/quai hàm 24h trước khi dùng lên mặt.",
  ],
  hookPatterns: [
    "Đối chiếu trước/sau bằng chính da mặt người quay, quay cận trong 3 giây đầu",
    "Chỉ ra sai lầm phổ biến: 'Bôi serum lúc da khô là phí nửa lọ'",
    "Nêu con số gây tò mò: 'Niacinamide 10% mà không rát, khác chỗ nào'",
    "Bóc mẽ: 'Giá 199k mà giống hàng 800k ở đúng một thành phần này'",
  ],
  shotVocabulary: [
    "Cận texture: nhỏ giọt serum lên mu bàn tay, nghiêng tay cho chảy",
    "Cận da má trước/sau khi thoa, cùng góc cùng ánh sáng",
    "Quay bảng thành phần trên vỏ hộp, zoom vào dòng nồng độ",
    "Đặt cạnh sản phẩm quen thuộc để so dung tích",
    "Tay lấy sản phẩm khỏi tủ lạnh mini / kệ skincare buổi sáng",
  ],
  scenes: [
    {
      id: "marble_podium",
      emoji: "🪨",
      name: "Bục đá cẩm thạch",
      useCase: "Ảnh bìa listing — sạch, sang, dễ nhìn trên thumbnail nhỏ.",
      prompt:
        "Product photography on a white marble podium, soft diffused studio light from the upper left, subtle natural shadow to the lower right, clean off-white seamless background, faint reflection on the polished marble surface, minimal composition with generous negative space, high-end skincare catalogue aesthetic, sharp focus on the product label, shot on 85mm lens f/4",
      negative:
        "text overlay, watermark, extra products, human hands, cluttered props, harsh shadows, blown highlights, distorted label",
      aspect: "1:1",
    },
    {
      id: "wet_stone",
      emoji: "💧",
      name: "Đá ướt & giọt nước",
      useCase: "Nhấn cảm giác cấp ẩm, mát da — hợp serum, toner, gel.",
      prompt:
        "Product photography on a dark wet slate stone surface with fresh water droplets around the base, cool blue-toned rim light from behind, deep soft shadows, glossy reflective water film, fine mist in the air, moody hydrating skincare mood, macro detail on droplets, sharp focus on the product",
      negative:
        "text overlay, watermark, cartoonish water splash, extra products, hands, dirty stone, muddy colors, distorted label",
      aspect: "4:5",
    },
    {
      id: "silk_drape",
      emoji: "🎀",
      name: "Lụa pastel",
      useCase: "Ảnh cảm xúc cho quảng cáo và ảnh phụ, hợp dòng dịu nhẹ.",
      prompt:
        "Product photography resting on softly draped pastel silk fabric, warm cream and blush tones, gentle window light from the right creating soft gradient falloff, delicate fabric folds framing the product, dreamy feminine skincare aesthetic, shallow depth of field, sharp focus on the product label",
      negative:
        "text overlay, watermark, wrinkled dirty cloth, extra products, hands, oversaturated pink, harsh contrast, distorted label",
      aspect: "4:5",
    },
    {
      id: "vanity_flatlay",
      emoji: "💄",
      name: "Flatlay bàn trang điểm",
      useCase: "Ảnh ngữ cảnh — cho người mua thấy sản phẩm nằm trong routine.",
      prompt:
        "Top-down flatlay of the product on a clean light wood vanity surface, arranged with a folded white cotton towel, a small ceramic dish and a sprig of dried eucalyptus placed at the edges, soft morning daylight, muted neutral palette, tidy minimal styling, product centered and fully visible, sharp focus",
      negative:
        "text overlay, watermark, competing branded products, messy clutter, human face, dark shadows over the product, distorted label",
      aspect: "1:1",
    },
  ],
};
