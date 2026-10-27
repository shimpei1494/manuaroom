import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  return (
    <ActionIcon
      onClick={() => {
        setColorScheme(computed === "dark" ? "light" : "dark");
      }}
      size="lg"
      variant="default"
      aria-label="カラースキーム切替"
    >
      {/* どちらのアイコンを出すかは CSS で切り替え、サーバーとブラウザの描画差を避ける */}
      <IconSun size={20} stroke={1.7} className="mantine-light-hidden" />
      <IconMoon size={20} stroke={1.7} className="mantine-dark-hidden" />
    </ActionIcon>
  );
}
