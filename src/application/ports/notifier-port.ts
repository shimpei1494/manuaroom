/** 家族への通知 (今は LINE 公式アカウントからの一斉送信)。 */
export type NotifierPort = {
  send(message: string): Promise<void>;
};
