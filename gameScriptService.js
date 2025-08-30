// Dynamic script discovery - no more hardcoded requires!
// Scripts are now loaded from the scripts/ folder dynamically
// Using static mapping for React Native compatibility

// Static mapping of script files to require statements
// React Native requires static string literals for require() calls
const SCRIPT_FILE_MAP = {
  './scripts/GameScript1.json': require('./scripts/GameScript1.json'),
  './scripts/GameScript2.json': require('./scripts/GameScript2.json'),
  './scripts/GameScript3.json': require('./scripts/GameScript3.json'),
  // './scripts/GameScript4.json': require('./scripts/GameScript4.json'),
  './scripts/GameScript5.json': require('./scripts/GameScript5.json'),
  './scripts/GameScript6.json': require('./scripts/GameScript6.json'),
  // Add more mappings as needed for new scripts
};

class GameScriptService {
  constructor() {
    this.gameScripts = {};
    this.loadScripts();
  }

  // Dynamically load all scripts from the scripts folder
  loadScripts() {
    try {
      // Load each script dynamically - the scriptId will be taken from the metadata
      const scriptFiles = [
        { path: './scripts/GameScript1.json', id: '1' },
        { path: './scripts/GameScript2.json', id: '2' },
        { path: './scripts/GameScript6.json', id: '6' },
        { path: './scripts/GameScript3.json', id: '3' },
       // { path: './scripts/GameScript4.json', id: '4' },
        { path: './scripts/GameScript5.json', id: '5' }
      ];

      scriptFiles.forEach(({ path, id }) => {
        try {
          // Look up the script in our static mapping
          const scriptData = SCRIPT_FILE_MAP[path];
          
          if (scriptData) {
            // Use the provided id (which matches what the app expects)
            this.gameScripts[id] = this.createGameScript(scriptData, id);
            // console.log(`[GameScriptService] Successfully loaded script: ${id} from ${path}`);
          } else {
            // console.log(`[GameScriptService] Script not found in mapping: ${path}`);
          }
        } catch (error) {
                      // console.log(`[GameScriptService] Failed to load script ${id} from ${path}:`, error.message);
          // Continue loading other scripts - don't crash the app
        }
      });

          // console.log(`[GameScriptService] Loaded ${Object.keys(this.gameScripts).length} scripts successfully`);
    // console.log(`[GameScriptService] Available script IDs:`, Object.keys(this.gameScripts));
    } catch (error) {
      console.error('[GameScriptService] Critical error loading scripts:', error.message);
      // Initialize with empty scripts object to prevent crashes
      this.gameScripts = {};
    }
  }

  createGameScript(scriptData, scriptId) {
    const metadata = scriptData.metadata || {};
    
    // Use the scriptId from metadata, but convert it to a string if it's a number
    // If metadata doesn't have scriptId, use the provided scriptId parameter
    const finalScriptId = metadata.scriptId ? String(metadata.scriptId) : scriptId;
    
    return {
      scriptId: finalScriptId,
      title: metadata.title || 'Untitled Mystery',
      version: metadata.version || '1.0',
      description: metadata.description || 'A murder mystery game',
      characters: this.parseCharacters(scriptData),
      gameFlow: this.parseGameFlow(scriptData),
      metadata: {
        ...metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: metadata.status !== 'coming_soon'
      }
    };
  }

  // Dynamically parse characters from the game script JSON
  parseCharacters(rawScript) {
    // Handle new structure with metadata and characters
    const charactersArray = rawScript.characters || rawScript;
    
    return charactersArray.map(character => ({
      characterName: character.Character,
      shortDescription: character['Short Description'],
      sex: character.Sex,
      inviteDescription: character['Invite Description'],
      introduction: character.Introduction,
      isMurderer: character.isMurderer || character.Character === 'Penny Prattle', // Use new field or fallback
      
      // Character metadata
      characterId: character.characterId,
      suggestedAge: character.suggestedAge,
      costumeNotes: character.costumeNotes,
      accent: character.accent,
      suggestedCostume: character.suggestedCostume,
      suggestedProps: character.suggestedProps, // Props specific to this character
      motive: character.Motive,
      means: character.Means,
      opportunity: character.Opportunity,
      redHerrings: character.RedHerrings ? character.RedHerrings.split('\n') : [],
      
      // Round-specific scripts
      scripts: this.parseCharacterScripts(character),
      
      // Final statement order
      finalStatementOrder: character['Order of Final Statement'],
      whyItIsntThem: character['Why it isn\'t them']
    }));
  }

  // Parse character scripts for each round
  parseCharacterScripts(character) {
    const scripts = {};
    
    // Parse each round dynamically
    for (let round = 1; round <= 6; round++) {
      const roundScripts = {};
      
      // Round 1 has special structure
      if (round === 1) {
        roundScripts.introduction = character['Round 1 - Introduction Script'];
        roundScripts.secretInformation = character['Secret information'];
        roundScripts.instructions = 'Introduce yourself to the group';
      }
      // Round 2 has story
      else if (round === 2) {
        roundScripts.story = character['Round 2 - Story'];
        roundScripts.instructions = 'Tell your story (and react to others\' stories)';
      }
      // Rounds 3-5 have accusation structure
      else if (round >= 3 && round <= 5) {
        roundScripts.accuses = character[`Round ${round} - Accuses`];
        roundScripts.accusation = character[`Round ${round} - Accusation`];
        roundScripts.accusedOf = character[`Round ${round} - Accused of`];
        roundScripts.rebuttal = character[`Round ${round} - Rebuttal`];
        roundScripts.instructions = 'Make your observation';
      }
      // Round 6 has final statement
      else if (round === 6) {
        roundScripts.finalStatement = character['Round 6 - Final statement'];
        roundScripts.instructions = 'Read your final statements (your statement order: [Order of Final Statement])';
      }
      
      if (Object.keys(roundScripts).length > 0) {
        scripts[round] = roundScripts;
      }
    }
    
    return scripts;
  }

