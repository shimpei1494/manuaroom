import type { ClockPort } from "../../application/ports/clock-port";

export const systemClock: ClockPort = {
  now() {
    return new Date();
  },
};
