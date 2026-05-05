"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Icon, FONT, tokens } from "@/components/ui/primitives";

type ImageState = "idle" | "loading" | "loaded" | "error";

interface BusinessLogoPickerProps {
  id: string;
  businessName: string;
  file: File | null;
  logoUrl?: string | null;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
}

export function BusinessLogoPicker({
  id,
  businessName,
  file,
  logoUrl,
  loading = false,
  error = "",
  disabled = false,
  onFileChange,
}: BusinessLogoPickerProps) {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [imageStatus, setImageStatus] = useState<{ url: string; state: ImageState }>({ url: "", state: "idle" });
  const sourceUrl = previewUrl || logoUrl || "";
  const imageState = sourceUrl && imageStatus.url === sourceUrl ? imageStatus.state : sourceUrl ? "loading" : "idle";
  const fallbackLetter = businessName.trim().slice(0, 1).toUpperCase() || "Б";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const imageUnavailable = !sourceUrl || imageState === "error";
  const statusText = loading
    ? "Загружаем логотип..."
    : error || (imageState === "error" ? "Не удалось показать логотип. Можно выбрать другой файл." : "");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 12,
          border: `1px solid ${error || imageState === "error" ? t.danger : t.divider}`,
          background: imageUnavailable ? t.primarySoft : t.surface,
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          position: "relative",
          flexShrink: 0,
        }}
        aria-label="Превью логотипа бизнеса"
      >
        {sourceUrl && imageState !== "error" ? (
          <img
            alt="Логотип бизнеса"
            src={sourceUrl}
            onLoad={() => setImageStatus({ url: sourceUrl, state: "loaded" })}
            onError={() => setImageStatus({ url: sourceUrl, state: "error" })}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: imageState === "loaded" ? 1 : 0,
              transition: "opacity 140ms ease",
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#fff",
              color: t.primaryDeep,
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              fontWeight: 800,
              fontFamily: fontFn,
            }}
          >
            {fallbackLetter}
          </div>
        )}
        {(loading || imageState === "loading") && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.76)",
              color: t.primaryDeep,
              fontSize: 11,
              fontWeight: 750,
              fontFamily: fontFn,
            }}
          >
            ...
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <label
          htmlFor={id}
          style={{
            minHeight: 44,
            padding: "0 14px",
            borderRadius: 9999,
            border: `1px solid ${t.primaryDeep}`,
            background: disabled ? t.surface : "#fff",
            color: disabled ? t.textTer : t.primaryDeep,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: fontFn,
            cursor: disabled ? "default" : "pointer",
            boxSizing: "border-box",
          }}
        >
          {Icon.plus ? Icon.plus(16, disabled ? t.textTer : t.primaryDeep) : null}
          {file || logoUrl ? "Заменить логотип" : "Загрузить логотип"}
        </label>
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          onChange={(event) => {
            onFileChange(event.target.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
          style={{ display: "none" }}
        />
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            lineHeight: 1.45,
            color: error || imageState === "error" ? t.danger : t.textSec,
            minHeight: 18,
          }}
        >
          {statusText || (file ? file.name : "PNG, JPG или WEBP. Будет показан в карточке бизнеса.")}
        </div>
      </div>
    </div>
  );
}

export function BusinessLogoPreview({
  logoUrl,
  businessName,
  size = 48,
  radius = 12,
  style = {},
}: {
  logoUrl?: string | null;
  businessName: string;
  size?: number;
  radius?: number;
  style?: CSSProperties;
}) {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const [imageStatus, setImageStatus] = useState<{ url: string; state: ImageState }>({ url: "", state: "idle" });
  const imageState = logoUrl && imageStatus.url === logoUrl ? imageStatus.state : logoUrl ? "loading" : "idle";
  const showImage = Boolean(logoUrl) && imageState !== "error";
  const fallbackLetter = businessName.trim().slice(0, 1).toUpperCase() || "Б";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        border: `1px solid ${t.divider}`,
        background: t.primarySoft,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        position: "relative",
        flexShrink: 0,
        ...style,
      }}
      aria-label="Логотип бизнеса"
    >
      {showImage ? (
        <img
          alt=""
          src={logoUrl || ""}
          onLoad={() => logoUrl && setImageStatus({ url: logoUrl, state: "loaded" })}
          onError={() => logoUrl && setImageStatus({ url: logoUrl, state: "error" })}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: imageState === "loaded" ? 1 : 0,
            transition: "opacity 140ms ease",
          }}
        />
      ) : (
        <div
          style={{
            width: Math.max(28, size * 0.62),
            height: Math.max(28, size * 0.62),
            borderRadius: "50%",
            background: "#fff",
            color: t.primaryDeep,
            display: "grid",
            placeItems: "center",
            fontSize: Math.max(14, size * 0.3),
            fontWeight: 800,
            fontFamily: fontFn,
          }}
        >
          {fallbackLetter}
        </div>
      )}
      {imageState === "loading" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.52)" }} />
      )}
    </div>
  );
}
