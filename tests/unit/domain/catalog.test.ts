import { describe, it, expect } from "vitest";
import {
  educationLevels,
  academicSections,
  subjects,
  governorates,
} from "@/lib/domain/catalog";

describe("Catalog Domain Constants", () => {
  describe("educationLevels", () => {
    it("should have all standard Tunisian education levels defined", () => {
      expect(educationLevels.length).toBeGreaterThan(0);
      expect(educationLevels.length).toBe(15); // 6 primary + 3 basic + 3 secondary + university + formation + bac
    });

    it("should correctly define PRIMARY cycle levels (1 to 6)", () => {
      const primaryLevels = educationLevels.filter((lvl) => lvl.cycle === "PRIMARY");
      expect(primaryLevels).toHaveLength(6);
      expect(primaryLevels.map((lvl) => lvl.slug)).toEqual([
        "primaire-1",
        "primaire-2",
        "primaire-3",
        "primaire-4",
        "primaire-5",
        "primaire-6",
      ]);
    });

    it("should correctly define BASIC cycle levels (7, 8, 9)", () => {
      const basicLevels = educationLevels.filter((lvl) => lvl.cycle === "BASIC");
      expect(basicLevels).toHaveLength(3);
      expect(basicLevels.map((lvl) => lvl.slug)).toEqual([
        "base-7",
        "base-8",
        "base-9",
      ]);
    });

    it("should correctly define SECONDARY cycle levels", () => {
      const secondaryLevels = educationLevels.filter((lvl) => lvl.cycle === "SECONDARY");
      expect(secondaryLevels.map((lvl) => lvl.slug)).toContain("secondaire-1");
      expect(secondaryLevels.map((lvl) => lvl.slug)).toContain("secondaire-2");
      expect(secondaryLevels.map((lvl) => lvl.slug)).toContain("secondaire-3");
      expect(secondaryLevels.map((lvl) => lvl.slug)).toContain("bac");
    });

    it("should ensure every level has a valid slug, name, and cycle", () => {
      educationLevels.forEach((level) => {
        expect(level.slug).toBeTruthy();
        expect(typeof level.slug).toBe("string");
        expect(level.name).toBeTruthy();
        expect(typeof level.name).toBe("string");
        expect(["PRIMARY", "BASIC", "SECONDARY", "UNIVERSITY", "PROFESSIONAL"]).toContain(level.cycle);
      });
    });

    it("should ensure all slugs are unique", () => {
      const slugs = educationLevels.map((lvl) => lvl.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });

  describe("academicSections", () => {
    it("should contain standard Tunisian secondary sections", () => {
      expect(academicSections).toContain("Mathématiques");
      expect(academicSections).toContain("Sciences expérimentales");
      expect(academicSections).toContain("Économie et Gestion");
      expect(academicSections).toContain("Sciences de l'informatique");
      expect(academicSections).toContain("Sciences techniques");
      expect(academicSections).toContain("Lettres");
      expect(academicSections).toContain("Sport");
    });

    it("should have exactly 7 academic sections", () => {
      expect(academicSections.length).toBe(7);
    });
  });

  describe("subjects", () => {
    it("should include core Arabic, French, Math, Science, and English subjects", () => {
      expect(subjects).toContain("الرياضيات");
      expect(subjects).toContain("Mathématiques");
      expect(subjects).toContain("العربية");
      expect(subjects).toContain("Français");
      expect(subjects).toContain("English");
      expect(subjects).toContain("Informatique");
      expect(subjects).toContain("Physique");
      expect(subjects).toContain("Philosophie");
    });

    it("should have unique subject names", () => {
      const uniqueSubjects = new Set(subjects);
      expect(uniqueSubjects.size).toBe(subjects.length);
    });
  });

  describe("governorates", () => {
    it("should contain all 24 Tunisian governorates", () => {
      expect(governorates.length).toBe(24);
      expect(governorates).toContain("Tunis");
      expect(governorates).toContain("Ariana");
      expect(governorates).toContain("Ben Arous");
      expect(governorates).toContain("Manouba");
      expect(governorates).toContain("Sousse");
      expect(governorates).toContain("Sfax");
      expect(governorates).toContain("Bizerte");
      expect(governorates).toContain("Tataouine");
      expect(governorates).toContain("Gafsa");
      expect(governorates).toContain("Medenine");
    });

    it("should not have duplicates in governorates", () => {
      const uniqueGovs = new Set(governorates);
      expect(uniqueGovs.size).toBe(24);
    });
  });
});
