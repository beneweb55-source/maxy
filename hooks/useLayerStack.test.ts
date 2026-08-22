import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  pushLayer,
  popLayer,
  closeTopLayer,
  hasOpenLayers,
  LAYER_PRIORITY,
} from "./useLayerStack";

describe("useLayerStack", () => {
  beforeEach(() => {
    // Nettoyer la pile
    while (hasOpenLayers()) {
      closeTopLayer();
    }
  });

  it("gère l'empilement et le dépilement simple", () => {
    const fermerModal = vi.fn();
    pushLayer("modal-1", fermerModal, LAYER_PRIORITY.MODALE);

    expect(hasOpenLayers()).toBe(true);

    const handled = closeTopLayer();
    expect(handled).toBe(true);
    expect(fermerModal).toHaveBeenCalledTimes(1);
    expect(hasOpenLayers()).toBe(false);
  });

  it("respecte la hiérarchie de priorité (Scanner > Visionneuse > Modale > Menu)", () => {
    const actions: string[] = [];

    pushLayer("menu", () => actions.push("menu"), LAYER_PRIORITY.MENU);
    pushLayer("modal", () => actions.push("modal"), LAYER_PRIORITY.MODALE);
    pushLayer("scanner", () => actions.push("scanner"), LAYER_PRIORITY.SCANNER);
    pushLayer("visionneuse", () => actions.push("visionneuse"), LAYER_PRIORITY.VISIONNEUSE);

    expect(closeTopLayer()).toBe(true);
    expect(actions).toEqual(["scanner"]);

    expect(closeTopLayer()).toBe(true);
    expect(actions).toEqual(["scanner", "visionneuse"]);

    expect(closeTopLayer()).toBe(true);
    expect(actions).toEqual(["scanner", "visionneuse", "modal"]);

    expect(closeTopLayer()).toBe(true);
    expect(actions).toEqual(["scanner", "visionneuse", "modal", "menu"]);

    expect(hasOpenLayers()).toBe(false);
    expect(closeTopLayer()).toBe(false);
  });

  it("ne dépile pas si le callback renvoie explicitement false (annulation confirmation dirty)", () => {
    const callbackRefusant = vi.fn(() => false);
    pushLayer("modal-dirty", callbackRefusant, LAYER_PRIORITY.MODALE);

    // 1er retour ➔ refusé par l'utilisateur
    const handled1 = closeTopLayer();
    expect(handled1).toBe(true);
    expect(callbackRefusant).toHaveBeenCalledTimes(1);
    expect(hasOpenLayers()).toBe(true); // Toujours dans la pile

    // 2e retour ➔ l'utilisateur accepte cette fois
    callbackRefusant.mockReturnValue(true);
    const handled2 = closeTopLayer();
    expect(handled2).toBe(true);
    expect(callbackRefusant).toHaveBeenCalledTimes(2);
    expect(hasOpenLayers()).toBe(false); // Dépilé
  });
});
