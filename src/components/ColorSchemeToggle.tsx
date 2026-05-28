import { Button, useMantineColorScheme } from "@mantine/core";

export function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Button
      onClick={() => {
        toggleColorScheme();
      }}
      size="xs"
      variant="default"
      aria-label="カラースキーム切替"
    >
      {isDark ? "ライト" : "ダーク"}
    </Button>
  );
}
