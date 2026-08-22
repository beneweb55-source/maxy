"use client";

import { useState, useRef, useEffect } from "react";
import { IconeAssistant, IconeFermer, IconeLancer } from "@/components/icons";
import { useT } from "@/lib/i18n/contexte";

interface ActionIA {
  action: string;
  produit_id?: number;
  new_price?: number;
  en_vitrine?: boolean;
}

interface MessageIA {
  role: "user" | "ai";
  text: string;
  actions?: ActionIA[];
}

// Extraction du JSON depuis la réponse du modèle
function extraireActions(texte: string): { texteEpuré: string; actions: ActionIA[] } {
  const actions: ActionIA[] = [];
  const regex = /```json\n([\s\S]*?)\n```/g;
  let texteEpuré = texte;
  
  let match;
  while ((match = regex.exec(texte)) !== null) {
    try {
      if (match[1]) {
        const obj = JSON.parse(match[1]);
        if (obj && obj.action) {
          actions.push(obj);
        }
      }
    } catch (e) {
      console.error("Erreur de parsing de l'action IA", e);
    }
  }

  texteEpuré = texte.replace(regex, "").trim();

  return { texteEpuré, actions };
}

export default function AssistantIA({
  context,
  isOpen,
  onClose,
}: {
  context?: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [messages, setMessages] = useState<MessageIA[]>([
    { role: "ai", text: "Bonjour ! Je suis Gemini, l'assistant IA de Gestion-Maxy. Comment puis-je vous aider ?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const executerAction = async (action: ActionIA) => {
    if (action.action === "update_price" && action.produit_id && action.new_price !== undefined) {
      try {
        const res = await fetch(`/api/produits/${action.produit_id}`, {
          method: "PUT",
          body: JSON.stringify({ prix_vente_fixe: action.new_price }),
        });
        if (res.ok) {
          setMessages(prev => [...prev, { role: "ai", text: "✅ Le prix a été mis à jour avec succès." }]);
        } else {
          setMessages(prev => [...prev, { role: "ai", text: "❌ Erreur lors de la mise à jour." }]);
        }
      } catch (e) {
        setMessages(prev => [...prev, { role: "ai", text: "❌ Erreur réseau." }]);
      }
    }
    
    if (action.action === "toggle_vitrine" && action.produit_id && action.en_vitrine !== undefined) {
      try {
        const res = await fetch(`/api/produits/${action.produit_id}`, {
          method: "PUT",
          body: JSON.stringify({ en_vitrine: action.en_vitrine }),
        });
        if (res.ok) {
          setMessages(prev => [...prev, { role: "ai", text: `✅ Le produit a été ${action.en_vitrine ? "placé en" : "retiré de la"} vitrine.` }]);
        }
      } catch (e) {
        // ...
      }
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const msgUser = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msgUser }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: msgUser, context }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Trop de demandes en ce moment, réessaie dans quelques secondes.");
        }
        throw new Error("Désolé, l'assistant IA est temporairement indisponible.");
      }

      const data = await res.json();
      const { texteEpuré, actions } = extraireActions(data.reply);
      
      setMessages(prev => [...prev, { role: "ai", text: texteEpuré, actions }]);
    } catch (e: any) {
      const errorMessage = e.message || "Désolé, l'assistant IA est temporairement indisponible.";
      setMessages(prev => [...prev, { role: "ai", text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  // On Desktop it's a side panel on the right. On mobile it's a bottom sheet.
  // Using fixed positioning for a global overlay.
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden animate-entree"
        onClick={onClose} 
      />
      <div className="fixed inset-x-0 bottom-0 z-[70] flex flex-col bg-brand-white shadow-2xl rounded-t-3xl border-t border-brand-light-grey lg:inset-y-0 lg:right-0 lg:left-auto lg:w-96 lg:rounded-none lg:border-l lg:border-t-0 animate-entree max-h-[85vh] lg:max-h-screen safe-bottom">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light-grey bg-brand-paper/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#8A2BE2] to-[#4169E1] text-white shadow-sm">
              <IconeAssistant taille={18} />
            </div>
            <h2 className="font-semibold text-brand-smooth font-outfit">Assistant IA</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-brand-grey hover:bg-brand-light-grey hover:text-brand-black transition"
          >
            <IconeFermer taille={18} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`px-4 py-2.5 rounded-2xl max-w-[90%] ${
                m.role === "user" 
                  ? "bg-brand-black text-white rounded-br-none"
                  : "bg-brand-light-grey/50 text-brand-black rounded-bl-none border border-brand-light-grey"
              }`}>
                <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
              </div>
              
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 flex flex-col gap-2 w-full pl-2 pr-2">
                  {m.actions.map((act, actIdx) => (
                    <div key={actIdx} className="bg-brand-paper border border-brand-light-grey rounded-xl p-3 shadow-sm text-sm flex justify-between items-center">
                      <div>
                        {act.action === "update_price" && <span>Nouveau prix : <strong>{act.new_price} DA</strong></span>}
                        {act.action === "toggle_vitrine" && <span>Vitrine : <strong>{act.en_vitrine ? "Oui" : "Non"}</strong></span>}
                      </div>
                      <button 
                        onClick={() => executerAction(act)}
                        className="bg-brand-black text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-smooth transition"
                      >
                        Appliquer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 p-2">
              <div className="w-2 h-2 rounded-full bg-brand-grey animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-brand-grey animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 rounded-full bg-brand-grey animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          )}
        </div>

        <div className="p-4 bg-brand-white border-t border-brand-light-grey">
          <form onSubmit={submit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Posez votre question..."
              className="flex-1 bg-brand-light-grey/50 border border-brand-light-grey rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-brand-black text-white p-2.5 rounded-xl disabled:opacity-50 hover:bg-brand-smooth transition flex items-center justify-center shrink-0"
            >
              <IconeLancer taille={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
