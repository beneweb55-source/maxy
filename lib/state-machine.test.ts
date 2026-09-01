import { describe, it, expect } from "vitest";
import { 
  peutTransitionner, 
  verifierTransition, 
  transitionsPossibles, 
  estEligibleOverrideVente,
  REGLES_MACHINE_ETATS
} from "./state-machine";

describe("State Machine — Cycle de vie atelier", () => {
  it("autorise les transitions du workflow standard", () => {
    // RECU -> EN_TEST
    expect(peutTransitionner("recu", "en_test")).toBe(true);
    expect(verifierTransition("recu", "en_test").valide).toBe(true);

    // EN_TEST -> OK, A_REPARER, MANQUE_PIECE, HS
    expect(peutTransitionner("en_test", "ok")).toBe(true);
    expect(peutTransitionner("en_test", "a_reparer")).toBe(true);
    expect(peutTransitionner("en_test", "manque_piece")).toBe(true);
    expect(peutTransitionner("en_test", "hs")).toBe(true);

    // MANQUE_PIECE -> A_REPARER
    expect(peutTransitionner("manque_piece", "a_reparer")).toBe(true);

    // A_REPARER -> OK
    expect(peutTransitionner("a_reparer", "ok")).toBe(true);

    // OK -> EN_VENTE
    expect(peutTransitionner("ok", "en_vente")).toBe(true);

    // EN_VENTE -> VENDU
    expect(peutTransitionner("en_vente", "vendu")).toBe(true);
  });

  it("bloque strictement les transitions illégales", () => {
    // Impossible de passer directement de RECU à EN_VENTE sans test atelier
    expect(peutTransitionner("recu", "en_vente")).toBe(false);
    expect(verifierTransition("recu", "en_vente").valide).toBe(false);
    expect(verifierTransition("recu", "en_vente").erreur).toContain("ne peut passer que vers");

    // Impossible de passer de MANQUE_PIECE directement à OK sans réparation
    expect(peutTransitionner("manque_piece", "ok")).toBe(false);

    // Impossible de modifier un état final (HS ou VENDU)
    expect(peutTransitionner("hs", "en_test")).toBe(false);
    expect(verifierTransition("hs", "en_test").erreur).toContain("état final verrouillé");

    expect(peutTransitionner("vendu", "en_vente")).toBe(false);
    expect(verifierTransition("vendu", "en_vente").erreur).toContain("état final verrouillé");
  });

  it("gère l'éligibilité à l'Override POS au comptoir", () => {
    expect(estEligibleOverrideVente("recu")).toBe(true);
    expect(estEligibleOverrideVente("en_test")).toBe(true);
    expect(estEligibleOverrideVente("ok")).toBe(true);
    expect(estEligibleOverrideVente("a_reparer")).toBe(true);
    expect(estEligibleOverrideVente("manque_piece")).toBe(true);

    // Strictement rejetés
    expect(estEligibleOverrideVente("hs")).toBe(false);
    expect(estEligibleOverrideVente("vendu")).toBe(false);
    expect(estEligibleOverrideVente("produit_commande")).toBe(false);
  });
});
