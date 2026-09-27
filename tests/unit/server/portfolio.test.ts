import { describe, it, expect } from "vitest";
import { parsePortfolioInput, PORTFOLIO_TYPES } from "@/lib/server/portfolio";

describe("parsePortfolioInput", () => {
  const validImage = {
    title: "Sujet de Bac 2024 corrigé",
    description: "Corrigé détaillé étape par étape.",
    type: "IMAGE",
    subject: "Mathématiques",
    level: "Baccalauréat (Bac)",
    mediaUrl: "https://example.com/bac-2024.png",
  };

  it("accepts a well-formed image réalisation", () => {
    const result = parsePortfolioInput(validImage);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Sujet de Bac 2024 corrigé");
      expect(result.value.type).toBe("IMAGE");
      expect(result.value.mediaUrl).toBe("https://example.com/bac-2024.png");
      expect(result.value.externalUrl).toBeNull();
    }
  });

  it("rejects a missing body", () => {
    expect(parsePortfolioInput(null).ok).toBe(false);
    expect(parsePortfolioInput("nope").ok).toBe(false);
  });

  it("rejects a title that is too short or too long", () => {
    expect(parsePortfolioInput({ ...validImage, title: "ab" }).ok).toBe(false);
    expect(parsePortfolioInput({ ...validImage, title: "x".repeat(121) }).ok).toBe(false);
  });

  it("rejects a description over 1200 characters", () => {
    expect(parsePortfolioInput({ ...validImage, description: "x".repeat(1201) }).ok).toBe(false);
  });

  it("rejects an unknown type", () => {
    expect(parsePortfolioInput({ ...validImage, type: "AUDIO" }).ok).toBe(false);
  });

  it("requires an uploaded file for non-link types", () => {
    const withoutFile = { ...validImage, mediaUrl: "" };
    expect(parsePortfolioInput(withoutFile).ok).toBe(false);
  });

  it("requires an http(s) URL for a LINK and stores it as the media", () => {
    const badLink = parsePortfolioInput({ ...validImage, type: "LINK", externalUrl: "javascript:alert(1)" });
    expect(badLink.ok).toBe(false);

    const goodLink = parsePortfolioInput({
      ...validImage,
      type: "LINK",
      externalUrl: "https://youtube.com/watch?v=abc",
    });
    expect(goodLink.ok).toBe(true);
    if (goodLink.ok) {
      expect(goodLink.value.mediaUrl).toBe("https://youtube.com/watch?v=abc");
      expect(goodLink.value.externalUrl).toBe("https://youtube.com/watch?v=abc");
    }
  });

  it("normalises blank optional fields to null", () => {
    const result = parsePortfolioInput({ ...validImage, subject: "  ", level: "", description: "   " });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subject).toBeNull();
      expect(result.value.level).toBeNull();
      expect(result.value.description).toBeNull();
    }
  });

  it("exposes exactly the four supported types", () => {
    expect([...PORTFOLIO_TYPES]).toEqual(["IMAGE", "DOCUMENT", "VIDEO", "LINK"]);
  });
});