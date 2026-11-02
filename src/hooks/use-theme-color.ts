import { useColorScheme } from "@/hooks/use-color-scheme";

const Colors = {
  light: {
    text: "#111827",
    background: "#ffffff",
    tint: "#1d4ed8",
    icon: "#6b7280",
    tabIconDefault: "#9ca3af",
    tabIconSelected: "#1d4ed8",
  },
  dark: {
    text: "#f3f4f6",
    background: "#0f172a",
    tint: "#60a5fa",
    icon: "#cbd5e1",
    tabIconDefault: "#64748b",
    tabIconSelected: "#60a5fa",
  },
};

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}
