"use client";

import { useRouter } from "next/navigation";
import { tokens, FONT, PillButton } from "@/components/ui/primitives";

interface AccountLinkingPromptProps {
  tone?: "buyer" | "business";
  persistent?: boolean;
  onDismiss?: () => void;
}

export function AccountLinkingPrompt({ tone = "buyer", persistent = false, onDismiss }: AccountLinkingPromptProps) {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const isBusiness = tone === "business";

  return (
    <section
      style={{
        background: isBusiness ? t.primaryDeep : t.primarySoft,
        border: `1px solid ${isBusiness ? t.primaryDeep : t.primary}`,
        borderRadius: 12,
        padding: 14,
        color: isBusiness ? "#fff" : t.text,
        fontFamily: fontFn,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 750, lineHeight: 1.35 }}>
        {isBusiness
          ? "Добавьте телефон и пароль, чтобы входить в бизнес-кабинет с компьютера."
          : "Добавьте телефон и пароль, чтобы входить на сайте."}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, color: isBusiness ? "rgba(255,255,255,0.78)" : t.textSec }}>
        Если аккаунт на сайте уже есть, свяжите его с Telegram, чтобы всё было в одном профиле.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <PillButton
          size="sm"
          full={false}
          variant={isBusiness ? "primary" : "dark"}
          onClick={() => router.push("/complete-account")}
          style={{ minWidth: 132 }}
        >
          Добавить
        </PillButton>
        <PillButton
          size="sm"
          full={false}
          variant={isBusiness ? "outline" : "muted"}
          onClick={() => router.push("/link-account")}
          style={{ minWidth: 150 }}
        >
          Связать web-аккаунт
        </PillButton>
        {!persistent && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              minHeight: 44,
              padding: "0 4px",
              border: "none",
              background: "transparent",
              color: isBusiness ? "rgba(255,255,255,0.82)" : t.textSec,
              fontSize: 13,
              fontWeight: 650,
              fontFamily: fontFn,
              cursor: "pointer",
            }}
          >
            Позже
          </button>
        )}
      </div>
    </section>
  );
}
