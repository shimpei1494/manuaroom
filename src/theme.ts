import {
  ActionIcon,
  Badge,
  Button,
  Card,
  type MantineColorsTuple,
  Modal,
  Paper,
  createTheme,
} from "@mantine/core";

// 家の手入れを連想させる、さわやかなミントグリーン。ボタンやリンクなどの主役の色。
const mint: MantineColorsTuple = [
  "#e6fbf5",
  "#d5f3ea",
  "#ade5d3",
  "#80d6bb",
  "#5bcaa7",
  "#43c29a",
  "#33be93",
  "#22a77f",
  "#119570",
  "#008160",
];

// 「期限が近い」「スキップ」などに使う、あたたかいアプリコット。
const apricot: MantineColorsTuple = [
  "#fff2e6",
  "#ffe4cf",
  "#fdc79f",
  "#fba86a",
  "#f98e3e",
  "#f97d21",
  "#f97411",
  "#de6204",
  "#c55600",
  "#ac4800",
];

const HEADING_FONT = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', system-ui, sans-serif";

export const theme = createTheme({
  primaryColor: "mint",
  primaryShade: { light: 7, dark: 6 },
  colors: { mint, apricot },
  defaultRadius: "md",
  cursorType: "pointer",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily: HEADING_FONT,
    fontWeight: "700",
  },
  radius: { md: "12px", lg: "16px", xl: "24px" },
  shadows: {
    xs: "0 1px 2px rgba(16, 40, 32, 0.06)",
    sm: "0 1px 3px rgba(16, 40, 32, 0.06), 0 4px 12px rgba(16, 40, 32, 0.05)",
    md: "0 4px 10px rgba(16, 40, 32, 0.07), 0 12px 28px rgba(16, 40, 32, 0.07)",
  },
  components: {
    Button: Button.extend({ defaultProps: { radius: "xl" } }),
    ActionIcon: ActionIcon.extend({ defaultProps: { radius: "xl" } }),
    Badge: Badge.extend({ defaultProps: { radius: "sm" } }),
    Card: Card.extend({ defaultProps: { radius: "lg", shadow: "sm", withBorder: true } }),
    Paper: Paper.extend({ defaultProps: { radius: "lg" } }),
    Modal: Modal.extend({ defaultProps: { radius: "lg", centered: true } }),
  },
});
