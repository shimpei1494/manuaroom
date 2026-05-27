import { Button, Center, Stack, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [isBlue, setIsBlue] = useState(false);
  return (
    <Center h="100vh">
      <Stack gap="md" align="center">
        <Title order={1} c={isBlue ? "blue" : "red"}>
          Hello World!
        </Title>
        <Button onClick={() => setIsBlue((prev) => !prev)}>Toggle</Button>
      </Stack>
    </Center>
  );
}
