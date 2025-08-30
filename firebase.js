import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';
import gameScriptService from './gameScriptService.js';
import isEqual from 'fast-deep-equal';

// Helper to strip volatile fields from game data for deep equality
function stripVolatileFields(data) {
  if (!data || typeof data !== 'object') return data;
  // Remove volatile fields from the root and from players
  const { updatedAt, createdAt, startedAt, completedAt, ...rest } = data;
  let players = rest.players;
  if (Array.isArray(players)) {
    players = players.map(player => {
      const { updatedAt, createdAt, lastActiveAt, ...playerRest } = player;
      return playerRest;
    });
    rest.players = players;
  }
  // Remove volatile fields from roundData if present
  if (rest.roundData && typeof rest.roundData === 'object') {
    const newRoundData = {};
    Object.entries(rest.roundData).forEach(([round, roundObj]) => {
      if (typeof roundObj === 'object' && roundObj !== null) {
        const { startedAt, completedAt, ...roundRest } = roundObj;
        newRoundData[round] = roundRest;
      } else {
        newRoundData[round] = roundObj;
      }
    });
    rest.roundData = newRoundData;
  }
  return rest;
}

// Firebase configuration and service functions
class FirebaseService {
  constructor() {
    this.simulationMode = true; // Enable simulation mode for single device testing
    this.simulatedPlayers = [];
    this.currentGameId = null;
    this.db = null;
    
    // Initialize Firebase with a longer delay to ensure native modules are ready
    setTimeout(() => {
      this.initializeFirebaseWithRetry();
    }, 2000);
  }

  async initializeFirebaseWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔧 Firebase initialization attempt ${attempt}/${maxRetries}`);
        
        // Try to get the Firestore instance directly
        const firestoreInstance = firestore();
        console.log('🔧 firestore() returned:', typeof firestoreInstance, firestoreInstance);
        
        // Test if we can actually use it
        if (firestoreInstance && typeof firestoreInstance.collection === 'function') {
          this.db = firestoreInstance;
          console.log('🔧 Firebase service initialized successfully');
          
          // Skip the test read to prevent hanging
          console.log('🔧 Firebase service ready - skipping test read to prevent hanging');
          
          return true; // Return true on successful initialization
        } else {
          console.log('🔧 firestoreInstance.collection is not a function:', typeof firestoreInstance.collection);
          throw new Error('Firestore instance is not properly initialized');
        }
      } catch (error) {
        console.error(`🔧 Firebase initialization attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.log('🔧 All Firebase initialization attempts failed, using mock mode');
          this.db = null;
          return false; // Return false on failure
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  // Test Firebase connectivity
  async testFirebaseConnection() {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }
      
      console.log('🔧 Testing Firebase connection...');
      
      // Try a simple read operation
      const testDoc = await this.db.collection('games').limit(1).get();
      console.log('🔧 Firebase test successful, docs count:', testDoc.docs.length);
      
