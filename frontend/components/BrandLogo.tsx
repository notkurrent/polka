import type { CSSProperties } from "react";
import Image from "next/image";

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function BrandLogo({ size = 36, showText = true, className, style }: BrandLogoProps) {
  return (
    <div className={className} aria-label="Polka" style={{ display: "flex", alignItems: "center", gap: 10, ...style }}>
      <Image
        src="/brand/polka-mark.png"
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          display: "block",
          objectFit: "contain",
          flex: "0 0 auto",
        }}
      />
      {showText && (
        <span style={{ color: "#111714", fontSize: 17, fontWeight: 850, letterSpacing: 0, whiteSpace: "nowrap" }}>
          Polka
        </span>
      )}
    </div>
  );
}
