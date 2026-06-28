"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { tokens, FONT } from "@/components/ui/primitives";
import { bizApi, partnerErrorMessage, type AddressSuggestion } from "@/lib/biz-api";
import { BUSINESS_CATEGORIES, DEFAULT_BUSINESS_CATEGORY } from "@/lib/business-constants";
import { Skeleton } from "@/components/ui/Skeleton";
import { BusinessLogoPicker } from "@/components/biz/BusinessLogoPicker";
import { hapticNotification } from "@/lib/haptics";

type ScheduleDay = {
  short: string;
  name: string;
  enabled: boolean;
  from: string;
  to: string;
};

type PartnerProfileForm = {
  name: string;
  category: string;
  address: string;
  map_url: string;
  phone: string;
  whatsapp_url: string;
  telegram_url: string;
  instagram_url: string;
  website_url: string;
  hours: string;
  description: string;
};

const DEFAULT_FROM = "09:00";
const DEFAULT_TO = "21:00";
const WEEK_DAYS: Array<Pick<ScheduleDay, "short" | "name">> = [
  { short: "Пн", name: "Понедельник" },
  { short: "Вт", name: "Вторник" },
  { short: "Ср", name: "Среда" },
  { short: "Чт", name: "Четверг" },
  { short: "Пт", name: "Пятница" },
  { short: "Сб", name: "Суббота" },
  { short: "Вс", name: "Воскресенье" },
];

function defaultSchedule(): ScheduleDay[] {
  return WEEK_DAYS.map((day, index) => ({
    ...day,
    enabled: index < 5,
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  }));
}

function scheduleFromHours(hours: string): ScheduleDay[] {
  const schedule = defaultSchedule();
  const timeMatch = hours.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
  if (!timeMatch) return schedule;

  return schedule.map((day) => ({
    ...day,
    from: timeMatch[1],
    to: timeMatch[2],
  }));
}

function formatSchedule(schedule: ScheduleDay[]) {
  const enabled = schedule.filter((day) => day.enabled);
  if (!enabled.length) return "Выходной";

  const sameTime = enabled.every((day) => day.from === enabled[0].from && day.to === enabled[0].to);
  const allWeekdays =
    enabled.length === 5 && enabled.every((day, index) => index < 5 && day.short === WEEK_DAYS[index].short);
  const allWeek = enabled.length === 7;

  if (sameTime && allWeek) return `Ежедневно ${enabled[0].from}-${enabled[0].to}`;
  if (sameTime && allWeekdays) return `Пн-Пт ${enabled[0].from}-${enabled[0].to}`;
  return enabled.map((day) => `${day.short} ${day.from}-${day.to}`).join("; ");
}

