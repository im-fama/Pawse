// Supportive messages shown on the MessageScreen after a mood is selected.
// Each mood has ~4 warm, personal messages that rotate randomly so it feels
// fresh every time. These are written to feel like a caring partner/best friend
// is right there with you, acknowledging exactly how you feel.

export const SUPPORT_MESSAGES = {
  happy: [
    "Your happiness makes everything brighter. I love seeing you like this. 🌟",
    "Good days like this are everything. You deserve every bit of it.",
    "This smile on your face right now? It's my favourite thing in the world.",
    "Keep that energy. You deserve all the good today is giving you. 🧡",
  ],
  miss_you: [
    "I miss you too, more than you know. Just a little longer, okay? 🤍",
    "The distance is temporary. You're always in my heart, even when I'm not there.",
    "I feel it too. Every day apart just makes me look forward to you more.",
    "Hold on a little longer. I'm thinking of you right now, I promise. 🌙",
  ],
  in_love: [
    "You make my heart so full I don't know what to do with it. 💛",
    "Every time I think of you, everything just feels easier.",
    "You are genuinely one of my favourite things that has ever happened to me.",
    "I love you. In every language, in every way. Always. 🌸",
  ],
  love_overdose: [
    "Your love overflows and I catch every single drop of it. 💗",
    "You love so fiercely. It's one of my absolute favourite things about you.",
    "That big heart of yours is the most beautiful thing. I hope you know that.",
    "Let it overflow. I'll be here to hold all of it. Always. 🫶",
  ],
  cozy: [
    "Cozy days are sacred. Stay wrapped up — you've earned every second of it. 🧸",
    "Soft days are good days. Enjoy every warm, quiet moment of it.",
    "That sounds like a perfect day honestly. I hope it lasts all evening.",
    "Nothing better than a blanket and nowhere to be. You deserve this rest. 🍵",
  ],
  sad: [
    "I see you. It's okay to feel heavy sometimes. I'm sitting with you. 🤍",
    "You don't have to explain it. I'm here, and I care about you deeply.",
    "Sad days don't last forever. And until this one passes, I've got you.",
    "It's okay not to be okay. Just know you're never going through it alone. 🌧️",
  ],
  frustrated: [
    "Ugh, that sounds exhausting. I'm annoyed on your behalf too.",
    "You're allowed to be frustrated. I just want you to know I'm in your corner.",
    "Take a breath. Whatever it is, we'll figure it out together. I believe in you.",
    "Let it out. And when you're ready, I'm right here. Always. 💪",
  ],
  angry: [
    "Your feelings are valid. Completely. I've got your back, no matter what. 🔥",
    "I hear you. That sounds genuinely infuriating. You don't have to calm down yet.",
    "Be as angry as you need to be. I'm not going anywhere.",
    "One thing at a time. You're stronger than whatever is testing you right now.",
  ],
  on_fire: [
    "Some days just go wrong. That's not a reflection of you at all. I love you.",
    "I wish I could fix it all. But I'm here, and that counts for something. 🤍",
    "You're doing your best in a hard moment. That's all that matters.",
    "Even on the worst days, you are still my favourite person. Always. 💛",
  ],
  evil: [
    "Uh oh… who do I need to be worried about? 😏 I'll bring snacks for the chaos.",
    "You scheming? Honestly kind of iconic. I fully support you.",
    "Whatever plan is brewing, I already know I'm on your side. Obviously.",
    "Go on then. Just don't forget to text me the details after. 😈🧡",
  ],
  naughty: [
    "Zero remorse and full chaotic energy. Honestly, I respect it. 😂",
    "I can't even be mad. That sounds completely in character and I love you for it.",
    "Okay but honestly? Same. You're my favourite little disaster. 🌪️",
    "You did the thing. And somehow I still adore you. How is that. 💛",
  ],
  hungry: [
    "Okay. Snack first. Everything else second. That is the correct priority. 🍪",
    "You deserve the snack. You've been thinking about it long enough.",
    "I wish I could teleport food to you right now. I really do.",
    "The snack is not a phase — it is a need. A valid one. Go get it. 🧡",
  ],
  shocked: [
    "WAIT — tell me everything. I need the full story immediately. 😱",
    "Okay that sounds like A LOT. Take a second. Then tell me everything.",
    "I'm shocked on your behalf. We process this together. What happened?!",
    "Your reaction is completely valid. Whatever it is, I'm here for all of it. 🤍",
  ],
  scared: [
    "Hey. It's okay. Breathe. I'm right here and we're going to be fine. 🤍",
    "Accidents happen. You're okay. I've got you.",
    "It's already okay. You don't have to carry that feeling alone.",
    "I'm not going anywhere. Take your time. We figure it out together. 💛",
  ],
  confused: [
    "Okay okay, let's think through this together. You're not alone in it. 🧩",
    "Confusion is just thinking that hasn't finished yet. You'll get there.",
    "I don't always have the answers either. But I'll sit in it with you. 🤍",
    "Take it one question at a time. And I'm right here if you need to think out loud.",
  ],
  laughy: [
    "I love this version of you. Please tell me what was funny. 😂",
    "You giggling uncontrollably is genuinely the best thing I can imagine right now.",
    "Whatever got you — it's already my favourite thing today. 🌟",
    "Okay you HAVE to tell me what happened. This energy is contagious. 💛",
  ],
  silly: [
    "Brain empty, vibes immaculate. I love you in this mode honestly. 🌀",
    "Somewhere out there I'm being just as silly. We match.",
    "No thoughts needed. Just you, your feelings, and me. That's enough. 🧡",
    "Silly days are secretly the best days. I hope you feel light right now. 🌸",
  ],
  cutesy: [
    "You are the most adorable thing and I am completely normal about it. 🥺",
    "LOOK at you. Just look. You are so wonderful it's a little unfair.",
    "Okay I'm a little overwhelmed by how cute you are right now. Just saying.",
    "You being this precious is genuinely my favourite thing about today. 💛",
  ],
  exhausted: [
    "You've done enough. Please rest now. I mean it. 🤍",
    "Whatever you gave today was enough. You can let go now. You're safe.",
    "I'm so proud of you for getting through it. Now please rest, love.",
    "Put everything down. You did your best. That's all I ever ask. 💛",
  ],
  sleepy: [
    "Sleep. The world will still be here tomorrow. Go rest, love. 🌙",
    "You've fought the slow blink long enough. Let go. I'll be here when you wake up.",
    "The best thing you can do right now is sleep. I'll miss you until morning.",
    "Close your eyes. You're okay. Everything is okay. Rest now. 🤍",
  ],
};

/**
 * Returns a random supportive message for the given mood id.
 * Falls back to a generic warm message if the mood isn't found.
 */
export function getSupportMessage(moodId) {
  const messages = SUPPORT_MESSAGES[moodId];
  if (!messages || messages.length === 0) {
    return "Whatever you're feeling, I'm here. Always. 🤍";
  }
  return messages[Math.floor(Math.random() * messages.length)];
}
