/**
 * Kiểu bảng cho supabase-js — SINH TỰ ĐỘNG từ database đang chạy.
 *
 * Đừng sửa tay. Đổi schema xong chạy lại: npm run types:db
 */

export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      api_usage: {
        Row: {
          id: string;
          userId: string | null;
          generationId: string | null;
          provider: string;
          model: string;
          inputTokens: number | null;
          outputTokens: number | null;
          images: number | null;
          costVnd: number | null;
          costSource: string | null;
          latencyMs: number | null;
          ok: boolean;
          errorCode: string | null;
          createdAt: string;
        };
        Insert: {
          id: string;
          userId?: string | null;
          generationId?: string | null;
          provider: string;
          model: string;
          inputTokens?: number | null;
          outputTokens?: number | null;
          images?: number | null;
          costVnd?: number | null;
          costSource?: string | null;
          latencyMs?: number | null;
          ok?: boolean;
          errorCode?: string | null;
          createdAt?: string;
        };
        Update: {
          id?: string;
          userId?: string | null;
          generationId?: string | null;
          provider?: string;
          model?: string;
          inputTokens?: number | null;
          outputTokens?: number | null;
          images?: number | null;
          costVnd?: number | null;
          costSource?: string | null;
          latencyMs?: number | null;
          ok?: boolean;
          errorCode?: string | null;
          createdAt?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          userId: string | null;
          action: string;
          entity: string | null;
          entityId: string | null;
          before: Json | null;
          after: Json | null;
          ip: string | null;
          userAgent: string | null;
          createdAt: string;
        };
        Insert: {
          id: string;
          userId?: string | null;
          action: string;
          entity?: string | null;
          entityId?: string | null;
          before?: Json | null;
          after?: Json | null;
          ip?: string | null;
          userAgent?: string | null;
          createdAt?: string;
        };
        Update: {
          id?: string;
          userId?: string | null;
          action?: string;
          entity?: string | null;
          entityId?: string | null;
          before?: Json | null;
          after?: Json | null;
          ip?: string | null;
          userAgent?: string | null;
          createdAt?: string;
        };
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          id: string;
          userId: string;
          walletId: string;
          type: Database["public"]["Enums"]["CreditTxnType"];
          delta: number;
          balanceAfter: number;
          idempotencyKey: string;
          generationId: string | null;
          paymentId: string | null;
          note: string | null;
          createdAt: string;
        };
        Insert: {
          id: string;
          userId: string;
          walletId: string;
          type: Database["public"]["Enums"]["CreditTxnType"];
          delta: number;
          balanceAfter: number;
          idempotencyKey: string;
          generationId?: string | null;
          paymentId?: string | null;
          note?: string | null;
          createdAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          walletId?: string;
          type?: Database["public"]["Enums"]["CreditTxnType"];
          delta?: number;
          balanceAfter?: number;
          idempotencyKey?: string;
          generationId?: string | null;
          paymentId?: string | null;
          note?: string | null;
          createdAt?: string;
        };
        Relationships: [];
      };
      credit_wallet: {
        Row: {
          id: string;
          userId: string;
          balance: number;
          totalIn: number;
          totalOut: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId: string;
          balance?: number;
          totalIn?: number;
          totalOut?: number;
          createdAt?: string;
          updatedAt: string;
        };
        Update: {
          id?: string;
          userId?: string;
          balance?: number;
          totalIn?: number;
          totalOut?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      generated_assets: {
        Row: {
          id: string;
          userId: string;
          productId: string | null;
          generationId: string | null;
          kind: Database["public"]["Enums"]["AssetKind"];
          sceneId: string | null;
          storageKey: string;
          mimeType: string;
          bytes: number;
          width: number | null;
          height: number | null;
          createdAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id: string;
          userId: string;
          productId?: string | null;
          generationId?: string | null;
          kind: Database["public"]["Enums"]["AssetKind"];
          sceneId?: string | null;
          storageKey: string;
          mimeType: string;
          bytes: number;
          width?: number | null;
          height?: number | null;
          createdAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          userId?: string;
          productId?: string | null;
          generationId?: string | null;
          kind?: Database["public"]["Enums"]["AssetKind"];
          sceneId?: string | null;
          storageKey?: string;
          mimeType?: string;
          bytes?: number;
          width?: number | null;
          height?: number | null;
          createdAt?: string;
          deletedAt?: string | null;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          userId: string;
          productId: string | null;
          type: Database["public"]["Enums"]["GenerationType"];
          status: Database["public"]["Enums"]["GenerationStatus"];
          industry: Database["public"]["Enums"]["Industry"];
          input: Json;
          output: Json | null;
          creditsCharged: number;
          provider: string | null;
          providerJobId: string | null;
          providerCostVnd: number | null;
          errorCode: string | null;
          errorMessage: string | null;
          createdAt: string;
          updatedAt: string;
          completedAt: string | null;
        };
        Insert: {
          id: string;
          userId: string;
          productId?: string | null;
          type: Database["public"]["Enums"]["GenerationType"];
          status?: Database["public"]["Enums"]["GenerationStatus"];
          industry: Database["public"]["Enums"]["Industry"];
          input: Json;
          output?: Json | null;
          creditsCharged?: number;
          provider?: string | null;
          providerJobId?: string | null;
          providerCostVnd?: number | null;
          errorCode?: string | null;
          errorMessage?: string | null;
          createdAt?: string;
          updatedAt: string;
          completedAt?: string | null;
        };
        Update: {
          id?: string;
          userId?: string;
          productId?: string | null;
          type?: Database["public"]["Enums"]["GenerationType"];
          status?: Database["public"]["Enums"]["GenerationStatus"];
          industry?: Database["public"]["Enums"]["Industry"];
          input?: Json;
          output?: Json | null;
          creditsCharged?: number;
          provider?: string | null;
          providerJobId?: string | null;
          providerCostVnd?: number | null;
          errorCode?: string | null;
          errorMessage?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          userId: string;
          kind: string;
          title: string;
          body: string | null;
          link: string | null;
          readAt: string | null;
          createdAt: string;
        };
        Insert: {
          id: string;
          userId: string;
          kind: string;
          title: string;
          body?: string | null;
          link?: string | null;
          readAt?: string | null;
          createdAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          kind?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          readAt?: string | null;
          createdAt?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          userId: string;
          packId: string;
          amountVnd: number;
          credits: number;
          provider: string;
          providerRef: string | null;
          status: Database["public"]["Enums"]["PaymentStatus"];
          raw: Json | null;
          createdAt: string;
          updatedAt: string;
          paidAt: string | null;
        };
        Insert: {
          id: string;
          userId: string;
          packId: string;
          amountVnd: number;
          credits: number;
          provider: string;
          providerRef?: string | null;
          status?: Database["public"]["Enums"]["PaymentStatus"];
          raw?: Json | null;
          createdAt?: string;
          updatedAt: string;
          paidAt?: string | null;
        };
        Update: {
          id?: string;
          userId?: string;
          packId?: string;
          amountVnd?: number;
          credits?: number;
          provider?: string;
          providerRef?: string | null;
          status?: Database["public"]["Enums"]["PaymentStatus"];
          raw?: Json | null;
          createdAt?: string;
          updatedAt?: string;
          paidAt?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          userId: string;
          industry: Database["public"]["Enums"]["Industry"];
          name: string;
          originalImageKey: string;
          cutoutImageKey: string | null;
          info: Json;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId: string;
          industry: Database["public"]["Enums"]["Industry"];
          name: string;
          originalImageKey: string;
          cutoutImageKey?: string | null;
          info: Json;
          createdAt?: string;
          updatedAt: string;
        };
        Update: {
          id?: string;
          userId?: string;
          industry?: Database["public"]["Enums"]["Industry"];
          name?: string;
          originalImageKey?: string;
          cutoutImageKey?: string | null;
          info?: Json;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      saved_scripts: {
        Row: {
          id: string;
          userId: string;
          productId: string;
          generationId: string | null;
          angle: string;
          script: Json;
          totalSeconds: number;
          createdAt: string;
        };
        Insert: {
          id: string;
          userId: string;
          productId: string;
          generationId?: string | null;
          angle: string;
          script: Json;
          totalSeconds: number;
          createdAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          productId?: string;
          generationId?: string | null;
          angle?: string;
          script?: Json;
          totalSeconds?: number;
          createdAt?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          userId: string;
          tokenHash: string;
          userAgent: string | null;
          ip: string | null;
          createdAt: string;
          lastSeenAt: string;
          expiresAt: string;
          revokedAt: string | null;
        };
        Insert: {
          id: string;
          userId: string;
          tokenHash: string;
          userAgent?: string | null;
          ip?: string | null;
          createdAt?: string;
          lastSeenAt?: string;
          expiresAt: string;
          revokedAt?: string | null;
        };
        Update: {
          id?: string;
          userId?: string;
          tokenHash?: string;
          userAgent?: string | null;
          ip?: string | null;
          createdAt?: string;
          lastSeenAt?: string;
          expiresAt?: string;
          revokedAt?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          industry: Database["public"]["Enums"]["Industry"] | null;
          createdAt: string;
          updatedAt: string;
          plan: Database["public"]["Enums"]["Plan"];
          planActivatedAt: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          phone?: string | null;
          industry?: Database["public"]["Enums"]["Industry"] | null;
          createdAt?: string;
          updatedAt: string;
          plan?: Database["public"]["Enums"]["Plan"];
          planActivatedAt?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          phone?: string | null;
          industry?: Database["public"]["Enums"]["Industry"] | null;
          createdAt?: string;
          updatedAt?: string;
          plan?: Database["public"]["Enums"]["Plan"];
          planActivatedAt?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      AssetKind: "ORIGINAL" | "CUTOUT" | "SCENE";
      CreditTxnType: "TOPUP" | "BONUS" | "DEBIT" | "REFUND" | "ADJUSTMENT";
      GenerationStatus: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
      GenerationType: "PRODUCT_PHOTO" | "LISTING_COPY" | "VIDEO_SCRIPT";
      Industry: "MY_PHAM" | "THOI_TRANG" | "GIA_DUNG" | "ME_VA_BE" | "PHU_KIEN";
      PaymentStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
      Plan: "FREE" | "LIFETIME";
    };
    CompositeTypes: Record<string, never>;
  };
};
