import type { AuthPort } from "../../application/ports/auth-port";

export const LOCAL_USER_ID = "local-user-1";

export const localAuth: AuthPort = {
  requireUserId() {
    return Promise.resolve(LOCAL_USER_ID);
  },
};
