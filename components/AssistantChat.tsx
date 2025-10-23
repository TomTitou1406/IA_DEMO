type AssistantChatProps = {
  avatar: string;
  // ajoute d’autres props ici si tu veux, par ex. "history", "onSend"
};

export default function AssistantChat({ avatar }: AssistantChatProps) {
  return (
    <div>
      {/* ton composant, par ex. afficher avatar */}
      Avatar actuel : {avatar}
    </div>
  );
}