export default function BizProfileEditPage() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";

  const [data, setData] = useState<PartnerProfileForm>({
    name: "",
    category: DEFAULT_BUSINESS_CATEGORY,
    address: "",
    map_url: "",
    phone: "",
    whatsapp_url: "",
    telegram_url: "",
    instagram_url: "",
    website_url: "",
    hours: "09:00-21:00",
    description: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [schedule, setSchedule] = useState<ScheduleDay[]>(defaultSchedule);
  const [addressQuery, setAddressQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    bizApi
      .profile()
      .then((profile) => {
        const hours = profile.hours || "09:00-21:00";
        setData({
          name: profile.name || "",
          category: profile.category || DEFAULT_BUSINESS_CATEGORY,
          address: profile.address || "",
          map_url: profile.map_url || "",
          phone: profile.phone || "",
          whatsapp_url: profile.whatsapp_url || "",
          telegram_url: profile.telegram_url || "",
          instagram_url: profile.instagram_url || "",
          website_url: profile.website_url || "",
          hours,
          description: profile.description || "",
        });
        setLogoUrl(profile.logo_url || null);
        setAddressQuery(profile.address || "");
        setSelectedAddress(
          profile.address
            ? {
                label: profile.address,
                lat: profile.lat ?? 43.238949,
                lon: profile.lon ?? 76.889709,
              }
            : null,
        );
        setSchedule(scheduleFromHours(hours));
      })
      .catch((err) => setError(partnerErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const categories = BUSINESS_CATEGORIES;
  const formattedHours = formatSchedule(schedule);
  const shouldSearchAddress = addressQuery.trim().length >= 3 && selectedAddress?.label !== addressQuery.trim();
  const {
    data: addressSuggestions,
    isLoading: isAddressLoading,
    error: addressError,
  } = useSWR(
    shouldSearchAddress ? ["partner-address-suggestions", addressQuery.trim()] : null,
    ([, value]) => bizApi.addressSuggestions(value),
    { keepPreviousData: true },
  );

  const toggleDay = (index: number) => {
    setSchedule((current) =>
      current.map((day, dayIndex) => (dayIndex === index ? { ...day, enabled: !day.enabled } : day)),
    );
  };

  const updateTime = (index: number, field: "from" | "to", value: string) => {
    setSchedule((current) => current.map((day, dayIndex) => (dayIndex === index ? { ...day, [field]: value } : day)));
  };

  const save = async () => {
    if (!data.name.trim() || !data.address.trim()) {
      hapticNotification("error");
      setError("Название и адрес обязательны.");
      return;
    }
    if (!selectedAddress || selectedAddress.label !== data.address.trim()) {
      hapticNotification("error");
      setError("Выберите адрес из подсказок, чтобы сохранить реальную точку в Алматы.");
      return;
    }
    if (!schedule.some((day) => day.enabled)) {
      hapticNotification("error");
      setError("Выберите хотя бы один рабочий день.");
      return;
    }
    setSaving(true);
    setError("");
    setLogoError("");
    try {
      await bizApi.updateProfile({
        name: data.name.trim(),
        category: data.category,
        address: selectedAddress.label,
        hours: formattedHours,
        description: data.description.trim(),
        map_url: data.map_url.trim() || null,
        phone: data.phone.trim() || null,
        whatsapp_url: data.whatsapp_url.trim() || null,
        telegram_url: data.telegram_url.trim() || null,
        instagram_url: data.instagram_url.trim() || null,
        website_url: data.website_url.trim() || null,
        lat: selectedAddress.lat,
        lon: selectedAddress.lon,
      });
      if (logoFile) {
        setLogoUploading(true);
        try {
          const updatedProfile = await bizApi.uploadLogo(logoFile);
          setLogoUrl(updatedProfile.logo_url || null);
          setLogoFile(null);
        } catch (uploadError) {
          hapticNotification("warning");
          setLogoError(partnerErrorMessage(uploadError));
          setError("Данные сохранены, но логотип не загрузился. Выберите другой файл и попробуйте снова.");
          return;
        } finally {
          setLogoUploading(false);
        }
      }
      hapticNotification("success");
      router.push("/biz/profile");
    } catch (err) {
      hapticNotification("error");
      setError(partnerErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreenBiz className="biz-profile-edit-screen">
      <AppHeaderBiz title="Редактировать" onBack={() => router.back()} />
      <div className="biz-form-content biz-profile-edit-content" style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14, fontFamily: fontFn }}>
        {loading ? (
          <>
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={120} radius={12} />
          </>
        ) : (
          <>
            <Field label="Название магазина">
              <input
                name="partner-name"
                aria-label="Название магазина"
                value={data.name}
                onChange={(event) => setData({ ...data, name: event.target.value })}
                style={inputStyle(t, fontFn)}
              />
            </Field>

            <Field label="Логотип бизнеса" className="biz-form-field-wide">
              <BusinessLogoPicker
                id="biz-profile-logo"
                businessName={data.name}
                file={logoFile}
                logoUrl={logoUrl}
                loading={logoUploading}
                error={logoError}
                disabled={saving || logoUploading}
                onFileChange={(file) => {
                  setLogoFile(file);
                  setLogoError("");
                  setError("");
                }}
              />
            </Field>

            <div className="biz-form-field-wide">
              <Label>Категория</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {categories.map((opt) => {
                  const on = data.category === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setData({ ...data, category: opt })}
                      data-haptic="selection"
                      style={{
                        minHeight: 44,
                        padding: "0 12px",
                        borderRadius: 9999,
                        border: `1px solid ${on ? t.primaryDeep : t.divider}`,
                        background: on ? t.primaryDeep : "#fff",
                        color: on ? "#fff" : t.text,
                        fontSize: 12,
                        fontWeight: 650,
                        cursor: "pointer",
                        fontFamily: fontFn,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="biz-form-field-wide">
              <Label>Адрес</Label>
              <div style={{ marginTop: 6, position: "relative" }}>
                <input
                  name="partner-address"
                  aria-label="Адрес"
                  value={addressQuery}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAddressQuery(value);
                    setData({ ...data, address: value });
                    setSelectedAddress(null);
                    setError("");
                  }}
                  placeholder="Начните вводить адрес в Алматы"
                  autoComplete="off"
                  style={inputStyle(t, fontFn)}
                />
                {shouldSearchAddress && (
                  <div
                    style={{
                      marginTop: 6,
                      border: `1px solid ${t.divider}`,
                      borderRadius: 12,
                      background: "#fff",
                      overflow: "hidden",
                    }}
                  >
                    {isAddressLoading && (
                      <div style={{ padding: "12px 14px", fontSize: 13, color: t.textSec }}>Ищем адреса...</div>
                    )}
                    {addressError && (
                      <div style={{ padding: "12px 14px", fontSize: 13, color: t.danger }}>
                        Не удалось загрузить адреса. Попробуйте ещё раз.
                      </div>
                    )}
                    {!isAddressLoading && !addressError && (addressSuggestions || []).length === 0 && (
                      <div style={{ padding: "12px 14px", fontSize: 13, color: t.textSec }}>
                        Адрес не найден. Уточните улицу или номер дома.
                      </div>
                    )}
                    {!addressError &&
                      (addressSuggestions || []).map((suggestion) => (
                        <button
                          key={`${suggestion.place_id ?? suggestion.label}-${suggestion.lat}-${suggestion.lon}`}
                          type="button"
                          onClick={() => {
                            setSelectedAddress(suggestion);
                            setAddressQuery(suggestion.label);
                            setData({ ...data, address: suggestion.label });
                            setError("");
                          }}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            border: "none",
                            borderBottom: `1px solid ${t.divider}`,
                            background: "#fff",
                            color: t.text,
                            textAlign: "left",
                            fontSize: 13,
                            lineHeight: 1.35,
                            fontFamily: fontFn,
                            cursor: "pointer",
                          }}
                        >
                          {suggestion.label}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: selectedAddress ? t.primaryDeep : t.textSec,
                }}
              >
                {selectedAddress ? "Адрес выбран из карты Алматы." : "Сохранить можно только адрес из подсказок."}
              </div>
            </div>

            <Field label="Ссылка на 2GIS / карту">
              <input
                name="partner-map-url"
                aria-label="Ссылка на 2GIS или карту"
                value={data.map_url}
                onChange={(event) => setData({ ...data, map_url: event.target.value })}
                placeholder="https://2gis.kz/..."
                style={inputStyle(t, fontFn)}
              />
            </Field>

            <Field label="Телефон">
              <input
                name="partner-phone"
                aria-label="Телефон"
                value={data.phone}
                onChange={(event) => setData({ ...data, phone: event.target.value })}
                placeholder="+7 700 123 45 67"
                style={inputStyle(t, fontFn)}
              />
            </Field>

            <Field label="WhatsApp">
              <input
                name="partner-whatsapp"
                aria-label="WhatsApp"
                value={data.whatsapp_url}
                onChange={(event) => setData({ ...data, whatsapp_url: event.target.value })}
                placeholder="https://wa.me/77001234567"
                style={inputStyle(t, fontFn)}
              />
            </Field>

            <Field label="Telegram">
              <input
                name="partner-telegram"
                aria-label="Telegram"
                value={data.telegram_url}
                onChange={(event) => setData({ ...data, telegram_url: event.target.value })}
                placeholder="https://t.me/store"
                style={inputStyle(t, fontFn)}
              />
            </Field>

            <Field label="Instagram">
              <input
                name="partner-instagram"
                aria-label="Instagram"
                value={data.instagram_url}
                onChange={(event) => setData({ ...data, instagram_url: event.target.value })}
                placeholder="https://instagram.com/store"
                style={inputStyle(t, fontFn)}
              />
            </Field>

            <Field label="Сайт">
              <input
                name="partner-website"
                aria-label="Сайт"
                value={data.website_url}
                onChange={(event) => setData({ ...data, website_url: event.target.value })}
                placeholder="https://example.kz"
                style={inputStyle(t, fontFn)}
              />
            </Field>

            <div className="biz-form-field-wide">
              <Label>Часы работы</Label>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {schedule.map((day, index) => (
                  <div
                    key={day.short}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      border: `1px solid ${day.enabled ? t.primary : t.divider}`,
                      borderRadius: 12,
                      background: day.enabled ? t.primarySoft : t.bg,
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={day.enabled}
                      aria-label={`${day.name}: ${day.enabled ? "рабочий день" : "выходной"}`}
                      onClick={() => toggleDay(index)}
                      data-haptic="selection"
                      style={{
                        width: 44,
                        height: 28,
                        borderRadius: 9999,
                        border: "none",
                        background: day.enabled ? t.primaryDeep : t.divider,
                        position: "relative",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#fff",
                          position: "absolute",
                          top: 3,
                          left: day.enabled ? 19 : 3,
                          transition: "left 140ms ease",
                        }}
                      />
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{day.name}</div>
                      {!day.enabled && <div style={{ marginTop: 2, fontSize: 12, color: t.textSec }}>Выходной</div>}
                    </div>
                    {day.enabled && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="time"
                          inputMode="numeric"
                          name={`${day.short}-from`}
                          aria-label={`${day.name}, начало работы`}
                          value={day.from}
                          onChange={(event) => updateTime(index, "from", event.target.value)}
                          style={timeInputStyle(t, fontFn)}
                        />
                        <span style={{ color: t.textSec, fontSize: 12 }}>-</span>
                        <input
                          type="time"
                          inputMode="numeric"
                          name={`${day.short}-to`}
                          aria-label={`${day.name}, конец работы`}
                          value={day.to}
                          onChange={(event) => updateTime(index, "to", event.target.value)}
                          style={timeInputStyle(t, fontFn)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45, color: t.textSec }}>
                В профиле будет показано: <strong style={{ color: t.text }}>{formattedHours}</strong>
              </div>
            </div>

            <Field label="Описание" className="biz-form-field-wide">
              <textarea
                value={data.description}
                name="partner-description"
                aria-label="Описание"
                onChange={(event) => setData({ ...data, description: event.target.value })}
                rows={4}
                style={{ ...inputStyle(t, fontFn), resize: "vertical" }}
              />
            </Field>

            <div
              className="biz-form-message"
              style={{
                padding: 12,
                background: t.primarySoft,
                color: t.primaryDeep,
                borderRadius: 12,
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              Геопозицию магазина можно будет уточнить отдельно. Сейчас используется точка по умолчанию для Алматы.
            </div>

            {error && <div className="biz-form-message" style={{ color: t.danger, fontSize: 13, fontWeight: 650 }}>{error}</div>}
            <PillButtonBiz onClick={save} disabled={saving || logoUploading} size="lg" style={{ marginTop: 8 }}>
              {saving || logoUploading ? "Сохранение…" : "Сохранить"}
            </PillButtonBiz>
          </>
        )}
      </div>
    </AppScreenBiz>
  );
}

function Label({ children }: { children: ReactNode }) {
  const t = tokens();
  return (
    <label style={{ fontSize: 11, color: t.textSec, fontWeight: 650, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {children}
    </label>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={["biz-form-field", className].filter(Boolean).join(" ")}>
      <Label>{label}</Label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function inputStyle(t: ReturnType<typeof tokens>, fontFn: string): CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    border: `1px solid ${t.divider}`,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: fontFn,
    boxSizing: "border-box",
    WebkitAppearance: "none",
    appearance: "none",
    outline: "none",
  };
}

function timeInputStyle(t: ReturnType<typeof tokens>, fontFn: string): CSSProperties {
  return {
    width: 78,
    minHeight: 40,
    padding: "8px 6px",
    border: `1px solid ${t.divider}`,
    borderRadius: 12,
    background: "#fff",
    color: t.text,
    fontSize: 16,
    fontWeight: 700,
    fontFamily: fontFn,
    textAlign: "center",
    boxSizing: "border-box",
    WebkitAppearance: "none",
    appearance: "none",
    outline: "none",
  };
}
