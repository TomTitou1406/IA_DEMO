"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { DEFAULT_USER_ID } from "@/app/lib/constants";

type Conversation = {
  id: string;
  title: string;
  type: string;
  updated_at: string;
  session_id?: string; // Ajout du champ session_id
};

export default function ConversationList({
  userId = DEFAULT_USER_ID,
  filterType,
  onSelect,
}: {
  userId?: string;
  filterType?: string;
  // Modification : onSelect passe l’objet complet conversation pour récupérer session_id
  onSelect: (conversation: Conversation) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      let query = supabase
        .from("conversations")
        .select("id, title, type, updated_at, session_id") // récupérer session_id
        .eq("user_id", userId);

      if (filterType) {
        query = query.eq("type", filterType);
      }

      query = query.order("updated_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Erreur chargement conversations:", error);
      } else {
        setConversations(data ?? []);
      }
      setLoading(false);
    }
    loadConversations();
  }, [userId, filterType]);

  if (loading) {
    return <p>Chargement des conversations...</p>;
  }

  if (conversations.length === 0) {
    return <p className="text-center text-gray-600">Aucune conversation trouvée.</p>;
  }

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          onClick={() => onSelect(conversation)} // passage de l’objet complet
          className="cursor-pointer border rounded-lg p-4 shadow hover:shadow-lg transition-shadow bg-white max-w-xs w-full"
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && onSelect(conversation)}
        >
          <h3 className="font-semibold text-lg mb-2">{conversation.title || "Sans titre"}</h3>
          <p className="text-sm text-gray-500 mb-2">
            Modifiée le {new Date(conversation.updated_at).toLocaleDateString()}
          </p>
          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
            {conversation.type}
          </span>
        </div>
      ))}
    </div>
  );
}
