"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  IconeMenu, IconeCoche, IconeActualiser, IconeAlerte,
  IconeGras, IconeItalique, IconeSouligne, IconeBarre,
  IconeAlignementGauche, IconeAlignementCentre, IconeAlignementDroite, IconeAlignementJustifie,
  IconeListePuces, IconeListeNumerotee, IconeAnnuler, IconeRetablir, IconeLien, IconeImage,
  IconeParagraphe, IconeH1, IconeH2, IconeH3,
  IconeCouleurTexte, IconeSurligner
} from "@/components/icons";

interface EditeurCarnetProps {
  id: number;
  contenuInitial: string;
  lectureSeule: boolean;
}

export function EditeurCarnet({ id, contenuInitial, lectureSeule }: EditeurCarnetProps) {
  const [statutSauvegarde, setStatutSauvegarde] = useState<"enregistre" | "en_cours" | "erreur">("enregistre");
  const [derniereSauvegarde, setDerniereSauvegarde] = useState<Date>(new Date());
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const contenuActuelRef = useRef(contenuInitial);

  const extensions = React.useMemo(() => [
    StarterKit,
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({ openOnClick: false }),
    Image,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
  ], []);

  const editor = useEditor({
    extensions,
    editorProps: {
      attributes: {
        class: 'focus:outline-none focus-visible:outline-none',
      },
    },
    content: contenuInitial,
    editable: !lectureSeule,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      contenuActuelRef.current = html;
      
      try {
        localStorage.setItem(`carnet_brouillon_${id}`, html);
      } catch (e) {
        console.error("Local storage plein", e);
      }

      setStatutSauvegarde("en_cours");

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

  // Sauvegarde garantie lors de la fermeture ou du changement de page (keepalive)
  useEffect(() => {
    return () => {
      if (contenuActuelRef.current !== contenuInitial) {
        fetch(`/api/carnet/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contenu: contenuActuelRef.current }),
          keepalive: true, // Crucial pour que la requête passe même si on change de page
        }).catch(console.error);
      }
    };
  }, [id, contenuInitial]);

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

  useEffect(() => {
    const brouillon = localStorage.getItem(`carnet_brouillon_${id}`);
    if (brouillon && brouillon !== contenuInitial && editor && !lectureSeule) {
      const conf = window.confirm("Un brouillon non sauvegardé a été détecté. Voulez-vous le restaurer ?");
      if (conf) {
        editor.commands.setContent(brouillon);
        setStatutSauvegarde("erreur");
      } else {
        localStorage.removeItem(`carnet_brouillon_${id}`);
      }
    }
  }, [id, contenuInitial, editor, lectureSeule]);

  const addLink = useCallback(() => {
    const url = window.prompt("URL du lien :");
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().unsetLink().run();
      return;
    }
    editor?.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("URL de l'image :");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col bg-[var(--color-bg-primary)] border border-brand-light-grey/30 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none transition-shadow focus-within:shadow-[0_4px_12px_rgba(0,0,0,0.06)] focus-within:border-brand-grey/30 group">
      
      {!lectureSeule && (
        <div className="flex items-center gap-1 p-2 border-b border-brand-light-grey/30 bg-brand-light-grey/5 dark:bg-black/20 overflow-x-auto touch-scroll-x no-scrollbar sticky top-0 z-10">
          
          {/* Groupe 1 : Texte */}
          <div className="flex items-center gap-0.5 shrink-0">
            <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Gras">
              <IconeGras className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italique">
              <IconeItalique className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Souligné">
              <IconeSouligne className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Barré">
              <IconeBarre className="w-4 h-4" />
            </ToolbarButton>

            {/* Sélecteurs de couleur discrets */}
            <div className="relative group/color ml-1">
              <label 
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-brand-grey hover:bg-brand-light-grey/20 hover:text-brand-black transition-colors overflow-hidden"
                title="Couleur du texte"
              >
                <IconeCouleurTexte className="w-4 h-4" />
                <input 
                  type="color" 
                  className="absolute opacity-0 w-full h-full cursor-pointer inset-0"
                  onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                />
              </label>
            </div>
            
            <div className="relative group/highlight ml-0.5">
              <label 
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-brand-grey hover:bg-brand-light-grey/20 hover:text-brand-black transition-colors overflow-hidden"
                title="Surligner"
              >
                <IconeSurligner className="w-4 h-4" />
                <input 
                  type="color" 
                  className="absolute opacity-0 w-full h-full cursor-pointer inset-0"
                  onInput={(e) => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()}
                />
              </label>
            </div>
          </div>

          <ToolbarSeparator />

          {/* Groupe 2 : Structure */}
          <div className="flex items-center gap-0.5 shrink-0">
            <ToolbarButton active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} label="Texte normal">
              <IconeParagraphe className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Titre 1">
              <IconeH1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Titre 2">
              <IconeH2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Titre 3">
              <IconeH3 className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Groupe 3 : Listes */}
          <div className="flex items-center gap-0.5 shrink-0">
            <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Liste à puces">
              <IconeListePuces className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Liste numérotée">
              <IconeListeNumerotee className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Groupe 4 : Alignement */}
          <div className="flex items-center gap-0.5 shrink-0 hidden sm:flex">
            <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} label="Aligner à gauche">
              <IconeAlignementGauche className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} label="Centrer">
              <IconeAlignementCentre className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} label="Aligner à droite">
              <IconeAlignementDroite className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} label="Justifier">
              <IconeAlignementJustifie className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <ToolbarSeparator className="hidden sm:block" />

          {/* Groupe 5 : Insertion */}
          <div className="flex items-center gap-0.5 shrink-0">
            <ToolbarButton active={editor.isActive("link")} onClick={addLink} label="Lien">
              <IconeLien className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={addImage} label="Image">
              <IconeImage className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Groupe 6 : Historique */}
          <div className="flex items-center gap-0.5 shrink-0">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Annuler" disabled={!editor.can().undo()}>
              <IconeAnnuler className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Rétablir" disabled={!editor.can().redo()}>
              <IconeRetablir className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Espace flexible */}
          <div className="flex-1 min-w-[20px]" />

          {/* INDICATEUR DE SAUVEGARDE DISCRET */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 shrink-0">
            {statutSauvegarde === "enregistre" && (
              <span className="text-brand-grey flex items-center gap-1 opacity-70">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-success"></span> Enregistré
              </span>
            )}
            {statutSauvegarde === "en_cours" && (
              <span className="text-brand-grey flex items-center gap-1 opacity-70">
                <IconeActualiser className="w-3 h-3 animate-spin" /> En cours
              </span>
            )}
            {statutSauvegarde === "erreur" && (
              <div className="flex items-center gap-2">
                <span className="text-brand-orange flex items-center gap-1">
                  <IconeAlerte className="w-3 h-3" /> Sync en attente
                </span>
                <button 
                  onClick={() => sauvegarder(editor.getHTML())}
                  className="bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded hover:bg-brand-orange/20 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ZONE D'ÉDITION */}
      <div 
        className={`w-full relative mx-auto max-w-3xl p-6 sm:p-12 min-h-[500px] cursor-text transition-colors duration-300 ${!lectureSeule ? "hover:bg-brand-light-grey/5 dark:hover:bg-brand-light-grey/5" : ""}`}
        onClick={() => !lectureSeule && editor.commands.focus()}
      >
        {!editor.getText() && !lectureSeule && (
          <div className="absolute text-brand-grey/50 pointer-events-none mt-[2px] ml-[2px]">
            Commencez à rédiger votre rapport...
          </div>
        )}
        <EditorContent 
          editor={editor} 
          className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-p:leading-8 prose-p:text-brand-black/90 dark:prose-p:text-white/90 prose-headings:font-outfit prose-headings:tracking-tight prose-a:text-brand-orange prose-img:rounded-xl prose-img:shadow-sm focus:outline-none focus-visible:outline-none" 
        />
      </div>
    </div>
  );
}

function ToolbarSeparator({ className = "" }: { className?: string }) {
  return <div className={`w-[1px] h-5 bg-brand-light-grey/40 mx-1 shrink-0 ${className}`} />;
}

function ToolbarButton({ 
  active, 
  onClick, 
  children, 
  label,
  disabled 
}: { 
  active?: boolean, 
  onClick: () => void, 
  children: React.ReactNode, 
  label?: string,
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
        disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
      } ${
        active 
          ? "bg-brand-light-grey/40 text-brand-black dark:text-white dark:bg-white/20 font-medium" 
          : "text-brand-grey hover:bg-brand-light-grey/20 hover:text-brand-black dark:hover:bg-white/10 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
