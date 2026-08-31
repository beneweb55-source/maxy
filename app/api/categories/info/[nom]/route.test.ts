import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
import { NextResponse } from "next/server";

// Mock des dépendances
vi.mock("@/lib/api", () => ({
  exigerUtilisateur: vi.fn(),
  erreur: vi.fn((status, msg) => NextResponse.json({ error: msg }, { status })),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    categorieInfo: {
      upsert: vi.fn(),
    },
  },
}));

import { exigerUtilisateur } from "@/lib/api";
import { prisma } from "@/lib/db";

describe("PATCH /api/categories/[nom]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devrait retourner 403 si l'utilisateur n'est ni gérant ni dev", async () => {
    (exigerUtilisateur as any).mockResolvedValue({
      user: null,
      reponse: NextResponse.json(
        { error: "Seul un gérant ou développeur peut modifier l'image d'une catégorie." },
        { status: 403 }
      ),
    });

    const req = new Request("http://localhost/api/categories/Test", {
      method: "PATCH",
      body: JSON.stringify({ image_url: "http://test.com/img.jpg" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ nom: "Test" }) });
    const json = await res.json();
    
    expect(res.status).toBe(403);
    expect(json.error).toBe("Seul un gérant ou développeur peut modifier l'image d'une catégorie.");
  });

  it("devrait mettre à jour et retourner 200 pour un gérant", async () => {
    (exigerUtilisateur as any).mockResolvedValue({
      user: { role: "gerant" },
      reponse: null,
    });
    
    const mockDbResult = { nom: "Test", image_url: "http://test.com/img.jpg" };
    (prisma.categorieInfo.upsert as any).mockResolvedValue(mockDbResult);

    const req = new Request("http://localhost/api/categories/Test", {
      method: "PATCH",
      body: JSON.stringify({ image_url: "http://test.com/img.jpg" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ nom: "Test" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(mockDbResult);
    expect(prisma.categorieInfo.upsert).toHaveBeenCalledWith({
      where: { nom: "Test" },
      update: { image_url: "http://test.com/img.jpg" },
      create: { nom: "Test", image_url: "http://test.com/img.jpg", description: null },
    });
  });
});
