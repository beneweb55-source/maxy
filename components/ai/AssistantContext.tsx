"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import AssistantIA from "./AssistantIA";

interface AssistantContextType {
  openAssistant: (context?: any, initialPrompt?: string) => void;
  closeAssistant: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant doit être utilisé au sein d'un AssistantProvider");
  }
  return context;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState<any>(undefined);
  // On pourrait ajouter initialPrompt si on veut pré-remplir la barre

  const openAssistant = (ctx?: any) => {
    setCurrentContext(ctx);
    setIsOpen(true);
  };

  const closeAssistant = () => {
    setIsOpen(false);
    setCurrentContext(undefined);
  };

  return (
    <AssistantContext.Provider value={{ openAssistant, closeAssistant }}>
      {children}
      <AssistantIA 
        isOpen={isOpen} 
        onClose={closeAssistant} 
        context={currentContext} 
      />
    </AssistantContext.Provider>
  );
}
