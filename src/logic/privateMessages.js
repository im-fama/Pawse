import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export async function sendPrivateMessage(senderId, recipientId, text, replyToId = null) {
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
      reply_to_id: replyToId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function editPrivateMessage(messageId, senderId, newText) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const trimmed = newText.trim();
  if (!trimmed) throw new Error("Message can't be empty");

  const { data, error } = await supabase
    .from("private_messages")
    .update({ text: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", senderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePrivateMessage(messageId, senderId) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("private_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", senderId)
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

// Returns the single most recent message with each of the given friends,
// keyed by friend id — used for sidebar previews.
export async function fetchRecentConversations(userId, otherUserIds) {
  if (!isSupabaseConfigured || !otherUserIds || otherUserIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from("private_messages")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const latestByFriend = {};
    (data || []).forEach((msg) => {
      const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (!otherUserIds.includes(otherId)) return;
      if (!latestByFriend[otherId]) latestByFriend[otherId] = msg;
    });
    return latestByFriend;
  } catch (err) {
    console.error("Error fetching recent conversations:", err.message);
    return {};
  }
}

export async function fetchMessageReactions(messageIds) {
  if (!isSupabaseConfigured || messageIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", messageIds);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching reactions:", err.message);
    return [];
  }
}

// Sets/replaces the current user's reaction on a message.
// Passing the same emoji they already reacted with removes it (toggle).
export async function toggleMessageReaction(messageId, userId, emoji, currentEmoji) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  if (currentEmoji === emoji) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId);
    if (error) throw error;
    return null;
  }

  const { data, error } = await supabase
    .from("message_reactions")
    .upsert(
      { message_id: messageId, user_id: userId, emoji },
      { onConflict: "message_id,user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToPrivateMessages(userAId, userBId, onInsert, onUpdate) {
  if (!isSupabaseConfigured) return { unsubscribe: () => { } };

  const inConversation = (msg) =>
    (msg.sender_id === userAId && msg.recipient_id === userBId) ||
    (msg.sender_id === userBId && msg.recipient_id === userAId);

  const channel = supabase
    .channel(`chat_${[userAId, userBId].sort().join("_")}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "private_messages" },
      (payload) => {
        if (inConversation(payload.new)) onInsert(payload.new);
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "private_messages" },
      (payload) => {
        if (inConversation(payload.new) && onUpdate) onUpdate(payload.new);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToMessageReactions(onReactionChange) {
  if (!isSupabaseConfigured) return { unsubscribe: () => { } };

  const channel = supabase
    .channel("message_reactions_all")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "message_reactions" },
      (payload) => onReactionChange(payload)
    )
    .subscribe();

  return channel;
}

// Broadcasts a typing heartbeat on a per-conversation presence channel.
// Returns { broadcastTyping, unsubscribe }.
export function subscribeToTypingPresence(userAId, userBId, currentUserId, onTypingChange) {
  if (!isSupabaseConfigured) return { broadcastTyping: () => { }, unsubscribe: () => { } };

  try {
    const idA = String(userAId || "");
    const idB = String(userBId || "");
    const channelName = `typing_${[idA, idB].sort().join("_")}`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId && payload.userId !== currentUserId) {
          onTypingChange(payload.isTyping);
        }
      })
      .subscribe();

    function broadcastTyping(isTyping) {
      try {
        channel.send({
          type: "broadcast",
          event: "typing",
          payload: { userId: currentUserId, isTyping },
        });
      } catch (err) {
        console.warn("Failed to broadcast typing status:", err);
      }
    }

    return {
      broadcastTyping,
      unsubscribe: () => {
        try {
          channel.unsubscribe();
        } catch (err) {
          console.warn("Failed to unsubscribe typing channel:", err);
        }
      },
    };
  } catch (err) {
    console.error("Error setting up typing presence:", err);
    return { broadcastTyping: () => { }, unsubscribe: () => { } };
  }
}