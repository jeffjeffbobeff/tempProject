// ============================================================================
// GAME TYPES
// ============================================================================

export interface User {
  id: string;
  username: string;
}

export interface GameScript {
  scriptId: string;
  title: string;
  version: string;
  description: string;
  characters: Character[];
  gameFlow: any; // Will define this more specifically later
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
  };
}

export interface Character {
  characterId: string;
  characterName: string;
  shortDescription: string;
  sex: string;
  inviteDescription: string;
  introduction: string;
  isMurderer: boolean;
}

export interface GameState {
  gameId: string | null;
  selectedGameScript: GameScript | null;
  gameData: any | null; // Will define this more specifically later
  selectedCharacter: Character | null;
  gameCode: string;
  gameLoading: boolean;
}

export interface AppState {
  view: string;
  loading: boolean;
  userId: string | null;
  username: string;
  textSize: 'medium' | 'large';
}
