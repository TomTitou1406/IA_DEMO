"use client";

type AssistantChatProps = {
  avatar: string;
  // autres props
};

export default function AssistantChat({ avatar }: AssistantChatProps) {
  // Composant interactif
  return (
    <div>
      Avatar actuel : {avatar}
      {/* Zone de chat avec events */}
    </div>
  );
}
