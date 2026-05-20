"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Icon, StripePlaceholder, tokens, FONT } from "@/components/ui/primitives";

type ImageState = "idle" | "loading" | "loaded" | "error";

interface OfferImagePickerProps {
  id: string;
  file: File | null;
  imageUrl?: string | null;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  markedForDelete?: boolean;
  onFileChange: (file: File | null) => void;
  onDelete?: () => void;
}

export function OfferImagePicker({
  id,
  file,
  imageUrl,
  loading = false,
  error = "",
  disabled = false,
  markedForDelete = false,
  onFileChange,
  onDelete,
}: OfferImagePickerProps) {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const sourceUrl = markedForDelete ? "" : previewUrl || imageUrl || "";
  const [imageStatus, setImageStatus] = useState<{ url: string; state: ImageState }>({ url: "", state: "idle" });
  const imageState = sourceUrl && imageStatus.url === sourceUrl ? imageStatus.state : sourceUrl ? "loading" : "idle";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const hasPhoto = Boolean(sourceUrl);
  const showFallback = !hasPhoto || imageState === "error";
  const statusText = loading
    ? "Загружаем фото..."
    : error ||
      (markedForDelete
        ? "Фото будет удалено после сохранения."
        : imageState === "error"
          ? "Не удалось показать фото. Можно выбрать другой файл."
          : file
            ? file.name
            : "PNG, JPG или WEBP. Лучше горизонтальное фото товара.");

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 10",
          borderRadius: 12,
          border: `1px solid ${error || imageState === "error" ? t.danger : t.divider}`,
          background: t.surface,
          overflow: "hidden",
          position: "relative",
        }}
        aria-label="Превью фото товара"
      >
        {sourceUrl && imageState !== "error" ? (
          <img
            alt="Фото товара"
            src={sourceUrl}
            onLoad={() => setImageStatus({ url: sourceUrl, state: "loaded" })}
            onError={() => setImageStatus({ url: sourceUrl, state: "error" })}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: imageState === "loaded" ? 1 : 0,
              transition: "opacity 140ms ease",
            }}
          />
        ) : null}
        {showFallback && (
          <StripePlaceholder
            label={markedForDelete ? "без фото" : "фото"}
            h="100%"
            radius={0}
            tone="mint"
            style={{ position: "absolute", inset: 0 }}
          />
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
              fontSize: 12,
              fontWeight: 750,
              fontFamily: fontFn,
            }}
          >
            Загрузка...
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label htmlFor={id} style={actionButton(t, fontFn, disabled)}>
          {Icon.plus(16, disabled ? t.textTer : t.primaryDeep)}
          {hasPhoto ? "Заменить фото" : "Загрузить фото"}
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
        {onDelete && (hasPhoto || markedForDelete) && (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            style={{
              ...actionButton(t, fontFn, disabled),
              color: disabled ? t.textTer : t.danger,
              borderColor: disabled ? t.divider : "#F2B8B8",
            }}
          >
            {markedForDelete ? "Оставить фото" : "Удалить фото"}
          </button>
        )}
      </div>
      <div
        style={{
          minHeight: 18,
          fontSize: 12,
          lineHeight: 1.45,
          color: error || imageState === "error" ? t.danger : t.textSec,
        }}
      >
        {statusText}
      </div>
    </div>
  );
}

export function OfferImagePreview({
  imageUrl,
  label = "товар",
  width = 60,
  height = 60,
  radius = 10,
  tone = "mint",
}: {
  imageUrl?: string | null;
  label?: string;
  width?: number | string;
  height?: number | string;
  radius?: number;
  tone?: string;
}) {
  const t = tokens();
  const [imageStatus, setImageStatus] = useState<{ url: string; state: ImageState }>({ url: "", state: "idle" });
  const imageState = imageUrl && imageStatus.url === imageUrl ? imageStatus.state : imageUrl ? "loading" : "idle";
  const showImage = Boolean(imageUrl) && imageState !== "error";

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        flexShrink: 0,
        background: t.surface,
      }}
      aria-label="Фото товара"
    >
      {showImage ? (
        <img
          alt=""
          src={imageUrl || ""}
          onLoad={() => imageUrl && setImageStatus({ url: imageUrl, state: "loaded" })}
          onError={() => imageUrl && setImageStatus({ url: imageUrl, state: "error" })}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: imageState === "loaded" ? 1 : 0,
            transition: "opacity 140ms ease",
          }}
        />
      ) : null}
      {(!imageUrl || imageState === "error") && (
        <StripePlaceholder label={label} w="100%" h="100%" radius={0} tone={tone} style={{ position: "absolute", inset: 0 }} />
      )}
      {imageState === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.7)" }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${t.divider}`, borderTopColor: t.primaryDeep }} />
        </div>
      )}
    </div>
  );
}

function actionButton(t: ReturnType<typeof tokens>, fontFn: string, disabled: boolean): CSSProperties {
  return {
    minHeight: 40,
    padding: "0 12px",
    borderRadius: 12,
    border: `1px solid ${t.divider}`,
    background: disabled ? t.surface : t.bg,
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
  };
}
