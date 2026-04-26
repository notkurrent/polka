import type React from "react";
import type { Tokens } from "@/components/ui/primitives";

export const AUTH_UNDERLINE_INPUT_CLASS = "auth-underline-input";

type AuthInputStyle = React.CSSProperties & {
  "--auth-input-border": string;
  "--auth-input-focus": string;
};

export function authUnderlineInputStyle(t: Tokens, fontFamily: string, fontSize = 20): AuthInputStyle {
  return {
    "--auth-input-border": t.primary,
    "--auth-input-focus": t.primaryDeep,
    width: "100%",
    marginTop: 8,
    padding: "14px 0",
    minHeight: 52,
    border: "none",
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    fontSize,
    fontWeight: 600,
    fontFamily,
    background: "transparent",
    color: t.text,
    caretColor: t.primaryDeep,
    borderRadius: 0,
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    letterSpacing: 0,
    boxSizing: "border-box",
  };
}
