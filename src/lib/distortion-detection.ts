// ============================================================================
// COGNITIVE DISTORTION DETECTOR
// Identifies thinking patterns from text
// ============================================================================

export interface DistortionAnalysis {
  type: string;
  confidence: number;
  evidence: string[];
  explanation: string;
}

const COGNITIVE_DISTORTIONS = {
  'Catastrophizing': {
    patterns: [
      /\b(disaster|catastrophe|nightmare|end of the world|ruined|destroyed|can't survive|won't survive|impossible to recover)\b/i,
      /\b(worst thing|worst possible|terrible mistake|huge mistake|massive failure)\b/i,
      /\b(everything is (ruined|destroyed|over|lost))\b/i,
      /\b(can't (handle|take|bear|deal with) this)\b/i,
      /\b(going to (lose|lose my|ruin my|destroy my|end my))\b/i
    ],
    explanationTemplates: [
      "Your mind is jumping to the worst possible outcome, treating this situation as catastrophic when there may be other possibilities.",
      "You're amplifying the negative consequences while minimizing your ability to cope with them.",
      "The situation feels apocalyptic, but your mind may be exaggerating the true impact."
    ]
  },
  'All-or-Nothing Thinking': {
    patterns: [
      /\b(always|never|every single|each and every|all or nothing|completely|totally|absolutely)\b.*\b(fail|wrong|bad|terrible|horrible)\b/i,
      /\b(if i can't .* (perfectly|completely|fully) then).*\b(why bother|what's the point|useless)\b/i,
      /\b(either .* or|black and white|no middle ground|complete (success|failure))\b/i,
      /\b(total|complete|absolute|utter) (failure|disaster|mess|wreck)\b/i,
      /\b(i'm (completely|totally|absolutely) (useless|worthless|hopeless))\b/i
    ],
    explanationTemplates: [
      "You're viewing this situation in black-and-white terms, missing the gray areas and partial successes.",
      "Your thinking is polarized - either perfect or terrible - without recognizing the middle ground where most of life happens.",
      "You're discounting the nuance here. Reality rarely fits into absolute categories."
    ]
  },
  'Mind Reading': {
    patterns: [
      /\b(they (think|believe|assume|probably think|must think|surely think))\b/i,
      /\b(everyone (thinks|knows|believes|sees))\b/i,
      /\b(people (think|are thinking|probably))\b/i,
      /\b(he thinks|she thinks|they're thinking)\b/i,
      /\b(can tell (they|he|she) (think|thinks|is thinking))\b/i,
      /\b(know what they're thinking|can see it in their eyes)\b/i
    ],
    explanationTemplates: [
      "You're assuming you know what others are thinking without having direct evidence of their thoughts.",
      "Your mind is filling in the gaps about others' perspectives, but these assumptions may not reflect reality.",
      "You're projecting your fears onto others' minds. Their actual thoughts might be quite different."
    ]
  },
  'Fortune Telling': {
    patterns: [
      /\b(going to (fail|lose|mess up|screw up|ruin|be terrible|be awful|be a disaster))\b/i,
      /\b(will (never|not|fail|lose|be able to))\b/i,
      /\b(can already (see|tell|know) (it|this|that) (will|won't|is going to))\b/i,
      /\b(destined to|doomed to|bound to fail|certain to fail)\b/i,
      /\b(i just know (it|this|that))\b.*\b(will|won't|going to)\b/i,
      /\b(never going to|won't ever|will never be able to)\b/i
    ],
    explanationTemplates: [
      "You're predicting a negative future as if you can see it with certainty, but the future hasn't been written yet.",
      "Your mind is creating a self-fulfilling prophecy by assuming failure before you've even tried.",
      "You're treating your anxious predictions as facts rather than possibilities."
    ]
  },
  'Emotional Reasoning': {
    patterns: [
      /\b(i feel (like|as if|that) .*)\b/i,
      /\b(it feels (like|as if|that) .*)\b/i,
      /\b(because i feel|since i feel)\b/i,
      /\b(feel so (sure|certain|convinced))\b/i,
      /\b(my (gut|heart|feelings) (tells|tell) me)\b/i
    ],
    explanationTemplates: [
      "You're using your feelings as evidence for what's true, but emotions are reactions, not facts.",
      "Just because something feels true doesn't make it objectively true. Feelings can be powerful but misleading.",
      "Your emotional experience is valid, but treating it as proof of reality can lead you astray."
    ]
  },
  'Should Statements': {
    patterns: [
      /\b(i should|you should|they should|he should|she should|we should)\b/i,
      /\b(i must|you must|they must|have to|need to|ought to)\b/i,
      /\b(i'm supposed to|shouldn't have|should have|must have)\b/i,
      /\b(i deserve to be|don't deserve to)\b/i
    ],
    explanationTemplates: [
      "You're using rigid rules about how things 'should' be, creating unnecessary pressure and guilt.",
      "These 'should' statements are like a harsh internal critic that never lets you off the hook.",
      "You're holding yourself to unrealistic standards that set you up for feeling inadequate."
    ]
  },
  'Labeling': {
    patterns: [
      /\b(i am a|i'm a|i'm such a)\s*(loser|failure|idiot|stupid|worthless|pathetic|waste|mess)\b/i,
      /\b(i'm (totally|completely|absolutely) (worthless|useless|hopeless))\b/i,
      /\b(that's just (who|what) i am)\b/i,
      /\b(i'm (the type of|that kind of) person who)\b.*\b(fails|messes up|can't)\b/i
    ],
    explanationTemplates: [
      "You're applying a harsh label to yourself instead of describing a specific behavior or situation.",
      "This label reduces your complex humanity to a single negative judgment - you're more than this.",
      "Labels stick, but they're rarely accurate. You're describing what happened, not who you are."
    ]
  },
  'Personalization': {
    patterns: [
      /\b(my fault|because of me|i caused|i'm to blame|i ruined|i messed up everything)\b/i,
      /\b(this (is|was|happened) because of me)\b/i,
      /\b(everything is my fault|all my fault)\b/i,
      /\b(if only i (had|hadn't|did|didn't))\b/i,
      /\b(i (take|accept) (full|all|complete) responsibility)\b/i
    ],
    explanationTemplates: [
      "You're taking more responsibility than is warranted, blaming yourself for things outside your control.",
      "While self-reflection is valuable, you may be over-owning outcomes that have multiple causes.",
      "Your mind is assuming more blame than the situation actually warrants."
    ]
  },
  'Mental Filtering': {
    patterns: [
      /\b(but .* (bad|wrong|terrible|awful|failed))\b/i,
      /\b(only .* (bad|negative|wrong))\b/i,
      /\b(ignoring|dismissing|didn't notice) .* (good|positive|success)\b/i,
      /\b(focus(ing)? on .* (bad|wrong|failed|negative))\b/i
    ],
    explanationTemplates: [
      "You're filtering out the positive aspects of the situation and focusing exclusively on the negative.",
      "Your mind is like a spotlight that only illuminates what went wrong, leaving the rest in darkness.",
      "You're discounting evidence that doesn't fit your negative narrative."
    ]
  },
  'Overgeneralization': {
    patterns: [
      /\b(this always|it always|things always|everything always)\b/i,
      /\b(this never|it never|things never|nothing ever)\b/i,
      /\b(another (failure|mistake|disappointment))\b/i,
      /\b( (typical|just my luck|my whole life))\b/i,
      /\b(again and again|over and over|time after time)\b/i
    ],
    explanationTemplates: [
      "You're taking one situation and generalizing it to a universal pattern that may not exist.",
      "Your mind is drawing broad conclusions from limited evidence.",
      "You're treating this as part of an endless pattern when it might be an isolated incident."
    ]
  },
  'Rumination': {
    patterns: [
      /\b(thinking about (the past|past events|what happened))\b/i,
      /\b(keep thinking about|can't stop thinking about|replaying)\b/i,
      /\b(going over and over|stuck in my head|circling back)\b/i,
      /\b(resurfaced|coming back to|keeps coming up)\b/i,
      /\b(over and over in my mind|on repeat|loop)\b/i,
      /\b(what i (should|could) have (said|done))\b/i
    ],
    explanationTemplates: [
      "Your mind is replaying past events on a loop, which can feel draining but often means there's something unresolved seeking attention.",
      "You're stuck in a thought cycle about the past - your brain is trying to process something, even if it feels exhausting.",
      "Rumination often happens when we're trying to solve something that can't be solved by thinking alone."
    ]
  },
  'Disqualifying the Positive': {
    patterns: [
      /\b(that doesn't count|doesn't matter|not a big deal)\b/i,
      /\b(anyone could|anyone would|that was just luck)\b/i,
      /\b(but that's|but it's only|just because)\b/i,
      /\b(it wasn't really|doesn't really count)\b/i
    ],
    explanationTemplates: [
      "You're dismissing positive experiences as if they don't count, which keeps the negative narrative intact.",
      "Your mind is explaining away anything good, refusing to let it balance the picture.",
      "When good things happen, you're finding reasons to discount them."
    ]
  },
  'Self-Criticism': {
    patterns: [
      /\b(i (was|am being|acted) (fake|phony|fake|pretending))\b/i,
      /\b(i messed up|i screwed up|i ruined)\b/i,
      /\b(i'm so (stupid|dumb|idiotic|pathetic))\b/i,
      /\b(being (too|so) (hard on myself|critical|judgmental))\b/i,
      /\b(beating myself up|hard on myself)\b/i,
      /\b(i (should|could) have (done|said|acted) (better|differently))\b/i
    ],
    explanationTemplates: [
      "You're being much harsher with yourself than you would be with anyone else. The inner critic is loud right now.",
      "There's a lot of self-judgment here. Would you speak to a friend this way?",
      "Your inner critic is working overtime. It might think it's helping, but it's actually adding to your pain."
    ]
  }
};

export function detectDistortions(text: string): DistortionAnalysis {
  const lowerText = text.toLowerCase();
  
  // Default with more varied options
  let bestMatch: DistortionAnalysis = {
    type: 'Exploring Patterns',
    confidence: 0,
    evidence: [],
    explanation: 'Something in what you shared caught my attention. Let\'s explore what might be underneath it.'
  };
  
  for (const [distortion, data] of Object.entries(COGNITIVE_DISTORTIONS)) {
    let matches = 0;
    const evidence: string[] = [];
    
    for (const pattern of data.patterns) {
      const match = text.match(pattern);
      if (match) {
        matches++;
        evidence.push(match[0]);
      }
    }
    
    if (matches > bestMatch.confidence) {
      const explanation = data.explanationTemplates[Math.floor(Math.random() * data.explanationTemplates.length)];
      bestMatch = {
        type: distortion,
        confidence: matches,
        evidence,
        explanation
      };
    }
  }
  
  return bestMatch;
}
