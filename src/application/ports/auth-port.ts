export type AuthPort = {
  requireUserId(): Promise<string>;
};
