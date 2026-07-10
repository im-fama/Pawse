import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export async function sendPrivateMessage(senderId, recipientId, text) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  if (!senderId || !recipientId || !text.trim()) {
    throw new Error("Missing message parameters");
  }

  const { data, error } = await supabase
    .from("private_messages")
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      text: text.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchPrivateMessages(userAId, userBId) {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("private_messages")
      .select("*")
      .or(`and(sender_id.eq.${userAId},recipient_id.eq.${userBId}),and(sender_id.eq.${userBId},recipient_id.eq.${userAId})`)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching private messages:", err.message);
    return [];
  }
}

export function subscribeToPrivateMessages(userAId, userBId, onMessageReceived) {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`chat_${[userAId, userBId].sort().join("_")}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "private_messages",
      },
      (payload) => {
        const msg = payload.new;
        // Verify the message belongs to this conversation
        if (
          (msg.sender_id === userAId && msg.recipient_id === userBId) ||
          (msg.sender_id === userBId && msg.recipient_id === userAId)
        ) {
          onMessageReceived(msg);
        }
      }
    )
    .subscribe();

  return channel;
}
