"use client";

import { useRouter } from "next/navigation";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, tokens } from "@/components/ui/primitives";

export default function BizScanDeprecatedPage() {
  const router = useRouter();
  const t = tokens();

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Заявки" onBack={() => router.back()} />
      <div style={{ padding: 16 }}>
        <EmptyState
          icon={Icon.list(34, t.textTer)}
          title="Выдача по коду отключена"
          description="Кабинет продавца теперь работает с товарами магазина. Покупатель связывается с продавцом напрямую."
          compact
        />
        <div style={{ marginTop: 12 }}>
          <PillButtonBiz onClick={() => router.push("/biz/offers")} size="lg">
            Перейти к товарам
          </PillButtonBiz>
        </div>
      </div>
    </AppScreenBiz>
  );
}
