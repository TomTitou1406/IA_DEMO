import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { DEFAULT_USER_ID } from "@/app/lib/constants";

type Conversation = {
  id: string;
  title: string;
  type: string;
  updated_at: string;
};

export default function ConversationList({
  userId = DEFAULT_USER_ID,
  filterType,
  onSelect,
}: {
  userId?: string;
  filterType?: string;
  onSelect: (conversationId: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      let query = supabase
        .from("conversations")
        .select("id, title, type, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (filterType) {
        query = query.eq("type", filterType);
      }

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
    return <p>Aucune conversation trouvée.</p>;
  }

  return (
    <div className="space-y-2">
      {conversations.map(({ id, title, type, updated_at }) => (
        <div
          key={id}
          className="flex justify-between items-center border rounded p-3 cursor-pointer hover:bg-gray-100"
          onClick={() => onSelect(id)}
        >
          <div>
            <p className="font-semibold">{title || "Sans titre"}</p>
            <p className="text-xs text-gray-500">Modifiée le {new Date(updated_at).toLocaleDateString()}</p>
          </div>
          <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded">
            {type}
          </span>
        </div>
      ))}
    </div>
  );
}
