import { tokens, Icon, PillButton } from "./primitives";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = tokens();
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        color: t.textSec,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: t.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Icon.close(28, t.textTer)}
      </div>
      <div role="alert" style={{ fontSize: 14, color: t.textSec, lineHeight: 1.45 }}>
        {message || "Что-то пошло не так. Проверьте соединение и попробуйте ещё раз."}
      </div>
      {onRetry && (
        <PillButton variant="outline" size="md" onClick={onRetry}>
          Попробовать снова
        </PillButton>
      )}
    </div>
  );
}
