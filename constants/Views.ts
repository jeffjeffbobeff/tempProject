// ============================================================================
// VIEW CONSTANTS
// ============================================================================

export const VIEWS = {
  ONBOARDING: 'ONBOARDING',
  HOME: 'HOME',
  GAME_SELECTION: 'GAME_SELECTION',
  LOBBY: 'LOBBY',
  INTRODUCTION: 'INTRODUCTION',
  GAME: 'GAME',
  JOIN_GAME: 'JOIN_GAME',
  CHARACTER_SELECTION: 'CHARACTER_SELECTION',
  MY_GAMES: 'MY_GAMES',
} as const;

export type ViewType = typeof VIEWS[keyof typeof VIEWS];
