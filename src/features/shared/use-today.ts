import { useState } from "react";

/**
 * 画面を開いた時点の現在時刻。描画のたびに new Date() すると React Compiler が
 * 最適化できない (react/purity) ので、最初の描画で一度だけ取って使い回す。
 */
export function useToday(): Date {
  const [today] = useState(() => new Date());
  return today;
}
