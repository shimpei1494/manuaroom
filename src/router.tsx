import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // リンクにカーソルを乗せた・指で触れた時点で、移動先のコードとデータを先に読み込む
    defaultPreload: "intent",
  });

  return router;
}
