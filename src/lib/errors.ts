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


/** Hết lượt dùng thử. Không phải lỗi — là lúc mời mua gói. */
export class TrialExhaustedError extends AppError {
  constructor(
    public used: number,
    public limit: number,
  ) {
    super(
      "TRIAL_EXHAUSTED",
      `Bạn đã dùng hết ${limit} lượt miễn phí. Mua gói trọn đời để dùng không giới hạn.`,
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
