import { cn } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("cn", () => {
  it("joins only truthy class names", () => {
    expect(cn("base", false, null, undefined, "accent")).toBe("base accent");
  });
});
