/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import BackgroundWrapper from './components/BackgroundWrapper';
import styles from './styles/AppStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeView from './components/views/HomeView';
import JoinGameView from './components/views/JoinGameView';
import GameSelectionView from './components/views/GameSelectionView';
import CharacterSelectionView from './components/views/CharacterSelectionView';
import IntroductionView from './components/views/IntroductionView';
import GameView from './components/views/GameView';
import gameScriptService from './gameScriptService';
import HamburgerMenu from './components/HamburgerMenu';
import firebaseService from './firebase';
import { useDynamicStyles } from './utils/styles';
import { parseFormattedText } from './utils/textFormatting';
import LobbyView from './components/views/LobbyView';
import Clipboard from '@react-native-clipboard/clipboard';
import MyGamesView from './components/views/MyGamesView';
import OnboardingView from './components/views/OnboardingView';

// ============================================================================
// DEVELOPMENT CONSOLE FILTERING
// ============================================================================

// Filter out Firebase deprecation warnings during development
if (__DEV__) {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    // Filter out Firebase deprecation warnings
    if (args[0] && typeof args[0] === 'string' && args[0].includes('deprecated')) {
      return; // Don't show deprecation warnings
    }
    // Show all other warnings
    originalConsoleWarn(...args);
  };
}

// ============================================================================
// TYPES
// ============================================================================

type GameScript = any;

// ============================================================================
// CONSTANTS
// ============================================================================

const VIEWS = {
  ONBOARDING: 'ONBOARDING',
  HOME: 'HOME',
  GAME_SELECTION: 'GAME_SELECTION',
  LOBBY: 'LOBBY',
  INTRODUCTION: 'INTRODUCTION',
  GAME: 'GAME',
  JOIN_GAME: 'JOIN_GAME',
  CHARACTER_SELECTION: 'CHARACTER_SELECTION',
  MY_GAMES: 'MY_GAMES',
};

