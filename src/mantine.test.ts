import { describe, expect, it } from "vite-plus/test";

describe("Mantine", () => {
  it("@mantine/core パッケージが読み込める", async () => {
    const { MantineProvider } = await import("@mantine/core");
    expect(MantineProvider).toBeDefined();
  });
});
