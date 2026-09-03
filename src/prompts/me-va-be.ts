import { WB, WE, type PromptPack } from "./types";

export const ME_VA_BE: PromptPack = {
  industry: "ME_VA_BE",
  voice:
    "Giọng của một người mẹ đã dùng cho con mình, không phải giọng bán hàng. An toàn trước, tiện lợi sau, giá cuối. Tuyệt đối không doạ nạt kiểu 'không mua là hại con'.",
  buyerCares: [
    "Con mấy tháng thì dùng được",
    "Chất liệu có an toàn khi bé ngậm/cắn không, có chứng nhận gì",
    "Có chi tiết nhỏ nào bé nuốt được không",
    "Giặt/tiệt trùng thế nào, có vào máy tiệt trùng được không",
    "Dùng được bao lâu thì con lớn quá cỡ",
    "Mùi lạ khi mở hộp — mẹ nào cũng kiểm cái này",
  ],
  objections: [
    "Sợ hàng trôi nổi không an toàn cho con",
    "Con mình mau lớn, mua về dùng được mấy tháng là chật",
    "Nhà đã có món tương tự rồi",
    "Sợ chất liệu rẻ tiền có mùi nhựa",
  ],
  searchPatterns: [
    "[tên món] + [độ tuổi] + [chất liệu] + [công dụng]",
    "yếm ăn dặm silicone cho bé 6 tháng",
    "bộ quần áo sơ sinh cotton không cổ 0-3 tháng",
    "gối chống trào ngược cho bé sơ sinh",
  ],
  bannedClaims: [
    {
      pattern: `${WB}(sữa|sản phẩm dinh dưỡng)\\s*(công thức|thay thế sữa mẹ|cho trẻ dưới 24 tháng)`,
      why: "Sản phẩm dinh dưỡng cho trẻ dưới 24 tháng bị cấm quảng cáo theo Nghị định 100/2014/NĐ-CP.",
      fix: "Không quảng cáo nhóm hàng này. Nếu là đồ dùng thì tách bạch rõ, đừng nhắc tới sữa.",
    },
    {
      pattern: `${WB}(tốt hơn sữa mẹ|thay thế sữa mẹ|tương đương sữa mẹ)${WE}`,
      why: "Vi phạm quy định về kinh doanh và sử dụng sản phẩm dinh dưỡng trẻ nhỏ.",
      fix: "Bỏ hoàn toàn.",
    },
    {
      pattern: `${WB}(giúp bé|làm bé)\\s*(thông minh|cao lớn|tăng chiều cao|tăng cân|hết ốm|khỏi bệnh)`,
      why: "Claim y tế/dinh dưỡng với trẻ nhỏ mà không có bằng chứng là vi phạm nặng.",
      fix: "Chỉ mô tả công năng vật lý của món đồ.",
    },
    {
      pattern: `${WB}(an toàn tuyệt đối|100% an toàn|không độc hại 100%)${WE}`,
      why: "Không chứng minh được, và là cái mẹ soi kỹ nhất khi phản hồi.",
      fix: 'Dẫn chứng nhận thật: "Đạt QCVN 01:2017/BCT", "nhựa PP không BPA".',
    },
    {
      pattern: `${WB}(không cần trông|để bé một mình|yên tâm rời mắt)${WE}`,
      why: "Gợi ý bỏ mặc trẻ là rủi ro an toàn nghiêm trọng.",
      fix: 'Luôn kèm cảnh báo "luôn có người lớn quan sát khi bé dùng".',
    },
  ],
  compliance: [
    "Luôn ghi độ tuổi phù hợp bằng tháng.",
    "Nêu chứng nhận an toàn cụ thể nếu có (CR, QCVN), không nói chung chung.",
    "Luôn có một dòng lưu ý cần người lớn giám sát khi bé sử dụng.",
    "Không claim tác động tới sức khoẻ, trí tuệ, thể chất của trẻ.",
    "Không dùng nỗi sợ của cha mẹ làm đòn bẩy bán hàng.",
  ],
  hookPatterns: [
    "Kể tình huống thật 3 giây: 'Bé nhà mình hất đổ cháo lần thứ tư trong tuần'",
    "Chỉ ra chi tiết an toàn mà mẹ hay bỏ sót",
    "Mở hộp và ngửi ngay trước camera để chứng minh không mùi",
    "So sánh cùng món ở hai mức giá, chỉ ra khác nhau ở đường viền/mối nối",
  ],
  shotVocabulary: [
    "Cận tay mẹ gập/mở sản phẩm một tay, tay kia giả bế bé",
    "Quay cảnh tiệt trùng: thả vào máy hoặc nước sôi",
    "Kéo thử mối nối, khoá dán, dây đeo để chứng minh chắc",
    "Đặt cạnh bàn tay người lớn để so kích thước",
    "Quay trước/sau bữa ăn dặm để chứng minh dễ lau",
    "Cận tem chứng nhận trên bao bì",
  ],
  scenes: [
    {
      id: "nursery_pastel",
      emoji: "🧸",
      name: "Phòng bé tông pastel",
      useCase: "Ảnh chính — tạo cảm giác an toàn, sạch sẽ ngay từ thumbnail.",
      prompt:
        "Product photography in a bright nursery corner, soft pastel mint and cream palette, product placed on a light wood surface beside a folded muslin blanket, gentle diffused daylight, airy and clean atmosphere, no children in frame, generous negative space, sharp focus on the product",
      negative:
        "text overlay, watermark, real babies, faces, cluttered toys, dark shadows, saturated colors, distorted product shape",
      aspect: "1:1",
    },
    {
      id: "cotton_flatlay",
      emoji: "🧺",
      name: "Flatlay khăn cotton",
      useCase: "Đồ vải, quần áo sơ sinh — khoe chất liệu mềm.",
      prompt:
        "Top-down flatlay of the product on a soft white cotton muslin cloth with gentle natural folds, warm soft daylight from above, tiny neutral props such as a folded bib at the frame edge, calm minimal styling, cozy tactile feel, sharp focus on fabric texture",
      negative:
        "text overlay, watermark, babies, faces, stains, harsh shadows, busy patterns, distorted product shape",
      aspect: "1:1",
    },
    {
      id: "playmat_wood",
      emoji: "🪵",
      name: "Thảm chơi & sàn gỗ sáng",
      useCase: "Đồ chơi, đồ tập đi — cho thấy môi trường dùng thật.",
      prompt:
        "Product photography on a light wooden floor beside the edge of a plain cream play mat, soft natural window light, warm neutral home interior softly blurred behind, no people in frame, clean uncluttered composition, sharp focus on the product",
      negative:
        "text overlay, watermark, children, faces, messy toys everywhere, dark room, distorted product shape",
      aspect: "4:5",
    },
    {
      id: "pastel_gradient",
      emoji: "🌸",
      name: "Phông gradient pastel",
      useCase: "Ảnh bìa gọn, nổi bật trên feed và trong kết quả tìm kiếm.",
      prompt:
        "Product photography on a smooth pastel gradient studio background transitioning from soft mint to cream, even diffused lighting, clean soft contact shadow beneath the product, modern friendly e-commerce look, product centered with margin on all sides, sharp focus",
      negative:
        "text overlay, watermark, neon colors, harsh shadow, cropped product, background props, distorted product shape",
      aspect: "1:1",
    },
  ],
};
