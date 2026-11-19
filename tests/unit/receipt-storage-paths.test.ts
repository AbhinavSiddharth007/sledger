import { describe, expect, it } from "vitest";
import { isAllowedMediaType, isAlreadyStored, receiptPath } from "@/lib/storage";

const ORG = "11111111-1111-4111-8111-111111111111";
const PROJECT = "22222222-2222-4222-8222-222222222222";
const HASH = "a".repeat(64);

describe("receiptPath", () => {
  it("puts the file under its organization and project, named by its hash", () => {
    expect(receiptPath(ORG, PROJECT, HASH, "application/pdf")).toBe(`${ORG}/${PROJECT}/${HASH}.pdf`);
    expect(receiptPath(ORG, PROJECT, HASH, "image/jpeg")).toBe(`${ORG}/${PROJECT}/${HASH}.jpg`);
    expect(receiptPath(ORG, PROJECT, HASH, "image/png")).toBe(`${ORG}/${PROJECT}/${HASH}.png`);
    expect(receiptPath(ORG, PROJECT, HASH, "image/webp")).toBe(`${ORG}/${PROJECT}/${HASH}.webp`);
  });

  it("refuses a type it does not store", () => {
    expect(() => receiptPath(ORG, PROJECT, HASH, "image/gif")).toThrow("Unsupported file type");
  });

  it("refuses anything that is not a SHA-256 hex digest, so no path can be forged", () => {
    expect(() => receiptPath(ORG, PROJECT, "../../etc", "image/png")).toThrow("SHA-256");
    expect(() => receiptPath(ORG, PROJECT, "A".repeat(64), "image/png")).toThrow("SHA-256");
  });
});

describe("isAlreadyStored", () => {
  it("recognises storage's conflict error, which means the same file was uploaded before", () => {
    expect(isAlreadyStored({ statusCode: "409", message: "The resource already exists" })).toBe(true);
    expect(isAlreadyStored({ message: "The resource already exists" })).toBe(true);
  });

  it("does not hide other failures", () => {
    expect(isAlreadyStored({ statusCode: "403", message: "new row violates row-level security policy" })).toBe(false);
    expect(isAlreadyStored({ statusCode: "413", message: "The object exceeded the maximum allowed size" })).toBe(false);
  });
});

describe("isAllowedMediaType", () => {
  it("accepts the four types receipts come in, and nothing else", () => {
    expect(["application/pdf", "image/jpeg", "image/png", "image/webp"].every(isAllowedMediaType)).toBe(true);
    expect(isAllowedMediaType("text/html")).toBe(false);
    expect(isAllowedMediaType("image/gif")).toBe(false);
  });
});
