export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string; // Emoji for visual appeal
  category: string; // Suggested goal type category
  milestones: Array<{
    name: string;
    order: number;
    daysOffset?: number; // Optional: days from goal start for target date
  }>;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'run-5k',
    name: 'Run a 5K',
    description: 'Complete a 5-kilometer race with a structured training plan',
    color: 'bg-green-500',
    icon: '🏃',
    category: 'Fitness',
    milestones: [
      { name: 'Run 1 mile without stopping', order: 1, daysOffset: 14 },
      { name: 'Run 2 miles continuously', order: 2, daysOffset: 28 },
      { name: 'Run 3 miles at comfortable pace', order: 3, daysOffset: 42 },
      { name: 'Complete first 5K time trial', order: 4, daysOffset: 56 },
      { name: 'Run official 5K race', order: 5, daysOffset: 70 },
    ],
  },
  {
    id: 'learn-language',
    name: 'Learn a Language',
    description: 'Achieve conversational fluency in a new language',
    color: 'bg-purple-500',
    icon: '🌍',
    category: 'Learning',
    milestones: [
      { name: 'Learn basic greetings and introductions', order: 1, daysOffset: 7 },
      { name: 'Master 500 common vocabulary words', order: 2, daysOffset: 30 },
      { name: 'Hold a 5-minute conversation', order: 3, daysOffset: 60 },
      { name: 'Watch a movie without subtitles', order: 4, daysOffset: 90 },
      { name: 'Pass B1 proficiency test', order: 5, daysOffset: 120 },
    ],
  },
  {
    id: 'save-money',
    name: 'Save $5,000',
    description: 'Build an emergency fund through consistent saving habits',
    color: 'bg-blue-500',
    icon: '💰',
    category: 'Finance',
    milestones: [
      { name: 'Save first $500', order: 1, daysOffset: 15 },
      { name: 'Reach $1,500 in savings', order: 2, daysOffset: 45 },
      { name: 'Hit $2,500 milestone', order: 3, daysOffset: 75 },
      { name: 'Achieve $4,000 saved', order: 4, daysOffset: 105 },
      { name: 'Complete $5,000 goal', order: 5, daysOffset: 135 },
    ],
  },
  {
    id: 'read-books',
    name: 'Read 24 Books This Year',
    description: 'Develop a consistent reading habit of 2 books per month',
    color: 'bg-orange-500',
    icon: '📚',
    category: 'Learning',
    milestones: [
      { name: 'Finish first 3 books', order: 1, daysOffset: 45 },
      { name: 'Complete 6 books (Q1)', order: 2, daysOffset: 90 },
      { name: 'Reach 12 books (halfway)', order: 3, daysOffset: 180 },
      { name: 'Finish 18 books (Q3)', order: 4, daysOffset: 270 },
      { name: 'Complete all 24 books', order: 5, daysOffset: 365 },
    ],
  },
  {
    id: 'meditation-habit',
    name: 'Build Daily Meditation Practice',
    description: 'Establish a consistent meditation routine for mental wellness',
    color: 'bg-indigo-500',
    icon: '🧘',
    category: 'Health',
    milestones: [
      { name: 'Meditate 5 minutes daily for 1 week', order: 1, daysOffset: 7 },
      { name: 'Extend to 10 minutes for 2 weeks', order: 2, daysOffset: 21 },
      { name: 'Maintain 15-minute sessions for 1 month', order: 3, daysOffset: 51 },
      { name: 'Complete 60-day streak', order: 4, daysOffset: 81 },
      { name: 'Achieve 100-day meditation streak', order: 5, daysOffset: 121 },
    ],
  },
  {
    id: 'side-project',
    name: 'Launch a Side Project',
    description: 'Take a personal project from idea to public launch',
    color: 'bg-pink-500',
    icon: '🚀',
    category: 'Career',
    milestones: [
      { name: 'Define project scope and MVP features', order: 1, daysOffset: 7 },
      { name: 'Complete core functionality', order: 2, daysOffset: 30 },
      { name: 'Finish initial design and UI', order: 3, daysOffset: 45 },
      { name: 'Test with beta users', order: 4, daysOffset: 60 },
      { name: 'Public launch and marketing', order: 5, daysOffset: 75 },
    ],
  },
  {
    id: 'learn-instrument',
    name: 'Learn to Play Guitar',
    description: 'Master guitar basics and play your favorite songs',
    color: 'bg-yellow-500',
    icon: '🎸',
    category: 'Creative',
    milestones: [
      { name: 'Learn basic chords (G, C, D, Em, Am)', order: 1, daysOffset: 14 },
      { name: 'Play first complete song', order: 2, daysOffset: 30 },
      { name: 'Master chord transitions smoothly', order: 3, daysOffset: 60 },
      { name: 'Learn fingerpicking technique', order: 4, daysOffset: 90 },
      { name: 'Perform 5 songs confidently', order: 5, daysOffset: 120 },
    ],
  },
  {
    id: 'weight-loss',
    name: 'Lose 20 Pounds',
    description: 'Achieve healthy weight loss through diet and exercise',
    color: 'bg-red-500',
    icon: '⚖️',
    category: 'Fitness',
    milestones: [
      { name: 'Lose first 5 pounds', order: 1, daysOffset: 21 },
      { name: 'Reach 10 pounds lost', order: 2, daysOffset: 42 },
      { name: 'Hit 15 pounds milestone', order: 3, daysOffset: 63 },
      { name: 'Lose 18 pounds total', order: 4, daysOffset: 77 },
      { name: 'Achieve 20-pound weight loss goal', order: 5, daysOffset: 90 },
    ],
  },
  {
    id: 'write-novel',
    name: 'Write a Novel',
    description: 'Complete a first draft of a 50,000+ word novel',
    color: 'bg-teal-500',
    icon: '✍️',
    category: 'Creative',
    milestones: [
      { name: 'Outline plot and main characters', order: 1, daysOffset: 14 },
      { name: 'Write first 10,000 words', order: 2, daysOffset: 35 },
      { name: 'Reach 25,000 words (halfway)', order: 3, daysOffset: 70 },
      { name: 'Complete 40,000 words', order: 4, daysOffset: 105 },
      { name: 'Finish first draft (50,000+ words)', order: 5, daysOffset: 140 },
    ],
  },
  {
    id: 'network-professionally',
    name: 'Grow Professional Network',
    description: 'Expand your career network with meaningful connections',
    color: 'bg-cyan-500',
    icon: '🤝',
    category: 'Career',
    milestones: [
      { name: 'Attend first networking event', order: 1, daysOffset: 7 },
      { name: 'Connect with 10 new professionals', order: 2, daysOffset: 21 },
      { name: 'Schedule 5 coffee chats', order: 3, daysOffset: 42 },
      { name: 'Join industry community or group', order: 4, daysOffset: 60 },
      { name: 'Build network of 50+ quality contacts', order: 5, daysOffset: 90 },
    ],
  },
];
