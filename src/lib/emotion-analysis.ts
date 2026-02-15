// ============================================================================
// EMOTION ANALYSIS ENGINE
// Detects emotional states from text with intensity levels
// ============================================================================

export interface EmotionAnalysis {
  primary: string;
  secondary: string;
  intensity: 'mild' | 'moderate' | 'intense' | 'severe';
  indicators: string[];
}

const EMOTION_PATTERNS = {
  exhausted: {
    keywords: ['tired', 'exhausted', 'drained', 'worn out', 'weary', 'fatigue', 'no energy', 'spent', 'burnt out', 'burned out', 'depleted', 'done', 'finished', "can't go on"],
    phrases: ['so tired of', 'had enough', 'at my limit', 'running on empty', 'got nothing left', 'barely functioning'],
    intensity_boost: ['completely', 'totally', 'absolutely', 'utterly', 'so', 'extremely', 'incredibly']
  },
  anxious: {
    keywords: ['anxious', 'worried', 'nervous', 'panic', 'scared', 'fear', 'afraid', 'overwhelmed', 'dread', 'restless', 'uneasy', 'on edge', 'tense', 'stressed'],
    phrases: ['what if', 'might happen', 'going to go wrong', "can't stop thinking", 'racing thoughts', 'heart racing', "can't breathe", "what's going to happen"],
    intensity_boost: ['terrified', 'petrified', 'paralyzed', 'crippled', 'consuming']
  },
  sad: {
    keywords: ['sad', 'depressed', 'hopeless', 'down', 'empty', 'lonely', 'cry', 'tears', 'grief', 'heartbreak', 'sorrow', 'melancholy', 'numb', 'hollow'],
    phrases: ['feel like crying', "can't stop crying", "don't want to get up", 'nothing matters', 'feel so alone', 'miss them', 'lost everything'],
    intensity_boost: ['devastated', 'shattered', 'broken', 'destroyed', 'crushed', 'unbearable']
  },
  angry: {
    keywords: ['angry', 'frustrated', 'annoyed', 'mad', 'irritated', 'furious', 'rage', 'hate', 'resentful', 'bitter', 'outraged', 'livid', 'pissed'],
    phrases: ["can't believe they", 'how dare', 'had enough of', 'so sick of', 'tired of dealing with', 'makes my blood boil', 'had it up to here'],
    intensity_boost: ['absolutely furious', 'beyond angry', 'blind rage', 'explosive', 'uncontrollable']
  },
  ashamed: {
    keywords: ['ashamed', 'embarrassed', 'humiliated', 'guilty', 'regret', 'mortified', 'disgraced', 'worthless', 'pathetic', 'stupid', 'idiot', 'loser'],
    phrases: ["shouldn't have", "can't believe i", 'everyone will think', 'made a fool', 'showed my true colors', 'let everyone down'],
    intensity_boost: ['deeply', 'profoundly', 'completely', 'utterly', 'totally']
  },
  confused: {
    keywords: ['confused', 'lost', 'stuck', 'trapped', 'unsure', 'uncertain', 'conflicted', 'torn', 'paralyzed', 'indecisive', 'directionless'],
    phrases: ["don't know what to do", "can't figure out", 'no idea', 'which way to turn', 'at a crossroads', 'going in circles', "can't see a way out"],
    intensity_boost: ['completely lost', 'totally confused', 'utterly lost', 'hopelessly']
  },
  disappointed: {
    keywords: ['disappointed', 'let down', 'failed', 'failure', 'defeated', 'crushed', 'disheartened', 'discouraged', 'demoralized'],
    phrases: ['thought it would be', 'was supposed to', 'had hoped', 'expected better', "didn't work out", 'fell through', 'not what i expected'],
    intensity_boost: ['deeply', 'profoundly', 'bitterly', 'crushingly']
  },
  inadequate: {
    keywords: ['not enough', 'inadequate', 'unworthy', 'imposter', 'fraud', "don't deserve", 'not good enough', "don't belong", 'out of my depth'],
    phrases: ['everyone else is', "they're all so", "i'll never be", 'why can\'t i just', 'should be able to', 'supposed to be better'],
    intensity_boost: ['completely', 'totally', 'utterly', 'hopelessly']
  }
};

const INTENSITY_WORDS = {
  mild: ['a bit', 'kind of', 'somewhat', 'slightly', 'a little', 'sort of'],
  moderate: ['really', 'quite', 'pretty', 'fairly', 'rather'],
  intense: ['so', 'very', 'extremely', 'incredibly', 'absolutely', 'completely'],
  severe: ['overwhelmingly', 'unbearably', 'devastatingly', 'crushingly', 'paralyzingly', 'impossible to']
};

export function analyzeEmotion(text: string): EmotionAnalysis {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let bestMatch = { emotion: 'unsettled', score: 0, indicators: [] as string[] };
  
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    let score = 0;
    const indicators: string[] = [];
    
    // Check keywords
    for (const keyword of patterns.keywords) {
      if (lowerText.includes(keyword)) {
        score += 2;
        indicators.push(keyword);
      }
    }
    
    // Check phrases (higher weight)
    for (const phrase of patterns.phrases) {
      if (lowerText.includes(phrase)) {
        score += 4;
        indicators.push(phrase);
      }
    }
    
    // Check intensity boosters
    for (const booster of patterns.intensity_boost) {
      if (lowerText.includes(booster)) {
        score += 3;
      }
    }
    
    if (score > bestMatch.score) {
      bestMatch = { emotion, score, indicators };
    }
  }
  
  // Determine intensity
  let intensity: 'mild' | 'moderate' | 'intense' | 'severe' = 'moderate';
  
  const hasMild = INTENSITY_WORDS.mild.some(w => lowerText.includes(w));
  const hasIntense = INTENSITY_WORDS.intense.some(w => lowerText.includes(w));
  const hasSevere = INTENSITY_WORDS.severe.some(w => lowerText.includes(w));
  
  if (hasSevere || bestMatch.score >= 15) intensity = 'severe';
  else if (hasIntense || bestMatch.score >= 10) intensity = 'intense';
  else if (hasMild) intensity = 'mild';
  
  // Find secondary emotion
  let secondary = 'unsettled';
  let secondScore = 0;
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    if (emotion === bestMatch.emotion) continue;
    let score = 0;
    for (const keyword of patterns.keywords) {
      if (lowerText.includes(keyword)) score++;
    }
    if (score > secondScore) {
      secondScore = score;
      secondary = emotion;
    }
  }
  
  return {
    primary: bestMatch.emotion,
    secondary,
    intensity,
    indicators: bestMatch.indicators.slice(0, 3)
  };
}
