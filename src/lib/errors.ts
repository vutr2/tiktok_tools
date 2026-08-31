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

export class InsufficientCreditsError extends AppError {
  constructor(
    public required: number,
    public available: number,
  ) {
    super(
      "INSUFFICIENT_CREDITS",
      `Cần ${required} credit nhưng ví chỉ còn ${available}.`,
      402,
    );
  }
}

/** Lỗi từ provider ngoài — đây là loại lỗi PHẢI hoàn credit. */
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
