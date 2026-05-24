import { describe, it, expect } from "vitest";
import { easing, duration, cardEnter } from "./motion";

describe("motion tokens", () => {
  it("exposes the spec easing curves", () => {
    expect(easing.out).toEqual([0.16, 1, 0.3, 1]);
  });

  it("keeps reveal duration in the 200-400ms band", () => {
    expect(duration.reveal).toBeGreaterThanOrEqual(0.2);
    expect(duration.reveal).toBeLessThanOrEqual(0.4);
  });

  it("cardEnter targets opacity 1 and y 0", () => {
    expect(cardEnter.visible).toMatchObject({ opacity: 1, y: 0 });
  });
});