export default function App() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Navigation state
  const [view, setView] = useState(VIEWS.ONBOARDING);
  const [loading, setLoading] = useState(true);
  
  // User state
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  
  // Onboarding state
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  
  // Game loading state
  const [gameLoading, setGameLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [selectedGameScript, setSelectedGameScript] = useState<string | null>(null);
  const [gameSubscription, setGameSubscription] = useState<(() => void) | null>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [gameCode, setGameCode] = useState('');
  const [joinInputError, setJoinInputError] = useState('');
  
  // Available game scripts state
  const [availableGameScripts, setAvailableGameScripts] = useState<GameScript[]>([]);

  // Host control modal states
  const [showPlayerScriptModal, setShowPlayerScriptModal] = useState(false);
  const [selectedPlayerForScript, setSelectedPlayerForScript] = useState<any>(null);

  // ScrollView refs for scroll to top functionality
  const gameScrollViewRef = useRef<ScrollView>(null);
  const lobbyScrollViewRef = useRef<ScrollView>(null);
  const characterSelectionScrollViewRef = useRef<ScrollView>(null);
  const gameSelectionScrollViewRef = useRef<ScrollView>(null);
  const introductionScrollViewRef = useRef<ScrollView>(null);

  // Hamburger menu state
  const [showMenu, setShowMenu] = useState(false);
  const [showTextSizeModal, setShowTextSizeModal] = useState(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [showHowToHostModal, setShowHowToHostModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [textSize, setTextSize] = useState('medium');

  // ============================================================================
  // HOOKS - Must be called in same order every render
  // ============================================================================
  
  // Get dynamic styles - this must be called every render
  const dynamicStyles = useDynamicStyles(textSize);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Load available game scripts
      const scripts: any[] = gameScriptService.getAvailableScripts();
      console.log('🔧 Script IDs:', scripts.map((s: any) => s.scriptId));
      setAvailableGameScripts(scripts as any[]);
      
      // Load saved text size
      const savedTextSize = await AsyncStorage.getItem('textSize');
      if (savedTextSize) {
        setTextSize(savedTextSize);
      }
      
      // Load saved username
      const savedUsername = await AsyncStorage.getItem('username');
      if (savedUsername) {
        setUsername(savedUsername);
        setView(VIEWS.HOME);
      } else {
        setView(VIEWS.ONBOARDING);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error initializing app:', error);
      setLoading(false);
    }
  };

  // ============================================================================
  // NAVIGATION FUNCTIONS
  // ============================================================================
  
  const createGame = () => {
    setView(VIEWS.GAME_SELECTION);
  };

  const joinGame = () => {
    setView(VIEWS.JOIN_GAME);
  };

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      setJoinInputError('Please enter a game code');
      return;
    }

    if (gameCode.trim().length !== 6) {
      setJoinInputError('Game code must be 6 characters');
      return;
    }

    try {
      setGameLoading(true);
      setJoinInputError('');

      console.log('🔧 Attempting to join game with code:', gameCode);

      // Check if the game exists
      const gameData = await firebaseService.getGameData(gameCode);
      if (!gameData) {
        setJoinInputError('Game not found. Please check the code.');
        return;
      }

      // Check if game is in LOBBY state
      if (gameData.status !== 'LOBBY') {
        setJoinInputError('This game has already started. You cannot join now.');
        return;
      }

      // Check if game is full
      if (gameData.players && gameData.players.length >= gameData.maxPlayers) {
        setJoinInputError('This game is full. Cannot join.');
        return;
      }

      // Check if player is already in the game
      const existingPlayer = gameData.players?.find((p: any) => p.userId === username);
      if (existingPlayer) {
        setJoinInputError('You are already in this game.');
        return;
      }

      // Join the game
      const joinResult = await firebaseService.joinGame(gameCode, username || 'anonymous', username || 'Anonymous Player');
      console.log('🔧 Successfully joined game:', joinResult);

      // Set the game data
      setGameId(gameCode);
      setSelectedGameScript(gameData.gameScriptId);

      // Set up real-time subscription
      const subscription = firebaseService.subscribeToGame(gameCode, (data: any) => {
        console.log('🔧 Real-time game update after join:', {
          gameId: data.gameId,
          currentRound: data.currentRound,
          roundState: data.roundState,
          status: data.status,
          playersCount: data.players?.length || 0,
          playersReady: data.players?.filter((p: any) => p.roundStates?.[1]?.ready).length || 0,
          allPlayersReady: data.players?.every((p: any) => p.roundStates?.[1]?.ready) || false
        });
        setGameData(data);
      });
      setGameSubscription(() => subscription);

      // Navigate to character selection
      setView(VIEWS.CHARACTER_SELECTION);
    } catch (error: any) {
      console.error('Error joining game:', error);
      setJoinInputError(`Failed to join game: ${error.message || 'Unknown error'}`);
    } finally {
      setGameLoading(false);
    }
  };

  const myGames = () => {
    setView(VIEWS.MY_GAMES);
  };

  const onBackToOnboarding = () => {
    // Pre-populate input with existing username for editing
    setInput(username);
    setInputError('');
    setView(VIEWS.ONBOARDING);
  };

  const handleOnboarding = async () => {
    if (!input.trim()) {
      setInputError('Please enter a username');
      return;
    }
    
    if (input.trim().length < 2) {
      setInputError('Username must be at least 2 characters');
      return;
    }
    
    try {
      // Save username to AsyncStorage
      await AsyncStorage.setItem('username', input.trim());
      
      // Username is valid, save it and go to home
      setUsername(input.trim());
      setInput('');
      setInputError('');
      setView(VIEWS.HOME);
    } catch (error: any) {
      console.error('Error saving username:', error);
      setInputError('Error saving username. Please try again.');
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const saveTextSize = async (size: string) => {
    try {
      await AsyncStorage.setItem('textSize', size);
      setTextSize(size);
      setShowTextSizeModal(false);
    } catch (error: any) {
      console.error('Error saving text size:', error);
    }
  };

  const goHome = () => {
    setView(VIEWS.HOME);
    setGameId(null);
    setSelectedGameScript(null);
    setGameData(null);
    setSelectedCharacter(null);
    setGameCode('');
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.header}>Loading...</Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Background Wrapper */}
        <BackgroundWrapper>
          {/* Main Content */}
          {view === VIEWS.ONBOARDING && (
            <OnboardingView
              input={input}
              setInput={setInput}
              inputError={inputError}
              setInputError={setInputError}
              handleOnboarding={handleOnboarding}
              dynamicStyles={dynamicStyles}
              isUsernameChange={username ? true : false}
            />
          )}
          
          {view === VIEWS.HOME && (
            <HomeView
              username={username}
              createGame={createGame}
              joinGame={joinGame}
              myGames={myGames}
              gameLoading={gameLoading}
              dynamicStyles={dynamicStyles}
              onBackToOnboarding={onBackToOnboarding}
            />
          )}
          
          {view === VIEWS.GAME_SELECTION && (
            <GameSelectionView
              availableGameScripts={availableGameScripts}
              onBack={() => setView(VIEWS.HOME)}
              onLaunchGame={async (scriptId: any) => {
                try {
                  setGameLoading(true);
                  
                  console.log('🔧 onLaunchGame called with scriptId:', scriptId);
                  console.log('🔧 scriptId type:', typeof scriptId);
                  
                  // Ensure Firebase is ready before creating game
                  if (!firebaseService.isReady()) {
                    await firebaseService.waitForReady();
                  }
                  
                  // Create the game in Firebase
                  const newGameId = await firebaseService.createGame(
                    username || 'anonymous', // Use username or fallback
                    username || 'Anonymous Player',
                    scriptId
                  );
                  
                  // Set the game data
                  setGameId(newGameId);
                  setSelectedGameScript(scriptId);
                  
                  // Get the complete game data including players from Firebase
                  const completeGameData = await firebaseService.getGameData(newGameId);
                  if (completeGameData) {
                    console.log('🔧 Complete game data after creation:', completeGameData);
                    console.log('🔧 Players array:', completeGameData.players);
                    setGameData(completeGameData);
                  }
                  
                  // Set up proper real-time subscription using the service method
                  const subscription = firebaseService.subscribeToGame(newGameId, (data: any) => {
                    console.log('🔧 Real-time game update:', {
                      gameId: data.gameId,
                      currentRound: data.currentRound,
                      roundState: data.roundState,
                      status: data.status,
                      playersCount: data.players?.length || 0,
                      playersReady: data.players?.filter((p: any) => p.roundStates?.[1]?.ready).length || 0,
                      allPlayersReady: data.players?.every((p: any) => p.roundStates?.[1]?.ready) || false
                    });
                    setGameData(data);
                  });
                  setGameSubscription(() => subscription);
                  
                  // Navigate to character selection (not introduction)
                  setView(VIEWS.CHARACTER_SELECTION);
                } catch (error: any) {
                  console.error('Error launching game:', error);
                  // Show error to user instead of pretending it worked
                  Alert.alert('Error', `Failed to create game: ${error.message || 'Unknown error'}`);
                } finally {
                  setGameLoading(false);
                }
              }}
              gameLoading={gameLoading}
              dynamicStyles={dynamicStyles}
              containerOnLayout={() => {}}
              parentOnLayout={() => {}}
              scrollViewRef={gameSelectionScrollViewRef}
            />
          )}
          
          {view === VIEWS.CHARACTER_SELECTION && (
            <CharacterSelectionView
              gameId={gameId}
              gameData={gameData}
              userId={username || 'anonymous'}
              dynamicStyles={dynamicStyles}
              onSelectCharacter={async (character: any) => {
                console.log('Character selected:', character.characterName);
                try {
                  // Check if player is already in the game (for joining existing games)
                  const currentGameData = await firebaseService.getGameData(gameId);
                  const existingPlayer = currentGameData?.players?.find((p: any) => p.userId === username);
                  
                  if (!existingPlayer) {
                    // Player not in game yet, add them first (for new games)
                    console.log('🔧 Player not in game yet, adding them first...');
                    const joinResult = await firebaseService.joinGame(gameId, username || 'anonymous', username || 'Anonymous Player');
                    console.log('🔧 Player joined game successfully, result:', joinResult);
                  } else {
                    console.log('🔧 Player already in game, proceeding to character selection...');
                  }
                  
                  // Now select the character
                  console.log('🔧 Selecting character:', character.characterName);
                  await firebaseService.selectCharacter(gameId, username || 'anonymous', character.characterName);
                  console.log('🔧 Character selected in Firebase, navigating to lobby...');
                  
                  // Navigate to lobby - the real-time listener will update gameData
                  setView(VIEWS.LOBBY);
                } catch (error: any) {
                  console.error('Error selecting character:', error);
                  Alert.alert('Error', 'Failed to select character: ' + (error.message || 'Unknown error'));
                }
              }}
              onKeepCharacter={() => {
                console.log('Keeping current character');
                // TODO: Navigate to lobby
                setView(VIEWS.LOBBY);
              }}
              onRemoveVirtualPlayer={() => {
                console.log('Removing virtual player');
                // TODO: Handle virtual player removal
              }}
              scrollViewRef={characterSelectionScrollViewRef}
            />
          )}
          
          {view === VIEWS.LOBBY && (() => {
            // Helper: get current player
            const getCurrentPlayer = () => {
              if (!gameData?.players || !username) return null;
              if (!Array.isArray(gameData.players)) return null;
              return gameData.players.find((p: any) => p.userId === username);
            };

            // Helper: is host
            const isHost = () => {
              const player = getCurrentPlayer();
              return player && player.isHost;
            };

            // Helper: get available characters for virtuals
            const getAvailableCharactersForVirtuals = () => {
              if (!gameData || !gameData.players) return [];
              if (!Array.isArray(gameData.players)) return [];
              const assignedCharacters = gameData.players.filter((p: any) => p.characterName).map((p: any) => p.characterName);
              return gameScriptService.getCharacters(gameData.gameScriptId).filter((character: any) => {
                return !assignedCharacters.includes(character.characterName);
              });
            };

            // Helper: can start game
            const minPlayers = gameScriptService.getGameScript(gameData?.gameScriptId)?.gameFlow?.minPlayers || 8;
            const maxPlayers = gameScriptService.getGameScript(gameData?.gameScriptId)?.gameFlow?.maxPlayers || 8;
            const allPlayersJoined = gameData?.players?.length >= minPlayers;
            const allCharactersAssigned = gameData?.players?.every((p: any) => p.characterName);
            const canStartGame = isHost() && allPlayersJoined && allCharactersAssigned;

            // Copy game code
            const handleCopyGameCode = () => {
              if (!gameId) return;
              Clipboard.setString(gameId);
                                Alert.alert('Success', 'Game code copied to clipboard!');
            };

            // Add virtual player
            const handleAddVirtualPlayer = async (character: any) => {
              if (!gameId) return;
              try {
                const charName = character.characterName || character.Character;
                const userIdVirtual = `player_${charName.replace(/\W/g, '')}`;
                const username = charName;
                console.log('🔧 Adding virtual player:', { charName, userIdVirtual, username });
                
                console.log('🔧 Step 1: Joining virtual player to game...');
                const joinResult = await firebaseService.joinGame(gameId, userIdVirtual, username);
                console.log('🔧 Virtual player joined game successfully, result:', joinResult);
                
                // Verify the player was actually added
                const gameDataAfterJoin = await firebaseService.getGameData(gameId);
                console.log('🔧 Virtual player added successfully. Game now has', gameDataAfterJoin?.players?.length || 0, 'players');
                
                // Check if the virtual player document actually exists
                if (firebaseService.db) {
                  try {
                    const playerDoc = await firebaseService.db.collection('games').doc(gameId).collection('players').doc(userIdVirtual).get();
                    if (!playerDoc.exists()) {
                      console.log('🔧 Virtual player document missing, creating manually...');
                      // Try to manually create the player document to see what error we get
                      try {
                        const playerData = {
                          userId: userIdVirtual,
                          username: username,
                          characterName: null,
                          isHost: false,
                          isSimulated: true,
                          roundStates: {},
                          accusations: { made: [], received: [] },
                          joinedAt: Date.now(),
                          leftAt: null,
                          reconnectedAt: null,
                          lastActiveAt: Date.now(),
                          characterData: { isMurderer: false, secretInformation: null }
                        };
                        await firebaseService.db.collection('games').doc(gameId).collection('players').doc(userIdVirtual).set(playerData);
                        console.log('🔧 Virtual player document created successfully');
                      } catch (manualError) {
                        console.error('🔧 Error creating virtual player document:', manualError);
                      }
                    }
                  } catch (error: any) {
                    console.error('🔧 Error checking player document:', error);
                  }
                }
                
                await firebaseService.selectCharacter(gameId, userIdVirtual, charName);
                console.log('🔧 Virtual player', charName, 'added and character assigned successfully');
              } catch (error: any) {
                console.error('Error adding virtual player:', error);
                                  Alert.alert('Error', 'Failed to add virtual player: ' + (error.message || 'Unknown error'));
              }
            };

            // Start game
            const handleStartGame = async () => {
              if (!gameId) return;
              try {
                await firebaseService.startGame(gameId);
                // Force navigation to INTRODUCTION view when game starts
                setView(VIEWS.INTRODUCTION);
              } catch (error: any) {
                console.error('Error in startGame:', error);
                                  Alert.alert('Error', 'Cannot Start Game: ' + (error.message || 'Failed to start game.'));
              }
            };

            // Change character
            const handleChangeCharacter = () => {
              setView(VIEWS.CHARACTER_SELECTION);
            };

            // Back to home
            const handleBackToHome = () => {
              goHome();
            };

            return (
              <LobbyView
                gameId={gameId}
                gameData={gameData}
                userId={username || 'anonymous'}
                dynamicStyles={dynamicStyles}
                isHost={isHost()}
                onCopyGameCode={handleCopyGameCode}
                onAddVirtualPlayer={handleAddVirtualPlayer}
                availableCharactersForVirtuals={getAvailableCharactersForVirtuals()}
                onStartGame={handleStartGame}
                canStartGame={canStartGame}
                onChangeCharacter={handleChangeCharacter}
                onBackToHome={handleBackToHome}
                scrollViewRef={lobbyScrollViewRef}
              />
            );
          })()}
          
          {view === VIEWS.INTRODUCTION && (
            <IntroductionView
              gameId={gameId}
              gameData={gameData}
              userId={username || 'anonymous'}
              dynamicStyles={dynamicStyles}
              textSize={textSize}
              onAdvanceToNextRound={async () => {
                try {
                  console.log('🔧 Completing Introduction (Round 1) and advancing to first gameplay round...');
                  await firebaseService.advanceRound(gameId);
                  console.log('🔧 Successfully advanced to first gameplay round');
                } catch (error: any) {
                  console.error('🔧 Error advancing round:', error);
                  Alert.alert('Error', 'Failed to advance round: ' + (error.message || 'Unknown error'));
                }
              }}
              onNavigateToNextView={() => {
                console.log('🔧 Navigating from Introduction to first gameplay round');
                setView(VIEWS.GAME);
              }}
              scrollViewRef={introductionScrollViewRef}
            />
          )}
          
          {view === VIEWS.GAME && (
            <GameView
              gameId={gameId}
              gameData={gameData}
              userId={username || 'anonymous'}
              dynamicStyles={dynamicStyles}
              textSize={textSize}
              onAdvanceToNextRound={async () => {
                try {
                  console.log('🔧 Advancing to next round from Game view...');
                  await firebaseService.advanceRound(gameId);
                  console.log('🔧 Successfully advanced to next round');
                } catch (error: any) {
                  console.error('🔧 Error advancing round:', error);
                  Alert.alert('Error', 'Failed to advance round: ' + (error.message || 'Unknown error'));
                }
              }}
              onExitGame={() => {
                console.log('🔧 Exiting game, returning to home');
                setView(VIEWS.HOME);
              }}
              onShowPlayerScript={(player: any) => {
                console.log('🔧 Showing script for player:', player.username);
                // TODO: Implement player script modal
              }}
              scrollViewRef={gameScrollViewRef}
            />
          )}
          
          {view === VIEWS.JOIN_GAME && (
            <JoinGameView
              gameCode={gameCode}
              setGameCode={setGameCode}
              onJoin={handleJoinGame}
              onBack={() => setView(VIEWS.HOME)}
              gameLoading={gameLoading}
              inputError={joinInputError}
              dynamicStyles={dynamicStyles}
            />
          )}
          
          {/* Add other views as we migrate them */}
          
          {/* Hamburger Menu - Global */}
          <HamburgerMenu
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            showTextSizeModal={showTextSizeModal}
            setShowTextSizeModal={setShowTextSizeModal}
            showHowToPlayModal={showHowToPlayModal}
            setShowHowToPlayModal={setShowHowToPlayModal}
            showHowToHostModal={showHowToHostModal}
            setShowHowToHostModal={setShowHowToHostModal}
            showFAQModal={showFAQModal}
            setShowFAQModal={setShowFAQModal}
            textSize={textSize}
            saveTextSize={saveTextSize}
            goHome={goHome}
            firebaseService={firebaseService}
            styles={styles}
            dynamicStyles={dynamicStyles}
          />
        </BackgroundWrapper>
      </View>
    </SafeAreaProvider>
  );
}
