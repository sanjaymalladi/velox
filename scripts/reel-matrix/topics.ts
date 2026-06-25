/** Topic definitions for the 3×3 theme reel matrix. */

export type ReelTopicId = 'ai-intelligence' | 'product-launch' | 'dev-workflow'

export interface ReelTopic {
  id: ReelTopicId
  stockQuery: string
  stockQueryAlt: string
  hero: { kicker: string; title: string; subtitle: string; caption: string }
  announcement: { title: string; subtitle: string; badge: string; caption: string }
  problem: { problem: string; solution: string; caption: string }
  features: { title: string; caption: string; items: [string, string, string] }
  chart: { kicker: string; headline: string; caption: string }
  quote: { text: string; caption: string }
  launch: { title: string; subtitle: string; cta: string; proof: string; caption: string }
  ranking: { title: string; caption: string; items: [string, string, string, string] }
  metrics: { caption: string; countdown: string; countdownLabel: string }
  cta: { title: string; subtitle: string; button: string; caption: string }
}

export const REEL_TOPICS: Record<ReelTopicId, ReelTopic> = {
  'ai-intelligence': {
    id: 'ai-intelligence',
    stockQuery: 'abstract neural network light particles',
    stockQueryAlt: 'abstract neural network dark minimal',
    hero: {
      kicker: 'INTRODUCING',
      title: 'Intelligence.',
      subtitle: 'Reimagined for the age of AI.',
      caption: 'Intelligence. Reimagined.',
    },
    announcement: {
      title: 'Artificial Intelligence',
      subtitle: 'Not a feature. A foundation.',
      badge: 'CHAPTER 01',
      caption: 'A foundation for how we create, learn, and build.',
    },
    problem: {
      problem: 'Information everywhere. Understanding nowhere.',
      solution: 'Models that read, reason, and respond in context.',
      caption: 'From noise to clarity.',
    },
    features: {
      title: 'What changed',
      caption: 'Three shifts defining modern AI.',
      items: ['Multimodal perception', 'Long-context reasoning', 'Agentic workflows'],
    },
    chart: {
      kicker: 'ADOPTION',
      headline: 'The curve is exponential.',
      caption: 'From labs to everyday products.',
    },
    quote: {
      text: 'The most profound technology disappears into the work you already do.',
      caption: 'Technology that feels invisible.',
    },
    launch: {
      title: 'Built for creators',
      subtitle: 'Write intent. Ship motion.',
      cta: 'VML → MP4',
      proof: 'Deterministic canvas. Native export.',
      caption: 'Design in markup. Render in seconds.',
    },
    ranking: {
      title: 'Breakthrough moments',
      caption: 'Each leap compounds the next.',
      items: [
        'Transformers scale language',
        'Vision meets text',
        'Tool-use agents emerge',
        'On-device intelligence',
      ],
    },
    metrics: {
      caption: 'Speed without sacrificing craft.',
      countdown: '2026',
      countdownLabel: 'The era of generative video',
    },
    cta: {
      title: 'The future is already here.',
      subtitle: 'Paste markup. Preview instantly. Export in native quality.',
      button: 'Start with Velox',
      caption: 'Paste. Preview. Export.',
    },
  },
  'product-launch': {
    id: 'product-launch',
    stockQuery: 'minimal product design soft light',
    stockQueryAlt: 'modern app interface clean',
    hero: {
      kicker: 'NOW AVAILABLE',
      title: 'Nova.',
      subtitle: 'Focus reimagined for busy teams.',
      caption: 'Meet Nova. Focus reimagined.',
    },
    announcement: {
      title: 'Nova Workspace',
      subtitle: 'One app. Every workflow.',
      badge: 'LAUNCH DAY',
      caption: 'Everything your team needs in one calm surface.',
    },
    problem: {
      problem: 'Tabs everywhere. Context nowhere.',
      solution: 'A single canvas that follows your work.',
      caption: 'Less switching. More shipping.',
    },
    features: {
      title: 'Why teams switch',
      caption: 'Three reasons Nova wins.',
      items: ['Unified inbox and docs', 'AI summaries on demand', 'Offline-first sync'],
    },
    chart: {
      kicker: 'TRACTION',
      headline: 'Signups are compounding.',
      caption: 'From beta to thousands of teams.',
    },
    quote: {
      text: 'Nova cut our standup prep from forty minutes to five.',
      caption: 'Real teams. Real results.',
    },
    launch: {
      title: 'Start free today',
      subtitle: 'No credit card. Full team trial.',
      cta: 'Try Nova Free',
      proof: 'Import from Notion in one click.',
      caption: 'Your workspace awaits.',
    },
    ranking: {
      title: 'Launch highlights',
      caption: 'Built in public. Shipped with care.',
      items: ['Private beta to 500 teams', 'SOC 2 Type II certified', 'Mobile apps ship day one', 'API for power users'],
    },
    metrics: {
      caption: 'Launch week momentum.',
      countdown: '10K',
      countdownLabel: 'Teams on the waitlist',
    },
    cta: {
      title: 'Ready to focus again?',
      subtitle: 'Join thousands of teams already on Nova.',
      button: 'Get Nova',
      caption: 'Free trial. Cancel anytime.',
    },
  },
  'dev-workflow': {
    id: 'dev-workflow',
    stockQuery: 'code editor terminal dark minimal',
    stockQueryAlt: 'developer workflow abstract nodes',
    hero: {
      kicker: 'FOR BUILDERS',
      title: 'Ship video.',
      subtitle: 'From markup to MP4 in one pipeline.',
      caption: 'Ship video from markup.',
    },
    announcement: {
      title: 'Velox Pipeline',
      subtitle: 'Code-first motion graphics.',
      badge: 'DEV TOOLS',
      caption: 'Write VML. Render natively. No browser farm.',
    },
    problem: {
      problem: 'After Effects loops. FFmpeg hacks.',
      solution: 'Deterministic canvas frames from declarative markup.',
      caption: 'One source of truth for motion.',
    },
    features: {
      title: 'The workflow',
      caption: 'Three steps. Zero guesswork.',
      items: ['Author VML or TypeScript', 'Preview in the CLI', 'Export 1080p MP4'],
    },
    chart: {
      kicker: 'VELOCITY',
      headline: 'Iteration time collapsed.',
      caption: 'From hours of timeline scrubbing to minutes.',
    },
    quote: {
      text: 'We replaced our entire motion pipeline with Velox markup.',
      caption: 'CI renders reels on every merge.',
    },
    launch: {
      title: 'Built for CI/CD',
      subtitle: 'Render in GitHub Actions.',
      cta: 'pnpm velox render',
      proof: 'Headless Node. No Chromium.',
      caption: 'Automate your launch videos.',
    },
    ranking: {
      title: 'Why developers pick Velox',
      caption: 'Engineering values. Motion output.',
      items: ['Deterministic frame output', 'Theme-locked aesthetics', 'Native canvas renderer', 'VML for LLM authoring'],
    },
    metrics: {
      caption: 'Production-grade exports.',
      countdown: '30fps',
      countdownLabel: '1080p native render',
    },
    cta: {
      title: 'Stop fighting timelines.',
      subtitle: 'Install the CLI. Ship your first reel tonight.',
      button: 'npm i -g velox-video',
      caption: 'Code. Render. Ship.',
    },
  },
}

export const REEL_THEMES = ['apple', 'notion', 'dell-1996'] as const
export type ReelThemeId = (typeof REEL_THEMES)[number]

export function transitionForTheme(theme: ReelThemeId): string {
  switch (theme) {
    case 'apple':
      return 'blurDissolve'
    case 'notion':
      return 'zoomSmooth'
    case 'dell-1996':
      return 'wipe'
  }
}
