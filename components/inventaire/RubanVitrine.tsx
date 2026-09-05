"use client";

/**
 * RubanVitrine — Étiquette superposée sur le coin d'une carte ou d'une ligne de tableau.
 * Affiche "VITRINE" ou "INVENTAIRE" avec un effet de coin diagonal (folded corner).
 *
 * Design: un petit triangle diagonal dans le coin supérieur-droit,
 * avec un texte court qui s'étend du coin vers la gauche.
 */
import React from "react";
import { Store, Warehouse } from "lucide-react";

interface RubanVitrineProps {
  /** "vitrine" affiche le ruban orange, "inventaire" affiche le ruban gris */
  type: "vitrine" | "inventaire";
  /** Taille du ruban. "card" = carte produit, "row" = ligne tableau */
  taille?: "card" | "row";
  className?: string;
}

export default function RubanVitrine({ type, taille = "card", className = "" }: RubanVitrineProps) {
  if (type === "vitrine") {
    return (
      <div
        className={`pointer-events-none absolute z-20 select-none ${className}`}
        style={{
          top: taille === "card" ? "-1px" : "-1px",
          right: "-1px",
        }}
        aria-label="Exposé en vitrine"
      >
        {/* Bande diagonale (coin supérieur-droit) */}
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{
            width: taille === "card" ? "92px" : "72px",
            height: taille === "card" ? "28px" : "22px",
            background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
            borderRadius: taille === "card" ? "0 0 0 12px" : "0 0 0 8px",
            boxShadow: "0 2px 8px rgba(249, 115, 22, 0.4)",
          }}
        >
          {/* Diagonal fold — triangle noir semi-transparent en haut à droite */}
          <div
            className="absolute"
            style={{
              top: 0,
              right: 0,
              width: taille === "card" ? "24px" : "18px",
              height: taille === "card" ? "24px" : "18px",
              background: "linear-gradient(225deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, transparent 50%)",
            }}
          />
          <span
            className="relative flex items-center gap-1 font-black text-white drop-shadow-sm"
            style={{
              fontSize: taille === "card" ? "9px" : "8px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <Store style={{ width: taille === "card" ? "11px" : "9px", height: taille === "card" ? "11px" : "9px" }} />
            VITRINE
          </span>
        </div>
      </div>
    );
  }

  // type === "inventaire"
  return (
    <div
      className={`pointer-events-none absolute z-20 select-none ${className}`}
      style={{
        top: "-1px",
        right: "-1px",
      }}
      aria-label="En inventaire"
    >
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          width: taille === "card" ? "108px" : "88px",
          height: taille === "card" ? "28px" : "22px",
          background: "linear-gradient(135deg, #475569 0%, #334155 100%)",
          borderRadius: taille === "card" ? "0 0 0 12px" : "0 0 0 8px",
          boxShadow: "0 2px 8px rgba(71, 85, 105, 0.3)",
        }}
      >
        <div
          className="absolute"
          style={{
            top: 0,
            right: 0,
            width: taille === "card" ? "24px" : "18px",
            height: taille === "card" ? "24px" : "18px",
            background: "linear-gradient(225deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, transparent 50%)",
          }}
        />
        <span
          className="relative flex items-center gap-1 font-black text-white drop-shadow-sm"
          style={{
            fontSize: taille === "card" ? "9px" : "8px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <Warehouse style={{ width: taille === "card" ? "11px" : "9px", height: taille === "card" ? "11px" : "9px" }} />
          INVENTAIRE
        </span>
      </div>
    </div>
  );
}
