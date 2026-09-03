import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { checkDatabaseUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  // Soát chuỗi kết nối lúc DÙNG, không phải lúc import module.
  //
  // `next build` có import từng route để thu thập metadata, và ở môi trường
  // build (Vercel, CI) biến môi trường runtime thường chưa tồn tại. Ném lỗi lúc
  // import là làm hỏng build vì một thứ chỉ cần có khi chạy thật.
  checkDatabaseUrl(process.env.DATABASE_URL, {
    envFileExists: existsSync(".env"),
  });

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Khởi tạo lười: chỉ dựng PrismaClient khi có ai đó thật sự chạm vào nó.
 *
 * Nhờ vậy `import { prisma }` là vô hại, còn lỗi cấu hình vẫn nổ sớm ngay ở
 * truy vấn đầu tiên — kèm thông báo chỉ đúng chỗ cần sửa.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = (globalForPrisma.prisma ??= create());
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
