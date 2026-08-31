import { WB, WE, type PromptPack } from "./types";

export const GIA_DUNG: PromptPack = {
  industry: "GIA_DUNG",
  voice:
    "Bán bằng công dụng đo được và tình huống dùng thật trong bếp/nhà tắm chật. Người mua gia dụng ra quyết định bằng lý trí: kích thước, công suất, dễ vệ sinh, bảo hành. Đừng viết văn.",
  buyerCares: [
    "Kích thước thật, để vừa chỗ nào trong nhà",
    "Công suất / dung tích đủ cho mấy người",
    "Chất liệu tiếp xúc thực phẩm có an toàn không",
    "Rửa thế nào, có tháo rời được không, có vào máy rửa bát được không",
    "Ồn không, tốn điện không",
    "Bảo hành bao lâu, hỏng thì sửa ở đâu",
  ],
  objections: [
    "Nhà chật, sợ mua về không có chỗ để",
    "Mấy món này mua về dùng vài lần rồi bỏ xó",
    "Rẻ thế chắc dùng vài tháng là hỏng",
    "Rửa khó thì thà làm tay còn hơn",
  ],
  searchPatterns: [
    "[tên món] + [dung tích/công suất] + [chất liệu] + [chỗ dùng]",
    "nồi chiên không dầu 5 lít gia đình 4 người",
    "kệ để đồ nhà tắm inox không cần khoan tường",
    "hộp bảo quản thực phẩm thuỷ tinh chịu nhiệt",
  ],
  bannedClaims: [
    {
      pattern: `${WB}(diệt|kháng)\\s*khuẩn\\s*(99[.,]?9?%|100%)`,
      why: "Con số diệt khuẩn phải có kết quả kiểm nghiệm. Không có giấy thì là quảng cáo sai.",
      fix: 'Ghi "hạn chế vi khuẩn bám" hoặc dẫn đúng số hiệu phiếu kiểm nghiệm.',
    },
    {
      pattern: `${WB}(tiết kiệm|giảm)\\s*(điện|nước)\\s*\\d+\\s*%`,
      why: "Số phần trăm tiết kiệm cần điều kiện đo cụ thể, nếu không sẽ bị khiếu nại.",
      fix: 'Nêu công suất thật (W) và để người mua tự so, hoặc ghi rõ "so với model X trong điều kiện Y".',
    },
    {
      pattern: `${WB}(bảo hành trọn đời|vĩnh viễn|dùng cả đời|không bao giờ hỏng)${WE}`,
      why: "Cam kết không thực hiện được, dễ bị phạt và bị đánh giá 1 sao.",
      fix: "Ghi đúng thời hạn bảo hành: 6/12/24 tháng.",
    },
    {
      pattern: `${WB}(chống\\s*cháy|chịu nhiệt)\\s*(tuyệt đối|vô hạn|mọi nhiệt độ)${WE}`,
      why: "Claim an toàn tuyệt đối với đồ điện/nhiệt là rủi ro pháp lý.",
      fix: 'Ghi ngưỡng cụ thể: "chịu nhiệt tới 230°C".',
    },
  ],
  compliance: [
    "Luôn ghi kích thước 3 chiều (D x R x C) và trọng lượng.",
    "Đồ điện phải ghi điện áp và công suất.",
    "Đồ tiếp xúc thực phẩm phải ghi mã chất liệu (inox 304, nhựa PP, thuỷ tinh borosilicate).",
    "Nêu thời hạn bảo hành cụ thể bằng tháng.",
  ],
  hookPatterns: [
    "Cho thấy vấn đề trước: quay góc bếp bừa 3 giây rồi cắt sang sản phẩm",
    "Đo bằng vật quen thuộc: 'Nhỏ hơn cái nồi cơm nhà bạn'",
    "Demo tốc độ: bấm đồng hồ đếm ngược trong khung hình",
    "Thử độ bền ngay: thả rơi, đổ nước sôi, cào bằng dao",
  ],
  shotVocabulary: [
    "Cận tay thao tác từng bước, không cắt cảnh giữa chừng",
    "Đặt thước dây / chai nước 500ml cạnh sản phẩm để so kích thước",
    "Quay cảnh tháo rời từng bộ phận rồi rửa dưới vòi",
    "Quay trước/sau khi dùng trên đúng một góc bếp",
    "Cận bảng thông số dập trên thân máy",
    "Quay lúc cất vào tủ bếp để chứng minh không chiếm chỗ",
  ],
  scenes: [
    {
      id: "kitchen_counter",
      name: "Mặt bếp hiện đại",
      useCase: "Ảnh chính cho đồ bếp — người mua hình dung ngay đặt ở đâu.",
      prompt:
        "Product photography on a clean white quartz kitchen countertop, bright modern kitchen softly blurred in the background, natural daylight from a window on the left, subtle realistic shadow under the product, neutral warm palette, tidy uncluttered surface, sharp focus on the product",
      negative:
        "text overlay, watermark, dirty counter, food mess, people, competing appliances in focus, harsh flash, distorted product shape",
      aspect: "1:1",
    },
    {
      id: "living_shelf",
      name: "Kệ phòng khách tối giản",
      useCase: "Đồ trang trí, đồ lưu trữ — bán bằng cảm giác nhà gọn.",
      prompt:
        "Product photography on a light oak floating shelf against a matte white wall, minimalist Scandinavian interior, soft ambient daylight, one small plant partially visible at the frame edge, calm neutral palette, generous negative space, sharp focus on the product",
      negative:
        "text overlay, watermark, cluttered shelf, busy patterns, people, dark room, distorted product shape",
      aspect: "4:5",
    },
    {
      id: "white_cyclo",
      name: "Phông trắng vô cực",
      useCase: "Ảnh bìa chuẩn sàn — nền trắng tinh, đúng yêu cầu duyệt của Shopee.",
      prompt:
        "Product photography on a pure white seamless cyclorama, even three-point softbox lighting, no color cast, crisp product edges, light contact shadow directly beneath the product, catalogue standard e-commerce shot, entire product visible with margin on all sides, sharp focus",
      negative:
        "text overlay, watermark, grey background, colored light, heavy shadow, cropped product, reflections of the studio, distorted product shape",
      aspect: "1:1",
    },
    {
      id: "dining_morning",
      name: "Bàn ăn gỗ buổi sáng",
      useCase: "Ảnh cảm xúc cho đồ ăn uống, ly cốc, hộp đựng.",
      prompt:
        "Product photography on a warm walnut dining table, morning sunlight streaming through a window creating soft long shadows and a warm highlight, a linen napkin and a ceramic cup placed at the frame edge, cozy home atmosphere, shallow depth of field on the background, sharp focus on the product",
      negative:
        "text overlay, watermark, food stains, cluttered table, people, blown out highlights, distorted product shape",
      aspect: "4:5",
    },
  ],
};
