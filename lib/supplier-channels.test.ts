import { describe, expect, it } from "vitest";
import { channelsOf } from "./supplier-channels";

describe("channelsOf", () => {
  it("según los datos del contacto", () => {
    expect(channelsOf({ email: "a@x.com", whatsapp: "662 111 2233" })).toEqual(["email", "whatsapp"]);
    expect(channelsOf({ phone: "(662) 111-2233" })).toEqual(["whatsapp"]);
    expect(channelsOf({ email: " ", whatsapp: "12345" })).toEqual([]);
    expect(channelsOf(null)).toEqual([]);
  });
});