      return true;
    } catch (error) {
      console.error('🔧 Firebase connection test failed:', error);
      return false;
    }
  }

  // Check if Firebase is ready
  isReady() {
    return this.db !== null;
  }

  // Wait for Firebase to be ready
  async waitForReady(maxWaitTime = 10000) {
    const startTime = Date.now();
    
    while (!this.isReady() && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.isReady()) {
      throw new Error('Firebase failed to initialize within the timeout period');
    }
    
    return true;
  }

  // Generate a unique game ID (6 characters)
  generateGameId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let gameId = '';
    for (let i = 0; i < 6; i++) {
      gameId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return gameId;
  }

  // Calculate collision probability for 6-character codes
  // With 36 characters (A-Z, 0-9) and 6 positions:
  // Total possible combinations: 36^6 = 2,176,782,336
  // This gives us over 2 billion unique codes
  // Collision probability is extremely low even with millions of games

  // Generate a unique game ID with collision detection
  async generateUniqueGameId(maxAttempts = 10) {
    console.log('🔧 generateUniqueGameId called, this.db:', this.db);
    console.log('🔧 Firebase ready check:', this.isReady());
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const gameId = this.generateGameId();
      console.log(`🔧 Attempt ${attempt}: Generated game ID: ${gameId}`);
      
      try {
        // Check if this game ID already exists
        console.log(`🔧 Checking if ${gameId} exists in database...`);
        const gameDoc = await this.db.collection('games').doc(gameId).get();
        console.log(`🔧 Game ${gameId} exists:`, gameDoc._exists);
        console.log(`🔧 gameDoc type:`, typeof gameDoc);
        console.log(`🔧 gameDoc keys:`, Object.keys(gameDoc));
        console.log(`🔧 gameDoc._exists type:`, typeof gameDoc._exists);
        
        if (!gameDoc._exists) {
          // Game ID is unique, return it
          console.log(`🔧 Game ID ${gameId} is unique, returning it`);
          return gameId;
        }
        
        // If we're on the last attempt, throw an error
        if (attempt === maxAttempts) {
          console.log(`🔧 Max attempts reached, throwing error`);
          throw new Error('Unable to generate unique game ID after maximum attempts');
        }
        
        // Continue to next attempt
        console.log(`🔧 Game ID ${gameId} exists, trying again...`);
      } catch (error) {
        console.error(`🔧 Error on attempt ${attempt}:`, error);
        
        // If it's the last attempt, re-throw the error
        if (attempt === maxAttempts) {
          throw error;
        }
        // Otherwise, continue to next attempt
      }
    }
    
    // This should never be reached, but just in case
    throw new Error('Unable to generate unique game ID');
  }

  // Create a new game session with the new data structure
  async createGame(hostUserId, hostUsername, scriptId = 'opera_murder_mystery_v1') {
    try {
      console.log('🔧 createGame called with:', { hostUserId, hostUsername, scriptId });
      console.log('🔧 this.db:', this.db);
      console.log('🔧 Firebase ready check:', this.isReady());
      
      // Ensure Firebase is ready
      if (!this.db) {
        throw new Error('Firebase is not ready yet. Please wait a moment and try again.');
      }
      
      // Test Firebase connectivity
      const connectionTest = await this.testFirebaseConnection();
      if (!connectionTest) {
        throw new Error('Firebase connection test failed. Please check your internet connection and try again.');
      }
      
      console.log('🔧 Firebase is ready, generating unique game ID...');
      const gameId = await this.generateUniqueGameId();
      console.log('🔧 Generated game ID:', gameId);
      
      const gameScript = gameScriptService.getGameScript(scriptId);
      console.log('🔧 Game script found:', !!gameScript);
      
      if (!gameScript) {
        throw new Error('Invalid game script ID');
      }
      
      const gameData = {
        gameId,
        gameScriptId: scriptId,
        status: 'LOBBY',
        currentRound: 0,
        roundState: 'WAITING_FOR_PLAYERS',
        
        // Host management
        hostUserId,
        hostUsername,
        
        // Game metadata
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        startedAt: null,
        completedAt: null,
        deletedAt: null, // Soft delete timestamp
        gameState: 'LOBBY', // LOBBY, IN_PROGRESS, COMPLETED, DELETED
        
        // Game configuration
        maxPlayers: gameScript.gameFlow.maxPlayers,
        minPlayers: gameScript.gameFlow.minPlayers,
        allowRejoin: true,
        autoAdvanceRounds: false,
        
        // Players array - ALWAYS initialize this
        players: [],
        
        // Round-specific data
        roundData: {},
        
        // Accusation tracking
        accusations: {
          round: 5.5,
          accusations: [],
          completed: false
        },
        
        // Game results
        results: {
          murdererCharacter: null,
          correctAccusations: 0,
          totalAccusations: 0,
          winner: null
        }
      };

      await this.db.collection('games').doc(gameId).set(gameData);
      this.currentGameId = gameId;
      
      // Create initial host player
      await this.addPlayerToGame(gameId, hostUserId, hostUsername, true);
      
      // Track user participation (host)
      await this.trackUserParticipation(gameId, hostUserId, hostUsername, 'host');
      
      // Track game creation analytics
      await this.trackGameCreation(gameId, hostUserId, scriptId, 1);
      
      return gameId;
    } catch (error) {
      console.error('Error creating game:', error);
      throw new Error('Failed to create game');
    }
  }

  // Add player to game with new data structure
  async addPlayerToGame(gameId, userId, username, isHost = false) {
    const playerData = {
      userId,
      username,
      characterName: null,
      isHost,
      isSimulated: false,
      
      // Round-specific states
      roundStates: {},
      
      // Accusation tracking
      accusations: {
        made: [],
        received: []
      },
      
      // Game participation
      joinedAt: Date.now(),
      leftAt: null,
      reconnectedAt: null,
      lastActiveAt: Date.now(),
      
      // Character-specific data
      characterData: {
        isMurderer: false,
        secretInformation: null
      }
    };

    // Real Firebase implementation
    const gameRef = this.db.collection('games').doc(gameId);
    const playerRef = gameRef.collection('players').doc(userId);
    
    await playerRef.set(playerData);
    
    // Update game metadata
    await gameRef.update({
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    // Track user participation (player)
    await this.trackUserParticipation(gameId, userId, username, 'player');
    
    return this.getGameData(gameId);
  }

  // Remove a player from a game (hard delete)
  async removePlayerFromGame(gameId, userId) {
    // Real Firebase implementation: hard delete the player document
    const gameRef = this.db.collection('games').doc(gameId);
    const playerRef = gameRef.collection('players').doc(userId);
    await playerRef.delete();
    // Optionally update game metadata
    await gameRef.update({
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    return true;
  }

  // Join an existing game
  async joinGame(gameId, userId, username) {
    try {
      // Real Firebase implementation
      const gameRef = this.db.collection('games').doc(gameId);
      const gameDoc = await gameRef.get();

      if (!gameDoc.exists) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data();
      
      // Check if player is already in the game
      const playerDoc = await gameRef.collection('players').doc(userId).get();
      if (playerDoc.exists) {
        this.currentGameId = gameId;
        return gameData;
      }

      // Add new player to the game
      await this.addPlayerToGame(gameId, userId, username, false);
      
      return this.getGameData(gameId);
    } catch (error) {
      console.error('Error joining game:', error);
      throw new Error('Failed to join game');
    }
  }

  // Get complete game data including players
  async getGameData(gameId) {
    try {
      const gameRef = this.db.collection('games').doc(gameId);
      const gameDoc = await gameRef.get();
      
      if (!gameDoc._exists) {
        return null;
      }
      
      const gameData = gameDoc._data;
      
      // Get all players
      const playersSnapshot = await gameRef.collection('players').get();
      const players = [];
      playersSnapshot.docs.forEach(doc => {
        players.push(doc._data);
      });
      
      return {
        ...gameData,
        players
      };
    } catch (error) {
      console.error('Error getting game data:', error);
      return null;
    }
  }

  // Get real-time updates for a game
  subscribeToGame(gameId, callback) {
    let lastData = null;
    const handleUpdate = (data) => {
      const strippedData = stripVolatileFields(data);
      if (!isEqual(strippedData, lastData)) {
        lastData = strippedData;
        callback(data);
      }
    };

    try {
      const gameRef = this.db.collection('games').doc(gameId);
      
      // Listen to the main game document
      const unsubGame = gameRef.onSnapshot(() => {
        this.getGameData(gameId).then(handleUpdate);
      });
      
      // Listen to the players subcollection
      const unsubPlayers = gameRef.collection('players').onSnapshot(() => {
        this.getGameData(gameId).then(handleUpdate);
      });
      
      // Return a function to unsubscribe both
      return () => {
        unsubGame();
        unsubPlayers();
      };
    } catch (error) {
      console.error('Error setting up subscription:', error);
      // Fallback to mock subscription
      return () => {}; // No mock subscription to clean up
    }
  }

  // Update player ready status for specific round
  async updatePlayerReady(gameId, userId, readyStatus, round = null) {
    try {
      const gameRef = this.db.collection('games').doc(gameId);
      const playerRef = gameRef.collection('players').doc(userId);
      
      const updateData = {
        lastActiveAt: firestore.FieldValue.serverTimestamp()
      };
      
      if (round) {
        // Update specific round state
        updateData[`roundStates.${round}`] = {
          ready: readyStatus,
          readyAt: readyStatus ? firestore.FieldValue.serverTimestamp() : null
        };
      } else {
        // Legacy support
        updateData.readyStatus = readyStatus;
      }
      
      await playerRef.update(updateData);
      
      // Update game timestamp
      await gameRef.update({
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating player ready status:', error);
      throw new Error('Failed to update ready status');
    }
  }

  // Assign character to player
  async assignCharacter(gameId, userId, characterName) {
    try {
      const gameRef = this.db.collection('games').doc(gameId);
      const playerRef = gameRef.collection('players').doc(userId);
      
      // Get character data from game script
      const gameData = await this.getGameData(gameId);
      const character = gameScriptService.getCharacterByName(gameData.gameScriptId, characterName);
      
      const updateData = {
        characterName,
        lastActiveAt: firestore.FieldValue.serverTimestamp()
      };
      
      if (character) {
        updateData.characterData = {
          isMurderer: character.isMurderer,
          secretInformation: character.scripts[1]?.secretInformation || null
        };
      }
      
      await playerRef.update(updateData);
      
      // Update game timestamp
      await gameRef.update({
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error assigning character:', error);
      throw new Error('Failed to assign character');
    }
  }

  // Select character (alias for assignCharacter)
  async selectCharacter(gameId, userId, characterName) {
    return this.assignCharacter(gameId, userId, characterName);
  }

  // Start the game (host only)
  async startGame(gameId) {
    try {
      // Real Firebase implementation
      const gameRef = this.db.collection('games').doc(gameId);
      const gameDoc = await gameRef.get();
      
      if (!gameDoc._exists) {
        throw new Error('Game not found');
      }
      
      const gameData = gameDoc._data;
      
      // Check if all required players have joined
      const playersSnapshot = await gameRef.collection('players').get();
      if (playersSnapshot.docs.length < gameData.minPlayers) {
        throw new Error(`Cannot start game: Not all players have joined. Need ${gameData.minPlayers} players, have ${playersSnapshot.docs.length}`);
      }
      
      await gameRef.update({
        status: 'IN_PROGRESS',
        currentRound: 1, // TEMPORARY: Use round 1 instead of 0 to test Firebase compatibility
        roundState: 'ROUND_ACTIVE',
        startedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        [`roundData.1`]: {
          startedAt: firestore.FieldValue.serverTimestamp(),
          completedAt: null,
          readyPlayers: []
        }
      });
      
      // Track game start analytics
      await this.trackGameStart(gameId, gameData);
      
      return true;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }

  // Advance to next round
  async advanceRound(gameId) {
    console.log('advanceRound called for gameId:', gameId);
    try {
      // Real Firebase implementation
      const gameRef = this.db.collection('games').doc(gameId);
      const gameDoc = await gameRef.get();
      
      if (!gameDoc._exists) {
        throw new Error('Game not found');
      }
      
      const gameData = gameDoc._data;
      const currentRound = gameData.currentRound;
      let nextRound;
      
      // Special case: advance from introduction (round 0) to round 1
      if (currentRound === 0) {
        await gameRef.update({
          'roundData.0.completedAt': firestore.FieldValue.serverTimestamp(),
          currentRound: 1,
          'roundData.1': {
            startedAt: firestore.FieldValue.serverTimestamp(),
            completedAt: null,
            readyPlayers: []
          },
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      
      // Special case: after round 5, go to accusation round 5.5
      if (currentRound === 5) {
        nextRound = 5.5;
      } else if (currentRound === 5.5) {
        nextRound = 6;
      } else {
        nextRound = currentRound + 1;
      }
      
      // Mark current round as completed
      await gameRef.update({
        [`roundData.${currentRound}.completedAt`]: firestore.FieldValue.serverTimestamp(),
        currentRound: nextRound,
        [`roundData.${nextRound}`]: {
          startedAt: firestore.FieldValue.serverTimestamp(),
          completedAt: null,
          readyPlayers: []
        },
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
      // Reset all players' ready status for the new round
      const playersSnapshot = await gameRef.collection('players').get();
      const batch = this.db.batch();
      
      playersSnapshot.forEach(doc => {
        const playerRef = gameRef.collection('players').doc(doc.id);
        batch.update(playerRef, {
          [`roundStates.${nextRound}`]: {
            ready: false,
            readyAt: null
          }
        });
      });
      
      await batch.commit();
      // Track round completion analytics
      await this.trackRoundCompletion(gameId, currentRound, gameData);
      
      // After advancing to round 7 (game end), mark game as completed and track analytics
      if (nextRound === 7) {
        await gameRef.update({
          status: 'COMPLETED',
          completedAt: firestore.FieldValue.serverTimestamp(),
          gameState: 'COMPLETED',
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
        await this.trackGameCompletion(gameId, gameData);
      }
    } catch (error) {
      console.error('Error advancing round:', error);
      throw new Error('Failed to advance round');
    }
  }

  // Mark introduction as shown
  async markIntroductionShown(gameId) {
    try {
      // Real Firebase implementation
      const gameRef = this.db.collection('games').doc(gameId);
      await gameRef.update({
        introductionShown: true,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Introduction marked as shown for game:', gameId);
    } catch (error) {
      console.error('Error marking introduction as shown:', error);
      throw new Error('Failed to mark introduction as shown');
    }
  }

  // Submit accusation
  async submitAccusation(gameId, userId, accusedCharacter) {
    try {
      // Real Firebase implementation
      const gameRef = this.db.collection('games').doc(gameId);
      const playerRef = gameRef.collection('players').doc(userId);
      
      const playerDoc = await playerRef.get();
      if (!playerDoc.exists) {
        throw new Error('Player not found');
      }
      
      const playerData = playerDoc.data();
      const currentTimestamp = Date.now();
      
      // Add accusation to player's made accusations
      await playerRef.update({
        'accusations.made': firestore.FieldValue.arrayUnion({
          round: 5.5,
          accusedCharacter,
          timestamp: currentTimestamp
        })
      });
      
      // Add accusation to game accusations
      await gameRef.update({
        'accusations.accusations': firestore.FieldValue.arrayUnion({
          id: `accusation_${currentTimestamp}`,
          accuserId: userId,
          accuserCharacter: playerData.characterName,
          accusedCharacter,
          timestamp: currentTimestamp,
          isCorrect: false
        }),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      // Track accusation analytics
      const updatedGameDoc = await gameRef.get();
      await this.trackAccusationAnalytics(gameId, updatedGameDoc.data());
    } catch (error) {
      console.error('Error submitting accusation:', error);
      throw new Error('Failed to submit accusation');
    }
  }

  // Setup simulation
  setupSimulation(gameId) {
    this.currentGameId = gameId;
    return true;
  }

  // Add simulated players
  async addSimulatedPlayers(gameId) {
    const simulatedPlayers = [
      { userId: 'sim1', username: 'Alice' },
      { userId: 'sim2', username: 'Bob' },
      { userId: 'sim3', username: 'Carol' },
      { userId: 'sim4', username: 'David' },
      { userId: 'sim5', username: 'Eve' },
      { userId: 'sim6', username: 'Frank' },
      { userId: 'sim7', username: 'Grace' }
    ];
    
    for (const player of simulatedPlayers) {
      await this.addPlayerToGame(gameId, player.userId, player.username, false);
      
      // Get available characters and assign one
      const gameData = await this.getGameData(gameId);
      const assignedCharacters = gameData.players
        .filter(p => p.characterName)
        .map(p => p.characterName);
      
      const availableCharacters = gameScriptService.getAvailableCharacters(
        gameData.gameScriptId, 
        assignedCharacters
      );
      
      if (availableCharacters.length > 0) {
        const character = availableCharacters[0];
        await this.assignCharacter(gameId, player.userId, character.characterName);
      }
    }
  }

  // Simulate player action
  async simulatePlayerAction(gameId, action, playerIndex = 0) {
    const gameData = await this.getGameData(gameId);
    const players = gameData.players.filter(p => p.isSimulated);
    
    if (playerIndex >= players.length) return;
    
    const player = players[playerIndex];
    
    switch (action) {
      case 'ready':
        await this.updatePlayerReady(gameId, player.userId, true, gameData.currentRound);
        break;
      case 'accuse':
        // Simulate random accusation
        const availableCharacters = gameScriptService.getCharacters(gameData.gameScriptId);
        const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
        await this.submitAccusation(gameId, player.userId, randomCharacter.characterName);
        break;
    }
  }

  // Get simulation status
  getSimulationStatus() {
    return {
      currentGameId: this.currentGameId,
      players: this.simulatedPlayers,
      mode: this.simulationMode
    };
  }

  // Toggle simulation mode
  toggleSimulationMode() {
    this.simulationMode = !this.simulationMode;
    return this.simulationMode;
  }

  // Check if Firebase is working
  isFirebaseWorking() {
    return this.db !== null;
  }

  // Force Firebase initialization (for testing)
  async forceFirebaseInitialization() {
    console.log('🔧 Forcing Firebase initialization...');
    await this.initializeFirebaseWithRetry(5);
    console.log('🔧 Firebase initialization result:', { db: !!this.db });
    return this.isFirebaseWorking();
  }

  // Stub for exitGame to allow users to exit the game without error
  async exitGame(gameId, userId) {
    return Promise.resolve();
  }

  // ============================================================================
  // USER PROFILE MANAGEMENT
  // ============================================================================

  // Create or update user profile
  async createOrUpdateUserProfile(userId, username, additionalData = {}) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      const userProfile = {
        userId,
        username,
        displayName: additionalData.displayName || username,
        email: additionalData.email || null,
        avatar: additionalData.avatar || null,
        preferences: {
          textSize: additionalData.preferences?.textSize || 'medium',
          darkMode: additionalData.preferences?.darkMode || false,
          notifications: additionalData.preferences?.notifications || true,
          language: additionalData.preferences?.language || 'en'
        },
        statistics: {
          gamesPlayed: additionalData.statistics?.gamesPlayed || 0,
          gamesHosted: additionalData.statistics?.gamesHosted || 0,
          gamesWon: additionalData.statistics?.gamesWon || 0,
          favoriteCharacter: additionalData.statistics?.favoriteCharacter || null,
          totalPlayTime: additionalData.statistics?.totalPlayTime || 0
        },
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
        isActive: true
      };

      if (!userDoc.exists) {
        // Create new user profile
        userProfile.createdAt = firestore.FieldValue.serverTimestamp();
        await userRef.set(userProfile);
        console.log('Created new user profile for:', userId);
      } else {
        // Update existing user profile
        userProfile.updatedAt = firestore.FieldValue.serverTimestamp();
        await userRef.update(userProfile);
        console.log('Updated user profile for:', userId);
      }

      return userProfile;
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.log('User profile not found for:', userId);
        return null;
      }

      return userDoc.data();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user preferences
  async updateUserPreferences(userId, preferences) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      await userRef.update({
        'preferences': preferences,
        'lastActiveAt': firestore.FieldValue.serverTimestamp(),
        'updatedAt': firestore.FieldValue.serverTimestamp()
      });

      console.log('Updated user preferences for:', userId);
      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Update user statistics
  async updateUserStatistics(userId, statistics) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      await userRef.update({
        'statistics': statistics,
        'lastActiveAt': firestore.FieldValue.serverTimestamp(),
        'updatedAt': firestore.FieldValue.serverTimestamp()
      });

      console.log('Updated user statistics for:', userId);
      return true;
    } catch (error) {
      console.error('Error updating user statistics:', error);
      throw error;
    }
  }

  // Increment user statistics (for game completion, etc.)
  async incrementUserStatistics(userId, incrementData) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const updates = {
        'lastActiveAt': firestore.FieldValue.serverTimestamp(),
        'updatedAt': firestore.FieldValue.serverTimestamp()
      };
      Object.keys(incrementData).forEach(key => {
        updates[`statistics.${key}`] = firestore.FieldValue.increment(incrementData[key]);
      });
      if (userDoc.exists) {
        await userRef.update(updates);
      } else {
        // Create the user document with default statistics
        await userRef.set({
          statistics: incrementData,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastActiveAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      console.log('Incremented user statistics for:', userId);
      return true;
    } catch (error) {
      console.error('Error incrementing user statistics:', error);
      throw error;
    }
  }

  // Delete user profile (GDPR compliance)
  async deleteUserProfile(userId) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      await userRef.delete();
      console.log('Deleted user profile for:', userId);
      return true;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  }

  // Get all users (admin function)
  async getAllUsers(limit = 100) {
    try {
      const usersSnapshot = await this.db.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const users = [];
      usersSnapshot.forEach(doc => {
        users.push(doc.data());
      });

      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Search users by username
  async searchUsersByUsername(username, limit = 10) {
    try {
      const usersSnapshot = await this.db.collection('users')
        .where('username', '>=', username)
        .where('username', '<=', username + '\uf8ff')
        .limit(limit)
        .get();

      const users = [];
      usersSnapshot.forEach(doc => {
        users.push(doc.data());
      });

      return users;
    } catch (error) {
      console.error('Error searching users by username:', error);
      throw error;
    }
  }

  // ============================================================================
  // GAME ANALYTICS FUNCTIONS
  // ============================================================================

  // Track game creation analytics
  async trackGameCreation(gameId, hostUserId, scriptId, playerCount = 1) {
    try {
      const analyticsRef = this.db.collection('analytics').doc('game_metrics');
      await analyticsRef.set({
        totalGamesCreated: firestore.FieldValue.increment(1),
        gamesByScript: firestore.FieldValue.increment(1),
        averagePlayerCount: firestore.FieldValue.increment(playerCount),
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Track individual game creation event
      await this.db.collection('analytics').doc('events').collection('game_creations').add({
        gameId,
        hostUserId,
        scriptId,
        playerCount,
        timestamp: firestore.FieldValue.serverTimestamp(),
        platform: 'mobile'
      });

      console.log('Tracked game creation analytics for:', gameId);
      return true;
    } catch (error) {
      console.error('Error tracking game creation:', error);
      // Don't throw error - analytics failures shouldn't break game functionality
      return false;
    }
  }

  // Track game start analytics
  async trackGameStart(gameId, gameData) {
    try {
      const startTime = Date.now();
      const playerCount = gameData.players?.length || 0;
      const scriptId = gameData.gameScriptId;

      // Update game metrics
      const analyticsRef = this.db.collection('analytics').doc('game_metrics');
      await analyticsRef.set({
        totalGamesStarted: firestore.FieldValue.increment(1),
        averageTimeToStart: firestore.FieldValue.increment(startTime - gameData.createdAt),
        averagePlayerCountAtStart: firestore.FieldValue.increment(playerCount),
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Track game start event
      await this.db.collection('analytics').doc('events').collection('game_starts').add({
        gameId,
        scriptId,
        playerCount,
        timeToStart: startTime - gameData.createdAt,
        timestamp: firestore.FieldValue.serverTimestamp()
      });

      console.log('Tracked game start analytics for:', gameId);
      return true;
    } catch (error) {
      console.error('Error tracking game start:', error);
      return false;
    }
  }

  // Track round completion analytics
  async trackRoundCompletion(gameId, roundNumber, gameData) {
    try {
      const roundData = gameData.roundData?.[roundNumber];
      if (!roundData) return false;

      const roundDuration = roundData.completedAt - roundData.startedAt;
      const readyPlayers = gameData.players?.filter(p => p.roundStates?.[roundNumber]?.ready).length || 0;
      const totalPlayers = gameData.players?.length || 0;

      // Update round metrics
      const analyticsRef = this.db.collection('analytics').doc('round_metrics');
      await analyticsRef.set({
        [`round_${roundNumber}_completions`]: firestore.FieldValue.increment(1),
        [`round_${roundNumber}_average_duration`]: firestore.FieldValue.increment(roundDuration),
        [`round_${roundNumber}_average_ready_rate`]: firestore.FieldValue.increment(readyPlayers / totalPlayers),
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Track round completion event
      await this.db.collection('analytics').doc('events').collection('round_completions').add({
        gameId,
        roundNumber,
        duration: roundDuration,
        readyPlayers,
        totalPlayers,
        readyRate: readyPlayers / totalPlayers,
        timestamp: firestore.FieldValue.serverTimestamp()
      });

      console.log('Tracked round completion analytics for:', { gameId, roundNumber });
      return true;
    } catch (error) {
      console.error('Error tracking round completion:', error);
      return false;
    }
  }

  // Track accusation analytics
  async trackAccusationAnalytics(gameId, gameData) {
    try {
      const accusations = gameData.accusations?.accusations || [];
      const murdererCharacter = gameScriptService.getMurdererCharacter(gameData.gameScriptId)?.characterName;
      
      if (!murdererCharacter) return false;

      // Calculate accusation statistics
      const totalAccusations = accusations.length;
      const correctAccusations = accusations.filter(acc => acc.accusedCharacter === murdererCharacter).length;
      const accuracyRate = totalAccusations > 0 ? correctAccusations / totalAccusations : 0;

      // Track character accusation distribution
      const characterAccusations = {};
      accusations.forEach(acc => {
        characterAccusations[acc.accusedCharacter] = (characterAccusations[acc.accusedCharacter] || 0) + 1;
      });

      // Update accusation metrics
      const analyticsRef = this.db.collection('analytics').doc('accusation_metrics');
      await analyticsRef.set({
        totalAccusations: firestore.FieldValue.increment(totalAccusations),
        correctAccusations: firestore.FieldValue.increment(correctAccusations),
        averageAccuracyRate: firestore.FieldValue.increment(accuracyRate),
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Track accusation event
      await this.db.collection('analytics').doc('events').collection('accusations').add({
        gameId,
        scriptId: gameData.gameScriptId,
        totalAccusations,
        correctAccusations,
        accuracyRate,
        characterAccusations,
        murdererCharacter,
        timestamp: firestore.FieldValue.serverTimestamp()
      });

      console.log('Tracked accusation analytics for:', gameId);
      return true;
    } catch (error) {
      console.error('Error tracking accusation analytics:', error);
      return false;
    }
  }

  // Track game completion analytics
  async trackGameCompletion(gameId, gameData) {
    try {
      const gameDuration = Date.now() - gameData.createdAt;
      const playerCount = gameData.players?.length || 0;
      const scriptId = gameData.gameScriptId;

      // Calculate game success metrics
      const accusations = gameData.accusations?.accusations || [];
      const murdererCharacter = gameScriptService.getMurdererCharacter(scriptId)?.characterName;
      const correctAccusations = accusations.filter(acc => acc.accusedCharacter === murdererCharacter).length;
      const accuracyRate = accusations.length > 0 ? correctAccusations / accusations.length : 0;

      // Update game completion metrics
      const analyticsRef = this.db.collection('analytics').doc('game_metrics');
      await analyticsRef.set({
        totalGamesCompleted: firestore.FieldValue.increment(1),
        averageGameDuration: firestore.FieldValue.increment(gameDuration),
        averageAccuracyRate: firestore.FieldValue.increment(accuracyRate),
        completionRate: firestore.FieldValue.increment(1), // Will be calculated as completed/started
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Track game completion event
      await this.db.collection('analytics').doc('events').collection('game_completions').add({
        gameId,
        scriptId,
        playerCount,
        gameDuration,
        accuracyRate,
        correctAccusations,
        totalAccusations: accusations.length,
        timestamp: firestore.FieldValue.serverTimestamp()
      });

      // Update user statistics for all players
      for (const player of gameData.players || []) {
        await this.incrementUserStatistics(player.userId, {
          gamesPlayed: 1,
          totalPlayTime: gameDuration
        });
      }

      // Update host statistics
      if (gameData.hostUserId) {
        await this.incrementUserStatistics(gameData.hostUserId, {
          gamesHosted: 1
        });
      }

      console.log('Tracked game completion analytics for:', gameId);
      return true;
    } catch (error) {
      console.error('Error tracking game completion:', error);
      return false;
    }
  }

  // Track player behavior analytics
  async trackPlayerBehavior(gameId, userId, action, additionalData = {}) {
    try {
      // Track player action event
      await this.db.collection('analytics').doc('events').collection('player_actions').add({
        gameId,
        userId,
        action,
        ...additionalData,
        timestamp: firestore.FieldValue.serverTimestamp()
      });

      // Update player behavior metrics
      const analyticsRef = this.db.collection('analytics').doc('player_metrics');
      await analyticsRef.set({
        [`${action}_count`]: firestore.FieldValue.increment(1),
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('Tracked player behavior:', { gameId, userId, action });
      return true;
    } catch (error) {
      console.error('Error tracking player behavior:', error);
      return false;
    }
  }

  // Track script popularity analytics
  async trackScriptUsage(scriptId, action = 'selected') {
    try {
      const analyticsRef = this.db.collection('analytics').doc('script_metrics');
      await analyticsRef.set({
        [`${scriptId}_${action}_count`]: firestore.FieldValue.increment(1),
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('Tracked script usage:', { scriptId, action });
      return true;
    } catch (error) {
      console.error('Error tracking script usage:', error);
      return false;
    }
  }

  // Track technical performance analytics
  async trackTechnicalMetrics(metric, value, additionalData = {}) {
    try {
      await this.db.collection('analytics').doc('events').collection('technical_metrics').add({
        metric,
        value,
        ...additionalData,
        timestamp: firestore.FieldValue.serverTimestamp()
      });

      console.log('Tracked technical metric:', { metric, value });
      return true;
    } catch (error) {
      console.error('Error tracking technical metrics:', error);
      return false;
    }
  }

  // Get analytics summary for dashboard
  async getAnalyticsSummary() {
    try {
      // Get game metrics
      const gameMetricsDoc = await this.db.collection('analytics').doc('game_metrics').get();
      const gameMetrics = gameMetricsDoc.exists ? gameMetricsDoc.data() : {};

      // Get player metrics
      const playerMetricsDoc = await this.db.collection('analytics').doc('player_metrics').get();
      const playerMetrics = playerMetricsDoc.exists ? playerMetricsDoc.data() : {};

      // Get script metrics
      const scriptMetricsDoc = await this.db.collection('analytics').doc('script_metrics').get();
      const scriptMetrics = scriptMetricsDoc.exists ? scriptMetricsDoc.data() : {};

      // Get round metrics
      const roundMetricsDoc = await this.db.collection('analytics').doc('round_metrics').get();
      const roundMetrics = roundMetricsDoc.exists ? roundMetricsDoc.data() : {};

      // Get accusation metrics
      const accusationMetricsDoc = await this.db.collection('analytics').doc('accusation_metrics').get();
      const accusationMetrics = accusationMetricsDoc.exists ? accusationMetricsDoc.data() : {};

      return {
        gameMetrics,
        playerMetrics,
        scriptMetrics,
        roundMetrics,
        accusationMetrics
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      throw error;
    }
  }

  // Get detailed analytics for specific time period
  async getDetailedAnalytics(startDate, endDate, metrics = ['all']) {
    try {
      const events = [];
      
      if (metrics.includes('all') || metrics.includes('game_creations')) {
        const gameCreationsSnapshot = await this.db.collection('analytics').doc('events')
          .collection('game_creations')
          .where('timestamp', '>=', startDate)
          .where('timestamp', '<=', endDate)
          .get();
        
        gameCreationsSnapshot.forEach(doc => {
          events.push({ type: 'game_creation', ...doc.data() });
        });
      }

      if (metrics.includes('all') || metrics.includes('game_completions')) {
        const gameCompletionsSnapshot = await this.db.collection('analytics').doc('events')
          .collection('game_completions')
          .where('timestamp', '>=', startDate)
          .where('timestamp', '<=', endDate)
          .get();
        
        gameCompletionsSnapshot.forEach(doc => {
          events.push({ type: 'game_completion', ...doc.data() });
        });
      }

      if (metrics.includes('all') || metrics.includes('player_actions')) {
        const playerActionsSnapshot = await this.db.collection('analytics').doc('events')
          .collection('player_actions')
          .where('timestamp', '>=', startDate)
          .where('timestamp', '<=', endDate)
          .get();
        
        playerActionsSnapshot.forEach(doc => {
          events.push({ type: 'player_action', ...doc.data() });
        });
      }

      return events;
    } catch (error) {
      console.error('Error getting detailed analytics:', error);
      throw error;
    }
  }

  // Export analytics data (for backup or external analysis)
  async exportAnalyticsData(startDate, endDate) {
    try {
      const summary = await this.getAnalyticsSummary();
      const events = await this.getDetailedAnalytics(startDate, endDate, ['all']);

      return {
        summary,
        events,
        exportDate: new Date().toISOString(),
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      throw error;
    }
  }

  // ===== PHASE 1: MY GAMES FEATURE - USER PARTICIPATION TRACKING =====

  // Track user participation in a game
  async trackUserParticipation(gameId, userId, username, role = 'player') {
    try {
      const participationData = {
        gameId,
        userId,
        username,
        role, // 'host' or 'player'
        joinedAt: firestore.FieldValue.serverTimestamp(),
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
        status: 'active' // 'active', 'left', 'removed'
      };

      // Store in user_participation collection
      await this.db.collection('user_participation').add(participationData);

      // Also update user's game list
      const userGamesRef = this.db.collection('users').doc(userId).collection('games').doc(gameId);
      await userGamesRef.set({
        gameId,
        role,
        joinedAt: firestore.FieldValue.serverTimestamp(),
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
        status: 'active'
      }, { merge: true });

      console.log('Tracked user participation:', { gameId, userId, username, role });
      return true;
    } catch (error) {
      console.error('Error tracking user participation:', error);
      return false;
    }
  }

  // Get all games a user has participated in
  async getUserGames(userId, includeDeleted = false) {
    if (!this.db) {
      throw new Error('Firestore database is not initialized. Make sure Firebase is initialized before calling getUserGames.');
    }
    try {
      // Get user's game list
      const userGamesSnapshot = await this.db.collection('users').doc(userId)
        .collection('games')
        .get();

      const userGames = [];
      
      for (const doc of userGamesSnapshot.docs) {
        const userGameData = doc.data();
        
        // Get the actual game data including players
        const gameData = await this.getGameData(userGameData.gameId);
        
        if (gameData) {
          // Skip deleted games unless specifically requested
          if (!includeDeleted && gameData.deletedAt) {
            continue;
          }
          
          userGames.push({
            ...userGameData,
            gameData: {
              ...gameData,
              // Ensure we have the gameId
              gameId: userGameData.gameId
            }
          });
        }
      }

      // Sort by last active (most recent first)
      userGames.sort((a, b) => b.lastActiveAt?.toDate?.() - a.lastActiveAt?.toDate?.());

      return userGames;
    } catch (error) {
      console.error('Error getting user games:', error);
      throw error;
    }
  }

  // Update user's last active time in a game
  async updateUserLastActive(gameId, userId) {
    try {
      const now = firestore.FieldValue.serverTimestamp();

      // Update in user_participation collection
      const participationQuery = await this.db.collection('user_participation')
        .where('gameId', '==', gameId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!participationQuery.empty) {
        const participationDoc = participationQuery.docs[0];
        await participationDoc.ref.update({
          lastActiveAt: now
        });
      }

      // Update in user's game list
      await this.db.collection('users').doc(userId)
        .collection('games').doc(gameId)
        .update({
          lastActiveAt: now
        });

      return true;
    } catch (error) {
      console.error('Error updating user last active:', error);
      return false;
    }
  }

  // Mark user as having left a game
  async markUserLeftGame(gameId, userId) {
    try {
      const now = firestore.FieldValue.serverTimestamp();

      // Update in user_participation collection
      const participationQuery = await this.db.collection('user_participation')
        .where('gameId', '==', gameId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!participationQuery.empty) {
        const participationDoc = participationQuery.docs[0];
        await participationDoc.ref.update({
          status: 'left',
          leftAt: now
        });
      }

      // Update in user's game list
      await this.db.collection('users').doc(userId)
        .collection('games').doc(gameId)
        .update({
          status: 'left',
          leftAt: now
        });

      return true;
    } catch (error) {
      console.error('Error marking user left game:', error);
      return false;
    }
  }

  // Soft delete a game (mark as deleted but keep data)
  async softDeleteGame(gameId, userId) {
    try {
      const gameRef = this.db.collection('games').doc(gameId);
      const gameDoc = await gameRef.get();

      if (!gameDoc.exists) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data();
      
      // Only allow host to delete the game
      if (gameData.hostUserId !== userId) {
        throw new Error('Only the host can delete this game');
      }

      const now = firestore.FieldValue.serverTimestamp();

      // Mark game as deleted
      await gameRef.update({
        deletedAt: now,
        gameState: 'DELETED',
        updatedAt: now
      });

      // Mark all participants' user game records as deleted
      // Get all users who have a users/{userId}/games/{gameId} record
      const usersSnapshot = await this.db.collection('users').get();
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userGameRef = this.db.collection('users').doc(userId).collection('games').doc(gameId);
        const userGameDoc = await userGameRef.get();
        if (userGameDoc.exists) {
          await userGameRef.update({
            status: 'deleted',
            deletedAt: now
          });
        }
      }

      console.log('Soft deleted game for all participants:', gameId);
      return true;
    } catch (error) {
      console.error('Error soft deleting game:', error);
      throw error;
    }
  }

  // Get game statistics for a user
  async getUserGameStats(userId) {
    try {
      const userGames = await this.getUserGames(userId, true); // Include deleted for stats
      
      const stats = {
        totalGames: userGames.length,
        gamesHosted: userGames.filter(g => g.role === 'host').length,
        gamesPlayed: userGames.filter(g => g.role === 'player').length,
        activeGames: userGames.filter(g => g.status === 'active' && !g.gameData.deletedAt).length,
        completedGames: userGames.filter(g => g.gameData.gameState === 'COMPLETED').length,
        averageGameDuration: 0
      };

      // Calculate average game duration for completed games
      const completedGames = userGames.filter(g => g.gameData.gameState === 'COMPLETED' && g.gameData.completedAt);
      if (completedGames.length > 0) {
        const totalDuration = completedGames.reduce((sum, game) => {
          const duration = game.gameData.completedAt.toDate() - game.gameData.createdAt.toDate();
          return sum + duration;
        }, 0);
        stats.averageGameDuration = totalDuration / completedGames.length;
      }

      return stats;
    } catch (error) {
      console.error('Error getting user game stats:', error);
      throw error;
    }
  }

  // Invite a user to a game (stub)
  async inviteToGame(gameId, inviteeUserId, inviterUserId) {
    // TODO: Implement invitation logic (send notification, update invites collection, etc.)
    console.log(`Stub: inviteToGame called for gameId=${gameId}, inviteeUserId=${inviteeUserId}, inviterUserId=${inviterUserId}`);
    return true;
  }

  // Cleanup old/deleted games (stub)
  async cleanupOldGames(options = {}) {
    // TODO: Implement cleanup logic for old or deleted games
    console.log('Stub: cleanupOldGames called with options:', options);
    return true;
  }
}

export default new FirebaseService();