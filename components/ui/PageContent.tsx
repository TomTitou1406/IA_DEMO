"use client";

import AssistantChat from "@/components/ui/AssistantChat";
import ActionsBar from "@/components/ui/ActionsBar";

export default function PageContent() {
  return (
    <>
      <AssistantChat avatar="recruteur" />
      <ActionsBar
        buttons={[
          { label: "Décrire mon entreprise", onClick: () => alert("Action 1") },
          { label: "Ajouter un visuel", onClick: () => alert("Action 2") },
        ]}
      />
      {/* Contenu métier supplémentaire */}
    </>
  );
}
