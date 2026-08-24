"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useState, useEffect, useCallback, useRef } from "react";
import { IconeMenu, IconeCoche, IconeActualiser, IconeAlerte } from "@/components/icons";

interface EditeurCarnetProps {
  id: number;
  contenuInitial: string;
  lectureSeule: boolean;
}

export function EditeurCarnet({ id, contenuInitial, lectureSeule }: EditeurCarnetProps) {
  const [statutSauvegarde, setStatutSauvegarde] = useState<"enregistre" | "en_cours" | "erreur">("enregistre");
  const [derniereSauvegarde, setDerniereSauvegarde] = useState<Date>(new Date());
  
  // Ref pour éviter de spammer l'API
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: contenuInitial,
    editable: !lectureSeule,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      
      // Sauvegarde en local (Anti-perte)
      try {
        localStorage.setItem(`carnet_brouillon_${id}`, html);
      } catch (e) {
        console.error("Local storage plein", e);
      }

      setStatutSauvegarde("en_cours");

      // Debounce de 2 secondes
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      debounceRef.current = setTimeout(() => {
        sauvegarder(html);
      }, 2000);
    },
  });

  const sauvegarder = useCallback(async (html: string) => {
    try {
      const res = await fetch(`/api/carnet/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu: html }),
      });

      if (!res.ok) throw new Error("Erreur réseau");

      setStatutSauvegarde("enregistre");
      setDerniereSauvegarde(new Date());
      localStorage.removeItem(`carnet_brouillon_${id}`);
    } catch (e) {
      console.error(e);
      setStatutSauvegarde("erreur");
    }
  }, [id]);

  // Si on quitte la page alors qu'il y a des changements non sauvegardés ou erreur réseau
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (statutSauvegarde !== "enregistre") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [statutSauvegarde]);

  // Restauration du brouillon au chargement si existe (et si on a eu une erreur avant)
  useEffect(() => {
    const brouillon = localStorage.getItem(`carnet_brouillon_${id}`);
    if (brouillon && brouillon !== contenuInitial && editor && !lectureSeule) {
      const conf = window.confirm("Un brouillon non sauvegardé a été détecté. Voulez-vous le restaurer ?");
      if (conf) {
        editor.commands.setContent(brouillon);
        setStatutSauvegarde("erreur"); // on le met en erreur pour qu'il resauvegarde au prochain edit ou bouton
      } else {
        localStorage.removeItem(`carnet_brouillon_${id}`);
      }
    }
  }, [id, contenuInitial, editor, lectureSeule]);

  if (!editor) return null;

  return (
    <div className="flex flex-col bg-brand-white border border-brand-light-grey/50 rounded-xl overflow-hidden shadow-sm">
      
      {/* TOOLBAR */}
      {!lectureSeule && (
        <div className="flex items-center gap-1.5 p-2 border-b border-brand-light-grey/50 bg-brand-paper flex-wrap sticky top-0 z-10">
          <ToolbarButton 
            active={editor.isActive("bold")} 
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Gras"
          >
            <strong>G</strong>
          </ToolbarButton>
          <ToolbarButton 
            active={editor.isActive("italic")} 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italique"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton 
            active={editor.isActive("underline")} 
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            label="Souligné"
          >
            <u>S</u>
          </ToolbarButton>

          <div className="w-px h-6 bg-brand-light-grey/50 mx-1" />

          <ToolbarButton 
            active={editor.isActive("heading", { level: 2 })} 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            label="Titre"
          >
            Titre
          </ToolbarButton>

          <div className="w-px h-6 bg-brand-light-grey/50 mx-1" />

          <ToolbarButton 
            active={editor.isActive("bulletList")} 
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="Liste à puces"
          >
            <IconeMenu className="w-4 h-4" /> {/* Remplacement d'icône pour les puces */}
          </ToolbarButton>

          <ToolbarButton 
            active={editor.isActive("orderedList")} 
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="Liste numérotée"
          >
            <span className="font-bold text-xs">1.</span>
          </ToolbarButton>

          <div className="w-px h-6 bg-brand-light-grey/50 mx-1" />

          <ToolbarButton 
            active={editor.isActive({ textAlign: "left" })} 
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            L
          </ToolbarButton>
          <ToolbarButton 
            active={editor.isActive({ textAlign: "center" })} 
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            C
          </ToolbarButton>

          {/* Espace flexible */}
          <div className="flex-1" />

          {/* INDICATEUR DE SAUVEGARDE */}
          <div className="flex items-center gap-2 text-xs font-medium px-2">
            {statutSauvegarde === "enregistre" && (
              <span className="text-brand-success flex items-center gap-1">
                <IconeCoche className="w-3.5 h-3.5" /> Enregistré ({derniereSauvegarde.toLocaleTimeString()})
              </span>
            )}
            {statutSauvegarde === "en_cours" && (
              <span className="text-brand-warm-grey animate-pulse flex items-center gap-1">
                <IconeActualiser className="w-3.5 h-3.5 animate-spin" /> Enregistrement...
              </span>
            )}
            {statutSauvegarde === "erreur" && (
              <div className="flex items-center gap-2">
                <span className="text-brand-orange flex items-center gap-1">
                  <IconeAlerte className="w-3.5 h-3.5" /> ⚠ En attente de synchronisation
                </span>
                <button 
                  onClick={() => sauvegarder(editor.getHTML())}
                  className="bg-brand-orange/10 text-brand-orange px-2 py-1 rounded hover:bg-brand-orange/20 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ZONE D'ÉDITION */}
      <div className="p-4 sm:p-6 min-h-[400px] cursor-text" onClick={() => !lectureSeule && editor.commands.focus()}>
        <EditorContent editor={editor} className="prose prose-sm sm:prose-base max-w-none prose-p:leading-relaxed prose-headings:font-outfit focus:outline-none focus-visible:outline-none" />
      </div>
    </div>
  );
}

function ToolbarButton({ active, onClick, children, label }: { active?: boolean, onClick: () => void, children: React.ReactNode, label?: string }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`h-8 min-w-[32px] px-2 rounded flex items-center justify-center text-sm transition-colors ${
        active 
          ? "bg-brand-black text-brand-white font-medium" 
          : "text-brand-black hover:bg-brand-light-grey/30"
      }`}
    >
      {children}
    </button>
  );
}