  // Parse game flow configuration
  parseGameFlow(rawScript) {
    // Handle new structure with metadata and characters
    const charactersArray = rawScript.characters || rawScript;
    const metadata = rawScript.metadata || {};
    
    return {
      totalRounds: metadata.numberOfRounds || 7,
      accusationRound: 5.5,
      finalStatementRound: 6,
      endRound: 7,
      roundOrder: [1, 2, 3, 4, 5, 5.5, 6, 7],
      maxPlayers: metadata.maxPlayers || charactersArray.length,
      minPlayers: metadata.minPlayers || Math.min(2, charactersArray.length), // Allow as few as 2 players
      roundInstructions: {
        1: 'Introduce yourself to the group',
        2: 'Tell your story (and react to others\' stories)',
        3: 'Make your observation',
        4: 'Make your observation',
        5: 'Make your observation',
        5.5: 'Deliberate with your party. Make your accusations (out loud) and record who you think is the Murderer(s)!',
        6: 'Read your final statements (your statement order: [Order of Final Statement])',
        7: 'The END'
      }
    };
  }

  // Get available game scripts
  getAvailableScripts() {
    return Object.keys(this.gameScripts).map(scriptId => {
      const script = this.gameScripts[scriptId];
      return {
        scriptId,
        title: script.title,
        version: script.version,
        description: script.description,
        maxPlayers: script.gameFlow.maxPlayers,
        minPlayers: script.gameFlow.minPlayers,
        difficulty: script.metadata.difficulty,
        estimatedDuration: script.metadata.estimatedDuration,
        setting: script.metadata.setting,
        timePeriod: script.metadata.timePeriod,
        tags: script.metadata.tags || [],
        status: script.metadata.status || 'available',
        isActive: script.metadata.isActive
      };
    });
  }

  // Get specific game script
  getGameScript(scriptId) {
    return this.gameScripts[scriptId];
  }

  // Get characters for a specific game script
  getCharacters(scriptId) {
    const script = this.gameScripts[scriptId];
    return script ? script.characters : [];
  }

  // Get character by name
  getCharacterByName(scriptId, characterName) {
    const characters = this.getCharacters(scriptId);
    return characters.find(char => char.characterName === characterName);
  }

  // Get murderer character
  getMurdererCharacter(scriptId) {
    const characters = this.getCharacters(scriptId);
    return characters.find(char => char.isMurderer);
  }

  // Get all murderer characters (for multiple murderer support)
  getMurdererCharacters(scriptId) {
    const characters = this.getCharacters(scriptId);
    return characters.filter(char => char.isMurderer);
  }

  // Get character script for specific round
  getCharacterScript(scriptId, characterName, round) {
    const character = this.getCharacterByName(scriptId, characterName);
    if (!character || !character.scripts[round]) {
      return null;
    }
    return character.scripts[round];
  }

  // Get available characters (not assigned to players)
  getAvailableCharacters(scriptId, assignedCharacters = []) {
    const characters = this.getCharacters(scriptId);
    return characters.filter(char => !assignedCharacters.includes(char.characterName));
  }

  // Get game flow configuration
  getGameFlow(scriptId) {
    const script = this.gameScripts[scriptId];
    return script ? script.gameFlow : null;
  }

  // Validate game state against script requirements
  validateGameState(scriptId, gameState) {
    const script = this.gameScripts[scriptId];
    if (!script) return { valid: false, error: 'Invalid script ID' };

    const { gameFlow } = script;
    const { currentRound, players } = gameState;

    // Validate round number
    if (currentRound < 0 || currentRound > gameFlow.roundOrder.length) {
      return { valid: false, error: 'Invalid round number' };
    }

    // Validate player count
    if (players.length < gameFlow.minPlayers) {
      return { valid: false, error: `Need at least ${gameFlow.minPlayers} players` };
    }

    if (players.length > gameFlow.maxPlayers) {
      return { valid: false, error: `Maximum ${gameFlow.maxPlayers} players allowed` };
    }

    return { valid: true };
  }

  // Get round instructions
  getRoundInstructions(scriptId, round) {
    const gameFlow = this.getGameFlow(scriptId);
    return gameFlow?.roundInstructions[round] || 'Continue with the game';
  }

  // Get accusation targets for a character in a specific round
  getAccusationTargets(scriptId, characterName, round) {
    const character = this.getCharacterByName(scriptId, characterName);
    if (!character || !character.scripts[round]) return null;
    
    const accuses = character.scripts[round].accuses;
    if (!accuses) return null;
    
    return accuses;
  }

  // Get all characters that can be accused in a specific round
  getAccusableCharacters(scriptId, round) {
    const characters = this.getCharacters(scriptId);
    return characters.map(char => char.characterName);
  }

  // Check if a script is available for play
  isScriptAvailable(scriptId) {
    const script = this.gameScripts[scriptId];
    return script && script.metadata.isActive && script.metadata.status !== 'coming_soon';
  }

  // Get script status
  getScriptStatus(scriptId) {
    const script = this.gameScripts[scriptId];
    return script ? script.metadata.status || 'available' : 'not_found';
  }

  // Get the introduction text for a game script
  getIntroduction(scriptId) {
    const script = this.gameScripts[scriptId];
    return script ? script.metadata.introduction : null;
  }
}

// Export an instance of the service
module.exports = new GameScriptService(); 