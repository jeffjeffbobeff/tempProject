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
        
        // Test if we can actually use it
        if (firestoreInstance && typeof firestoreInstance.collection === 'function') {
          this.db = firestoreInstance;
          console.log('🔧 Firebase service initialized successfully');
          
          // Skip the test read to prevent hanging
          console.log('🔧 Firebase service ready - skipping test read to prevent hanging');
          
          return true; // Return true on successful initialization
        } else {
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
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const gameId = this.generateGameId();
      
      try {
        // Check if this game ID already exists
        const gameDoc = await this.db.collection('games').doc(gameId).get();
        
        if (!gameDoc._exists) {
          // Game ID is unique, return it
          console.log(`🔧 Generated unique game ID: ${gameId}`);
          return gameId;
        }
        
        // If we're on the last attempt, throw an error
        if (attempt === maxAttempts) {
          throw new Error('Unable to generate unique game ID after maximum attempts');
        }
        
        // Continue to next attempt
        console.log(`🔧 Game ID ${gameId} exists, trying again...`);
      } catch (error) {
        console.error(`🔧 Error generating game ID on attempt ${attempt}:`, error);
        
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
      console.log('🔧 Creating game for host:', hostUsername, 'with script:', scriptId);
      
      // Ensure Firebase is ready
      if (!this.db) {
        throw new Error('Firebase is not ready yet. Please wait a moment and try again.');
      }
      
      // Test Firebase connectivity
      const connectionTest = await this.testFirebaseConnection();
      if (!connectionTest) {
        throw new Error('Firebase connection test failed. Please check your internet connection and try again.');
      }
      
      const gameId = await this.generateUniqueGameId();
      
      const gameScript = gameScriptService.getGameScript(scriptId);
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
        
        // Game state
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
      
      // Add game to host's games collection
      const hostGameRef = this.db.collection('users').doc(hostUserId).collection('games').doc(gameId);
      await hostGameRef.set({
        gameId,
        role: 'host',
        joinedAt: Date.now(),
        lastActiveAt: Date.now()
      });
      
      console.log('🔧 Game created successfully with ID:', gameId);
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
      
      // Character-specific data
      characterData: {
        isMurderer: false,
        secretInformation: null
      }
    };

    // Real Firebase implementation
    const gameRef = this.db.collection('games').doc(gameId);
    const playerRef = gameRef.collection('players').doc(userId);
    
    console.log('🔧 Adding player to game:', { gameId, userId, username, isHost });
    console.log('🔧 Player data to set:', playerData);
    
    await playerRef.set(playerData);
    
    console.log('🔧 Player document created successfully in players subcollection');
    
    return this.getGameData(gameId);
  }

  // Remove a player from a game (hard delete)
  async removePlayerFromGame(gameId, userId) {
    // Real Firebase implementation: hard delete the player document
    const gameRef = this.db.collection('games').doc(gameId);
    const playerRef = gameRef.collection('players').doc(userId);
    await playerRef.delete();
    return true;
  }

  // Join an existing game
  async joinGame(gameId, userId, username) {
    try {
      // Real Firebase implementation
      const gameRef = this.db.collection('games').doc(gameId);
      const gameDoc = await gameRef.get();

      if (!gameDoc._exists) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc._data;
      
      // Check if player is already in the game
      const playerDoc = await gameRef.collection('players').doc(userId).get();
      if (playerDoc._exists) {
        this.currentGameId = gameId;
        return gameData;
      }

      // Add new player to the game
      await this.addPlayerToGame(gameId, userId, username, false);
      
      // Add game to user's games collection
      const userGameRef = this.db.collection('users').doc(userId).collection('games').doc(gameId);
      await userGameRef.set({
        gameId,
        role: 'player',
        joinedAt: Date.now(),
        lastActiveAt: Date.now()
      });
      
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
      
      const updateData = {};
      
      if (round) {
        // Update specific round state
        updateData[`roundStates.${round}`] = {
          ready: readyStatus
        };
      } else {
        // Legacy support
        updateData.readyStatus = readyStatus;
      }
      
      await playerRef.update(updateData);
    } catch (error) {
      console.error('Error updating player ready status:', error);
      throw new Error('Failed to update ready status');
    }
  }

  // Assign character to player
  async assignCharacter(gameId, userId, characterName) {
    try {
      console.log('🔧 assignCharacter called:', { gameId, userId, characterName });
      
      const gameRef = this.db.collection('games').doc(gameId);
      const playerRef = gameRef.collection('players').doc(userId);
      
      // Check if player document exists before trying to update it
      const playerDoc = await playerRef.get();
      if (!playerDoc._exists) {
        console.error('🔧 Player document does not exist for userId:', userId);
        throw new Error(`Player document not found for user: ${userId}`);
      }
      
      console.log('🔧 Player document exists, proceeding with character assignment');
      
      // Get character data from game script
      const gameData = await this.getGameData(gameId);
      const character = gameScriptService.getCharacterByName(gameData.gameScriptId, characterName);
      
      const updateData = {
        characterName
      };
      
      if (character) {
        updateData.characterData = {
          isMurderer: character.isMurderer,
          secretInformation: character.scripts[1]?.secretInformation || null
        };
      }
      
      console.log('🔧 Updating player with character data:', updateData);
      await playerRef.update(updateData);
      
      console.log('🔧 Character assigned successfully');
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
        [`roundData.1`]: {
          readyPlayers: []
        }
      });
      
      // Initialize all players' roundStates[1] for the introduction round
      const initialPlayersSnapshot = await gameRef.collection('players').get();
      const initialBatch = this.db.batch();
      
      initialPlayersSnapshot.forEach(doc => {
        const playerRef = gameRef.collection('players').doc(doc.id);
        initialBatch.update(playerRef, {
          [`roundStates.1`]: {
            ready: false,
            readyAt: null
          }
        });
      });
      
      await initialBatch.commit();
      
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
      
      // Special case: advance from introduction (round 1) to round 2
      if (currentRound === 1) {
        await gameRef.update({
          currentRound: 2,
          'roundData.2': {
            readyPlayers: []
          }
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
        currentRound: nextRound,
        [`roundData.${nextRound}`]: {
          readyPlayers: []
        }
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
      
      // After advancing to round 7 (game end), mark game as completed
      if (nextRound === 7) {
        await gameRef.update({
          status: 'COMPLETED',
          gameState: 'COMPLETED'
        });
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
        introductionShown: true
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
        })
      });
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
  // ANALYTICS FUNCTIONS REMOVED - Not needed for core game functionality
  // ============================================================================
















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

      // Mark game as deleted
      await gameRef.update({
        gameState: 'DELETED'
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
            status: 'deleted'
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
      userGames.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));

      return userGames;
    } catch (error) {
      console.error('Error getting user games:', error);
      throw error;
    }
  }

  // Cleanup old/deleted games (stub)
  async cleanupOldGames(options = {}) {
    // TODO: Implement cleanup logic for old or deleted games
    console.log('Stub: cleanupOldGames called with options:', options);
    return true;
  }
}

export default new FirebaseService();