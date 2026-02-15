# 🧠 The Optimism Engine

> **AI-Powered Cognitive Reframing Platform** | Production-Ready SaaS

A beautifully designed mental wellness application that uses AI and Cognitive Behavioral Therapy (CBT) techniques to help users identify, explore, and reframe negative thought patterns through progressive "Iceberg" conversations.

---

## 🎯 What This Is

The Optimism Engine is a **full-stack SaaS application** that guides users through cognitive restructuring conversations. Users share negative thoughts, and the AI therapist helps them:

1. **Identify cognitive distortions** (10 types: Catastrophizing, All-or-Nothing Thinking, Mind Reading, etc.)
2. **Explore the "Iceberg"** - progressive layers from Surface → Trigger → Emotion → Core Belief
3. **Reframe thoughts** with personalized, empathetic responses
4. **Track progress** across multiple sessions

---

## 💎 Key Features

### 🤖 Multi-Provider AI Integration
- **10 AI providers** supported: Z.AI SDK (Built-in), Mistral, DeepSeek, Z.AI (GLM-4), Gemini, OpenAI, Anthropic, Groq, Together AI, OpenRouter
- Automatic failover between providers
- **Works out of the box** - Z.AI SDK requires no API key setup
- Intelligent fallback system ensures responses always complete

### 🧠 CBT Engine
- 13 cognitive distortion types with pattern detection
- 9 emotion categories with 4 intensity levels
- Progressive 4-layer Iceberg system (Surface → Trigger → Emotion → Core Belief)
- **Varied response labels** - 3 variations per distortion type to prevent repetition
- **Rotating encouragement emojis** - 8 different options for natural feel
- Cross-session personalization

### 👤 User Features
- Clerk authentication (Google, Email)
- Session history with full conversation logs
- Progress tracking and insights
- Export conversations
- Responsive design (mobile-friendly)

### 🎨 Premium UI/UX
- Framer Motion animations
- Iceberg visualization
- Clean, therapeutic aesthetic
- Dark/light mode ready

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS, Framer Motion |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL (Neon) + Prisma ORM |
| **Auth** | Clerk |
| **AI** | Mistral, OpenAI, Anthropic, Groq, Gemini |
| **Deploy** | Vercel |

---

## 📁 Project Structure

```
optimism-engine/
├── src/
│   ├── app/
│   │   ├── api/              # API routes (reframe, sessions, messages)
│   │   ├── components/       # React components
│   │   └── page.tsx          # Main application
│   ├── lib/
│   │   ├── ai-service.ts     # Multi-provider AI integration
│   │   └── db.ts             # Prisma client
│   └── components/ui/        # shadcn/ui components
├── prisma/
│   └── schema.prisma         # Database schema
├── .env.example              # Environment template
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon, Supabase, etc.)
- Clerk account
- AI provider API key (Mistral recommended - free tier available)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/optimism-engine.git

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
bunx prisma db push

# Start development server
bun run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# AI Provider (choose one or more)
MISTRAL_API_KEY="..."      # Recommended - free tier
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."
GROQ_API_KEY="..."
```

---

## 📊 Database Schema

```prisma
model User {
  id        String     @id
  sessions  Session[]
  messages  Message[]
}

model Session {
  id          String     @id
  title       String?
  currentLayer String   @default("surface")
  coreBelief  String?
  isCompleted Boolean    @default(false)
  messages    Message[]
  createdAt   DateTime
}

model Message {
  id                    String   @id
  role                  String   // "user" or "assistant"
  content               String
  distortionType        String?
  distortionExplanation String?
  reframe               String?
  probingQuestion       String?
  encouragement         String?
  icebergLayer          String?
  layerInsight          String?
  session               Session  @relation(...)
  createdAt             DateTime
}
```

---

## 💰 Monetization Opportunities

### Already Built
- ✅ User authentication system
- ✅ Session tracking
- ✅ AI conversation engine

### Easy Additions (Weekend Work)
| Feature | Revenue Potential |
|---------|-------------------|
| Premium subscription ($9.99/mo) | $10K-50K ARR |
| Therapist dashboard (B2B) | $50K-200K ARR |
| Corporate wellness packages | $100K+ ARR |
| White-label licensing | $20K-100K/year |

### Market Context
- **BetterHelp**: Acquired for ~$250M
- **Calm**: Valued at $2B
- **Woebot**: Raised $100M+
- **Wysa**: Raised $40M+

---

## 🔒 Security & Privacy

- Secure authentication via Clerk
- Environment-based API key storage
- No hardcoded secrets
- Database encryption (Neon)
- Ready for HIPAA compliance (minor additions needed)

---

## 📈 What's Included in Sale

- ✅ Complete source code (TypeScript/Next.js)
- ✅ Database schema and migrations
- ✅ 7 AI provider integrations
- ✅ CBT engine with 10 distortions + 9 emotions
- ✅ UI components (shadcn/ui)
- ✅ Documentation
- ✅ Deployment configuration (Vercel)
- ✅ Domain transfer (if applicable)
- ✅ Post-sale support (negotiable)

---

## 📞 Contact

For acquisition inquiries, reach out via:
- **Acquire.com listing**: [Link]
- **Email**: [Your email]

---

## 📄 License

Proprietary - All rights reserved. For acquisition/licensing inquiries, contact the owner.

---

*Built with ❤️ using Next.js, AI, and CBT principles.*
