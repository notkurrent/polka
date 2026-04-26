declare const React: typeof import("react");
type ReactNode = import("react").ReactNode;
type ReactCssProperties = import("react").CSSProperties;
type ReactComponentType<P = unknown> = import("react").ComponentType<P>;
declare const ReactDOM: {
  createRoot(container: Element | DocumentFragment): { render(node: ReactNode): void };
};

interface Tokens {
  bg: string;
  surface: string;
  divider: string;
  primary: string;
  primarySoft: string;
  primaryDeep: string;
  text: string;
  textSec: string;
  textTer: string;
  danger: string;
  warn: string;
  star: string;
}

interface Offer {
  id: string;
  title: string;
  desc: string;
  original: number;
  now: number;
  qty: number;
  pickup: string;
  tone: string;
  label: string;
}

interface Store {
  id: string;
  name: string;
  cat: string;
  rating: number;
  reviews: number;
  address: string;
  district: string;
  distanceKm: number;
  hours: string;
  pickup: string;
  x: number;
  y: number;
  tone: string;
  imgLabel: string;
  about: string;
  offers: Offer[];
}

interface FlattenedOffer extends Offer {
  storeId: string;
  storeName: string;
  address: string;
  rating: number;
  distanceKm: number;
  x: number;
  y: number;
}

interface CartItem extends Offer {
  storeId: string;
  storeName: string;
}

interface ActiveOrder {
  code: string;
  storeName: string;
  address: string;
  pickup: string;
  items: CartItem[];
  total: number;
  tone: string;
  expiresIn: number;
}

interface OrderHistoryItem {
  id: string;
  storeName: string;
  amount: number;
  date: string;
  status: "done" | "expired" | "cancelled";
  tone: string;
}

interface BizReservation {
  id: string;
  code: string;
  customer: string;
  items: string;
  amount: number;
  expiresIn: number;
  status: "active" | "expired" | "done";
}

interface BizAnalytics {
  today: { orders: number; revenue: number; saved: number };
  week: number[];
  reviewsCount: number;
  avgRating: number;
  balance: number;
  conversion: number;
}

interface StripePlaceholderProps {
  tone?: string;
  w?: number | string;
  h?: number | string;
  radius?: number;
  label?: string;
  style?: ReactCssProperties;
}

interface PillButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "dark" | "muted" | "danger";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  disabled?: boolean;
  style?: ReactCssProperties;
}

interface PriceTagProps {
  original: number;
  now: number;
  size?: "sm" | "md" | "lg";
}

interface BadgeProps {
  children?: ReactNode;
  tone?: "green" | "solid" | "dark" | "neutral" | "amber" | "red";
  size?: "sm" | "md";
}

interface MapPin {
  x: number;
  y: number;
  label: string;
}

interface GridMapProps {
  width?: number | string;
  height?: number | string;
  pins?: MapPin[];
  selectedIdx?: number;
  onPin?: (idx: number) => void;
  centerLabel?: string;
  style?: ReactCssProperties;
}

interface QRCodeProps {
  value?: string;
  size?: number;
}

type IconFn = (size?: number, color?: string, filled?: boolean) => ReactNode;

interface IconSet {
  back: IconFn;
  close: IconFn;
  search: IconFn;
  pin: IconFn;
  heart: IconFn;
  clock: IconFn;
  star: IconFn;
  check: IconFn;
  plus: IconFn;
  minus: IconFn;
  home: IconFn;
  list: IconFn;
  user: IconFn;
  bag: IconFn;
  chart: IconFn;
  leaf: IconFn;
  chevronR: IconFn;
  filter: IconFn;
  bell: IconFn;
}

interface AppScreenProps {
  children?: ReactNode;
  bg?: string;
  style?: ReactCssProperties;
}

declare const __tokens: () => Tokens;
declare const __FONT_FN: (...args: unknown[]) => string;
declare const __Icon: IconSet;

interface Window {
  __TWEAKS?: Record<string, unknown>;
  __GREEN?: string;
  __FONT?: string;
  __FEED_LAYOUT?: "map+list" | "list-only" | "map-only";
  __tokens?: () => Tokens;
  __FONT_FN?: (...args: unknown[]) => string;
  __Icon?: IconSet;
  STORES?: Store[];
  ALL_OFFERS?: FlattenedOffer[];
  BIZ_RESERVATIONS?: BizReservation[];
  BIZ_ANALYTICS?: BizAnalytics;
  StripePlaceholder?: ReactComponentType<StripePlaceholderProps>;
  PillButton?: ReactComponentType<PillButtonProps>;
  PriceTag?: ReactComponentType<PriceTagProps>;
  Badge?: ReactComponentType<BadgeProps>;
  GridMap?: ReactComponentType<GridMapProps>;
  QRCode?: ReactComponentType<QRCodeProps>;
  AppHeader?: ReactComponentType<unknown>;
  TabBar?: ReactComponentType<unknown>;
  LandingScreen?: ReactComponentType<unknown>;
  SignupScreen?: ReactComponentType<unknown>;
  MainFeedScreen?: ReactComponentType<unknown>;
  StoreScreen?: ReactComponentType<unknown>;
  CartScreen?: ReactComponentType<unknown>;
  ActiveOrderScreen?: ReactComponentType<unknown>;
  RatingScreen?: ReactComponentType<unknown>;
  OrdersScreen?: ReactComponentType<unknown>;
  FavoritesScreen?: ReactComponentType<unknown>;
  StatTile?: ReactComponentType<unknown>;
  BizTabBar?: ReactComponentType<unknown>;
  BizRegisterScreen?: ReactComponentType<unknown>;
  BizDashboardScreen?: ReactComponentType<unknown>;
  BizCreateOfferScreen?: ReactComponentType<unknown>;
  BizCodeEntryScreen?: ReactComponentType<unknown>;
  BuyerApp?: ReactComponentType<unknown>;
  BusinessApp?: ReactComponentType<unknown>;
}
