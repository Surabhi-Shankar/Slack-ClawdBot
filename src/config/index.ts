import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Configuration schema with validation
const ConfigSchema = z.object({
  // Slack Configuration
  slack: z.object({
    botToken: z.string().min(1, 'SLACK_BOT_TOKEN is required'),
    appToken: z.string().min(1, 'SLACK_APP_TOKEN is required'),
    userToken: z.string().optional(),
    signingSecret: z.string().optional(),
  }),

  // AI Model Configuration
  ai: z.object({
    anthropicApiKey: z.string().optional(),
    openaiApiKey: z.string().optional(),
    defaultModel: z.string().default('claude-3-sonnet-20240229'),
  }),

  // RAG Configuration
  rag: z.object({
    enabled: z.boolean().default(true),
    embeddingModel: z.string().default('embed-english-v3.0'),
    vectorDbPath: z.string().default('./data/chroma'),
    indexIntervalHours: z.number().default(1),
    maxResults: z.number().default(10),
    minSimilarity: z.number().default(0.5),
  }),

  // Memory Configuration (mem0)
  memory: z.object({
    enabled: z.boolean().default(true),
    extractionModel: z.string().default('gpt-4o-mini'),
  }),

  // Application Settings
  app: z.object({
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    databasePath: z.string().default('./data/assistant.db'),
    maxHistoryMessages: z.number().default(50),
    sessionTimeoutMinutes: z.number().default(60),
  }),

  // Security Settings
  security: z.object({
    adminUserIds: z.array(z.string()).default([]),
    dmPolicy: z.enum(['open', 'pairing', 'closed']).default('pairing'),
    allowedUsers: z.array(z.string()).default(['*']),
    allowedChannels: z.array(z.string()).default(['*']),
  }),

  // Feature Flags
  features: z.object({
    threadSummary: z.boolean().default(true),
    taskScheduler: z.boolean().default(true),
    reactions: z.boolean().default(true),
    typingIndicator: z.boolean().default(true),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

function parseArrayFromEnv(value: string | undefined): string[] {
  if (!value) return ['*'];
  return value.split(',').map((s) => s.trim()).filter(s => s.length > 0);
}

function parseAdminIdsFromEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(s => s.length > 0);
}

function loadConfig(): Config {
  const rawConfig = {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN || '',
      appToken: process.env.SLACK_APP_TOKEN || '',
      userToken: process.env.SLACK_USER_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
    },
    ai: {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.DEFAULT_MODEL || 'claude-3-sonnet-20240229',
    },
    rag: {
      enabled: process.env.RAG_ENABLED !== 'false',
      embeddingModel: process.env.RAG_EMBEDDING_MODEL || 'embed-english-v3.0',
      vectorDbPath: process.env.RAG_VECTOR_DB_PATH || './data/chroma',
      indexIntervalHours: parseInt(process.env.RAG_INDEX_INTERVAL_HOURS || '1', 10),
      maxResults: parseInt(process.env.RAG_MAX_RESULTS || '10', 10),
      minSimilarity: parseFloat(process.env.RAG_MIN_SIMILARITY || '0.5'),
    },
    memory: {
      enabled: process.env.MEMORY_ENABLED !== 'false',
      extractionModel: process.env.MEMORY_EXTRACTION_MODEL || 'gpt-4o-mini',
    },
    app: {
      logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      databasePath: process.env.DATABASE_PATH || './data/assistant.db',
      maxHistoryMessages: parseInt(process.env.MAX_HISTORY_MESSAGES || '50', 10),
      sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60', 10),
    },
    security: {
      adminUserIds: parseAdminIdsFromEnv(process.env.ADMIN_USER_IDS),
      dmPolicy: (process.env.DM_POLICY as 'open' | 'pairing' | 'closed') || 'pairing',
      allowedUsers: parseArrayFromEnv(process.env.ALLOWED_USERS),
      allowedChannels: parseArrayFromEnv(process.env.ALLOWED_CHANNELS),
    },
    features: {
      threadSummary: process.env.ENABLE_THREAD_SUMMARY !== 'false',
      taskScheduler: process.env.ENABLE_TASK_SCHEDULER !== 'false',
      reactions: process.env.ENABLE_REACTIONS !== 'false',
      typingIndicator: process.env.ENABLE_TYPING_INDICATOR !== 'false',
    },
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Configuration validation failed:');
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  // Validate that at least one AI provider is configured
  if (!result.data.ai.anthropicApiKey && !result.data.ai.openaiApiKey) {
    console.error('At least one AI provider (Anthropic or OpenAI) must be configured');
    process.exit(1);
  }

  // Log configuration summary on startup
  if (result.data.app.logLevel === 'debug') {
    console.log('Configuration loaded:', {
      dmPolicy: result.data.security.dmPolicy,
      adminCount: result.data.security.adminUserIds.length,
      features: result.data.features,
    });
  }

  return result.data;
}

// Create the config
export const config = loadConfig();

// 👇 MOVED VALIDATION HERE - after config is created
// Validate Cohere API key if RAG is enabled
if (config.rag.enabled && !process.env.COHERE_API_KEY) {
  console.error('❌ RAG is enabled but COHERE_API_KEY is missing in .env file');
  console.error('   Get a free API key at: https://dashboard.cohere.com/api-keys');
  process.exit(1);
}

// Log successful config load
console.log('✅ Configuration loaded successfully');
if (config.rag.enabled) {
  console.log(`   RAG enabled with Cohere embeddings (${config.rag.embeddingModel})`);
}