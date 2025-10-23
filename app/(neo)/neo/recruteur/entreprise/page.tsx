import AssistantChat from "@/components/ui/AssistantChat";
import ActionsBar from "@/components/ui/ActionsBar";

export default function RecruteurEntreprise() {
  return (
    <section className="w-full max-w-3xl mx-auto flex flex-col gap-8">
      <AssistantChat
        avatar="recruteur"
        // ...pass history, onSend, etc.
      />
      <ActionsBar
        buttons={[
          { label: "Décrire mon entreprise", onClick: () => {/* ... */} },
          { label: "Ajouter un visuel", onClick: () => {/* ... */} },
        ]}
      />
      <div>
        {/* Section métier/page : formulaire, liste, etc. */}
      </div>
    </section>
  );
}
