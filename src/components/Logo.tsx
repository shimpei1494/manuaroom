import { Group, Text, ThemeIcon } from "@mantine/core";
import { IconHomeHeart } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Group
      gap={10}
      wrap="nowrap"
      className="logo"
      renderRoot={(props) => <Link to="/" aria-label="Manuaroom ホーム" {...props} />}
    >
      <ThemeIcon
        size={36}
        radius="md"
        variant="gradient"
        gradient={{ from: "mint.4", to: "teal.7", deg: 135 }}
      >
        <IconHomeHeart size={22} stroke={1.8} />
      </ThemeIcon>
      <Text className="logo-text" fz={22} fw={700}>
        Manuaroom
      </Text>
    </Group>
  );
}
