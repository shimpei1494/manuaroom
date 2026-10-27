/** 時間帯に合わせたあいさつ。 */
export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 4 && hour < 11) return "おはようございます";
  if (hour >= 11 && hour < 18) return "こんにちは";
  return "こんばんは";
}
