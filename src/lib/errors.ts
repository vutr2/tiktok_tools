export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}


/** Hết lượt. Không phải lỗi — là lúc mời mua gói. */
export class TrialExhaustedError extends AppError {
  constructor(
    public usedToday: number,
    public perDay: number,
    /** true = hết hạn dùng thử; false = chỉ hết lượt hôm nay, mai lại có. */
    public expired = false,
  ) {
    super(
      "TRIAL_EXHAUSTED",
      expired
        ? "Đã hết hạn dùng thử. Mua gói trọn đời để dùng không giới hạn."
        : `Hôm nay đã dùng hết ${perDay} lượt miễn phí. Mai có lượt mới, hoặc mua gói trọn đời để dùng không giới hạn.`,
      402,
    );
  }
}


/** Lỗi từ provider ngoài. */
export class ProviderError extends AppError {
  constructor(
    public provider: string,
    message: string,
    public retryable = true,
  ) {
    super("PROVIDER_ERROR", message, 502);
  }
}

export function toErrorResponse(err: unknown): {
  status: number;
  body: { error: { code: string; message: string } };
} {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { error: { code: err.code, message: err.message } },
    };
  }
  console.error("[unhandled]", err);
  return {
    status: 500,
    body: {
      error: { code: "INTERNAL", message: "Có lỗi xảy ra, thử lại sau." },
    },
  };
}
