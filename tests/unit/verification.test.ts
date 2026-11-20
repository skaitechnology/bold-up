import { describe, expect, it } from "vitest";
import { toErrorCode } from "@/lib/errors";
import { PRECHECK_ENGINE, parsePrecheckReport, runTechnicalChecks, sniffMimeType } from "@/lib/verification/checks";

const bytes = (...values: number[]) => new Uint8Array(values);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

describe("simulated pre-check", () => {
  const base = { sizeBytes: 2048, typeCode: "carte_pro", fileName: "carte.pdf" };

  it("recognises real PDF, JPEG and PNG files from their first bytes", () => {
    expect(sniffMimeType(PDF)).toBe("application/pdf");
    expect(sniffMimeType(JPEG)).toBe("image/jpeg");
    expect(sniffMimeType(PNG)).toBe("image/png");
    expect(sniffMimeType(bytes(0x4d, 0x5a, 0x90))).toBeNull(); // a Windows executable
  });

  it("passes a readable file of the declared type", () => {
    const report = runTechnicalChecks({ ...base, head: PDF, declaredMimeType: "application/pdf" });
    expect(report.passed).toBe(true);
    expect(report.checks.every((check) => check.passed)).toBe(true);
  });

  it("is always labelled as simulated and never claims authenticity", () => {
    const report = runTechnicalChecks({ ...base, head: PDF, declaredMimeType: "application/pdf" });
    expect(report.simulated).toBe(true);
    expect(report.engine).toBe(PRECHECK_ENGINE);
    expect(JSON.stringify(report)).not.toMatch(/authentic|verified|identity|extracted/i);
  });

  it("fails a file whose content does not match its declared type", () => {
    const report = runTechnicalChecks({ ...base, head: bytes(0x4d, 0x5a, 0x90, 0), declaredMimeType: "application/pdf" });
    expect(report.passed).toBe(false);
    expect(report.checks.find((check) => check.code === "signature_matches")?.passed).toBe(false);
  });

  it("fails a missing, empty, oversized or unsupported file", () => {
    expect(runTechnicalChecks({ ...base, head: null, declaredMimeType: "application/pdf" }).passed).toBe(false);
    expect(runTechnicalChecks({ ...base, head: bytes(), sizeBytes: 0, declaredMimeType: "application/pdf" }).passed).toBe(false);
    expect(runTechnicalChecks({ ...base, head: PDF, sizeBytes: 11 * 1024 * 1024, declaredMimeType: "application/pdf" }).passed).toBe(false);
    expect(runTechnicalChecks({ ...base, head: PDF, declaredMimeType: "application/zip" }).passed).toBe(false);
  });

  it("reads back a stored report defensively", () => {
    const report = runTechnicalChecks({ ...base, head: JPEG, declaredMimeType: "image/jpeg" });
    expect(parsePrecheckReport(JSON.parse(JSON.stringify(report)))?.passed).toBe(true);
    expect(parsePrecheckReport(null)).toBeNull();
    expect(parsePrecheckReport({ checks: "nope" })).toBeNull();
  });
});

describe("error codes", () => {
  it("maps database messages to interface codes", () => {
    expect(toErrorCode({ message: "slot_unavailable" })).toBe("slot_unavailable");
    expect(toErrorCode({ message: "profile_incomplete" })).toBe("profile_incomplete");
    expect(toErrorCode({ message: 'new row violates row-level security policy for table "x"', code: "42501" })).toBe("forbidden");
    expect(toErrorCode({ message: "conflicting key value violates exclusion constraint", code: "23P01" })).toBe("slot_unavailable");
  });
  it("never leaks an unknown message", () => {
    expect(toErrorCode({ message: 'relation "secret_table" does not exist' })).toBe("generic");
    expect(toErrorCode(undefined)).toBe("generic");
  });
});
