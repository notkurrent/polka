"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import { tokens, Icon, FONT } from "@/components/ui/primitives";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { bizApi, money, parseCodePayload, partnerErrorMessage, type ParsedCodePayload } from "@/lib/biz-api";
import type { OrderDetail } from "@/lib/api-types";

function initialCodePayload(): ParsedCodePayload | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const initialCode = params.get("code");
  const initialOrderId = params.get("orderId");
  const parsed = initialCode ? parseCodePayload(initialCode) : null;
  if (parsed) {
    return initialOrderId ? { ...parsed, orderId: Number(initialOrderId) } : parsed;
  }
  if (initialOrderId) {
    return { code: "", orderId: Number(initialOrderId) };
  }
  return null;
}

export default function BizScanPage() {
  const t = tokens();
  const router = useRouter();
  const fontFn = FONT ? FONT() : "system-ui";

  const [initialPayload] = useState(initialCodePayload);
  const [digits, setDigits] = useState(() =>
    initialPayload?.code ? initialPayload.code.split("") : ["", "", "", ""],
  );
  const [orderId, setOrderId] = useState<number | undefined>(() => initialPayload?.orderId);
  const [scannerActive, setScannerActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<OrderDetail | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");
  const ready = code.length === 4;

  function applyParsed(parsed: ParsedCodePayload) {
    setDigits(parsed.code.split(""));
    if (parsed.orderId) setOrderId(parsed.orderId);
  }

  useEffect(() => {
    if (!scannerActive) return;
    const el = document.getElementById("qr-reader");
    if (!el) return;

    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(
      (decodedText) => {
        const parsed = parseCodePayload(decodedText);
        if (parsed) {
          applyParsed(parsed);
          setError("");
        } else {
          setError("QR не похож на код Polka.");
        }
        scanner.clear().catch(console.error);
        setScannerActive(false);
      },
      () => undefined,
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [scannerActive]);

  const commission = useMemo(() => Math.round(Number(completed?.total || 0) * 0.17), [completed]);

  const setDigit = (index: number, value: string) => {
    const onlyDigit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = onlyDigit;
    setDigits(next);
    setError("");
    if (onlyDigit && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const pasteCode = (index: number, value: string) => {
    const pasted = value.replace(/\D/g, "").slice(0, 4 - index);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    setDigits(next);
    setError("");
    inputsRef.current[Math.min(3, index + pasted.length)]?.focus();
  };

  const verify = async () => {
    if (!ready) {
      setError("Введите 4 цифры кода.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await bizApi.verifyCode({ code, order_id: orderId });
      setCompleted(result);
    } catch (err) {
      setError(partnerErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <AppScreenBiz style={{ fontFamily: fontFn }}>
        <AppHeaderBiz title="Выдача" onBack={() => router.back()} />
        <div
          style={{
            padding: "52px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: t.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icon.check(56, t.primaryDeep)}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0 }}>Заказ выдан</div>
            <div style={{ fontSize: 13, color: t.textSec, marginTop: 6 }}>
              Код {completed.code} · {completed.offer.name}
            </div>
          </div>
          <div
            style={{
              background: t.surface,
              borderRadius: 12,
              padding: 14,
              border: `1px solid ${t.divider}`,
              width: "100%",
            }}
          >
            <SummaryRow label="Оплачено клиентом" value={money(completed.total)} />
            <SummaryRow label="Комиссия 17%" value={`-${money(commission)}`} />
            <div style={{ height: 1, background: t.divider, margin: "8px 0" }} />
            <SummaryRow label="Ваша выручка" value={money(Number(completed.total) - commission)} strong />
          </div>
          <PillButtonBiz onClick={() => router.push("/biz/orders")}>К заказам</PillButtonBiz>
        </div>
      </AppScreenBiz>
    );
  }

  return (
    <AppScreenBiz style={{ fontFamily: fontFn }}>
      <AppHeaderBiz title="Принять заказ" onBack={() => router.back()} />
      <div style={{ padding: "24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {!scannerActive ? (
          <button
            type="button"
            onClick={() => setScannerActive(true)}
            style={{
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "0 20px",
              background: t.primarySoft,
              color: t.primaryDeep,
              border: `1px solid ${t.primary}`,
              borderRadius: 14,
              cursor: "pointer",
              fontWeight: 650,
              fontFamily: fontFn,
              fontSize: 14,
            }}
          >
            {Icon.search(20, t.primaryDeep)}
            Сканировать QR
          </button>
        ) : (
          <div>
            <div id="qr-reader" style={{ width: "100%", borderRadius: 12, overflow: "hidden" }} />
            <button type="button" onClick={() => setScannerActive(false)} style={secondaryButton(t, fontFn)}>
              Закрыть сканер
            </button>
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 750, letterSpacing: 0 }}>Введите код выдачи</div>
          <div style={{ fontSize: 13, color: t.textSec, marginTop: 6 }}>
            4 цифры из заказа покупателя{orderId ? ` · заказ #${orderId}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {[0, 1, 2, 3].map((index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              value={digits[index]}
              onChange={(event) => setDigit(index, event.target.value)}
              onPaste={(event) => {
                event.preventDefault();
                pasteCode(index, event.clipboardData.getData("text"));
              }}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digits[index] && index > 0) {
                  inputsRef.current[index - 1]?.focus();
                }
              }}
              maxLength={1}
              inputMode="numeric"
              name={`code-${index + 1}`}
              aria-label={`Цифра ${index + 1}`}
              autoComplete="off"
              style={{
                width: 56,
                height: 64,
                textAlign: "center",
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "ui-monospace, monospace",
                border: `1.5px solid ${digits[index] ? t.primaryDeep : t.divider}`,
                borderRadius: 14,
                color: t.primaryDeep,
                background: digits[index] ? t.primarySoft : "#fff",
                boxSizing: "border-box",
              }}
            />
          ))}
        </div>

        {error && <div style={{ textAlign: "center", fontSize: 13, color: t.danger, fontWeight: 650 }}>{error}</div>}

        <PillButtonBiz onClick={verify} disabled={!ready || loading} size="lg">
          {loading ? "Проверяем…" : "Подтвердить выдачу"}
        </PillButtonBiz>
      </div>
    </AppScreenBiz>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const t = tokens();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: strong ? 15 : 13, marginBottom: 6 }}>
      <span style={{ color: strong ? t.text : t.textSec, fontWeight: strong ? 750 : 400 }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 700 }}>{value}</span>
    </div>
  );
}

function secondaryButton(t: ReturnType<typeof tokens>, fontFn: string): CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    marginTop: 10,
    background: t.surface,
    color: t.textSec,
    border: `1px solid ${t.divider}`,
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: fontFn,
  };
}
