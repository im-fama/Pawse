// Central source of truth for every mood Pawse supports.
//
// `id` is stored in mood_logs per user. Keep stable once you ship.
//
// `image` is the filename Pawse looks for in `public/pet-moods/<image>`.
// Until you've drawn real art for a mood, it falls back to a placeholder
// (see getPetImageUrl in lib/petImages.js) so the app never shows a
// broken image.
//
// Array order is also carousel order.

export const MOODS = [
  {
    id: "happy",
    label: "Happy",
    image: "happy.png",
    message:
      "Today is a good day, no notes. Everything feels easy and warm and exactly right. I'd like more days like this, please.",
  },
  {
    id: "overjoyed",
    label: "Overjoyed",
    image: "overjoyed.png",
    message:
      "I am floating, I cannot feel my paws, this is the best day of my entire life. Everything is sparkly and perfect and I want to tell every cat I know. Please do not let this feeling end.",
  },
  {
    id: "miss_you",
    label: "Miss you",
    image: "miss_you.png",
    message:
      "The couch feels too big without you. I keep checking the door even though I know you're not coming yet. Hurry back, okay?",
  },
  {
    id: "in_love",
    label: "In love",
    image: "in_love.png",
    message:
      "Thinking about you. Again. It happens more than I'd like to admit, but here we are. You're just very hard to stop thinking about.",
  },
  {
    id: "dreamy",
    label: "Dreamy",
    image: "dreamy.png",
    message:
      "The world feels soft and full of possibility tonight. I might drift off into a lovely little daydream and never come back.",
  },
  {
    id: "calm",
    label: "Calm",
    image: "calm.png",
    message:
      "Everything has gone quiet, and somehow that feels wonderful. I am content to let the moment stay gentle and still.",
  },
  {
    id: "excited",
    label: "Excited",
    image: "excited.png",
    message:
      "My whole body is buzzing and I cannot stop thinking about what is about to happen. This feels huge and wonderful and a little bit wild.",
  },
  {
    id: "romantic",
    label: "Romantic",
    image: "romantic.png",
    message:
      "Everything feels sweeter and softer and more sparkly than usual. My heart is doing a little dance and I am not even trying to stop it.",
  },
  {
    id: "jealous",
    label: "Jealous",
    image: "jealous.png",
    message:
      "That sting is real and I wish it was not. I am trying very hard not to let it take over the whole room.",
  },
  {
    id: "lonely",
    label: "Lonely",
    image: "lonely.png",
    message:
      "The room feels too big and the silence feels too loud. I could use a little comfort, a little company, or just someone to sit with me.",
  },
  {
    id: "furious",
    label: "Furious",
    image: "furious.png",
    message:
      "I am so angry I can barely think straight. Everything feels unfair and I need a moment before I say something I cannot take back.",
  },
  {
    id: "dead",
    label: "Dead",
    image: "dead.png",
    message:
      "I feel completely drained and flat and done. There is nothing left in me and I just need to shut down for a while.",
  },
  {
    id: "cozy",
    label: "Cozy",
    image: "cozy.png",
    message:
      "Blanket fort, do not disturb. The world can wait, I am very busy being warm. Ten out of ten, no complaints.",
  },
  {
    id: "sad",
    label: "Sad",
    image: "sad.png",
    message:
      "I don't really want to talk about it right now. Everything just feels a little heavier today, and that's okay. Can you just sit with me for a bit?",
  },
  {
    id: "frustrated",
    label: "Frustrated",
    image: "frustrated.png",
    message:
      "I have rage and nowhere to put it. Everything is slightly wrong in a way I can't explain. I just need five minutes to glare at nothing.",
  },
  {
    id: "angry",
    label: "Angry",
    image: "angry.png",
    message:
      "Do not. Test me. Today. I am one (1) more thing away from losing it completely. Proceed with caution.",
  },
  {
    id: "on_fire",
    label: "On fire",
    image: "on_fire.png",
    message:
      "Everything is going wrong today and I am being very dramatic about it. Nothing is on fire but it FEELS like something should be. Please just let me lie here.",
  },
  {
    id: "evil",
    label: "Evil",
    image: "evil.png",
    message:
      "I have a plan and it is not a nice one. I haven't decided what it is yet, but the energy is there. Watch your snacks.",
  },
  {
    id: "naughty",
    label: "Naughty",
    image: "naughty.png",
    message:
      "I did the thing. I'm not sorry. It was right there and it looked like it wanted to be knocked over, so really, what choice did I have?",
  },
  {
    id: "hungry",
    label: "Hungry",
    image: "hungry.png",
    message:
      "I would, in fact, like a snack. I have been thinking about it for several hours now. This is not a phase, this is who I am.",
  },
  {
    id: "shocked",
    label: "Shocked",
    image: "shocked.png",
    message:
      "Wait. WAIT. Excuse me?? I did not see that coming and I have several follow-up questions. Give me a second to process this.",
  },
  {
    id: "scared",
    label: "Scared",
    image: "scared.png",
    message:
      "That was an accident and I'd like to leave now. I didn't mean for that to happen, I promise. Can we pretend this didn't occur?",
  },
  {
    id: "confused",
    label: "Confused",
    image: "confused.png",
    message:
      "I have several questions and zero answers. None of this is making sense and I've stopped pretending it does. Explain it again, slower.",
  },
  {
    id: "laughy",
    label: "Laughy",
    image: "laughy.png",
    message:
      "I cannot stop giggling, send help. Something was funny three minutes ago and I'm still not over it. This is a problem now.",
  },
  {
    id: "goofy",
    label: "Goofy",
    image: "goofy.png",
    message:
      "Brain empty, vibes only. I have no thoughts, just feelings, and most of those are nonsense. Don't ask me anything important right now.",
  },
  {
    id: "cutesy",
    label: "Cutesy",
    image: "cutesy.png",
    message:
      "Look at me. Just look at me. I'm doing my best impression of something adorable and I think it's working. You're welcome.",
  },
  {
    id: "exhausted",
    label: "Exhausted",
    image: "exhausted.png",
    message:
      "Running on fumes and spite. I have given everything I have today and there is nothing left. Please carry me to bed.",
  },
  {
    id: "sleepy",
    label: "Sleepy",
    image: "sleepy.png",
    message:
      "Eyes are doing the slow blink thing. I'm fighting it but I don't think I'm winning. Five more minutes, then maybe five more after that.",
  },
];

export function getMoodById(id) {
  return MOODS.find((m) => m.id === id) ?? null;
}
