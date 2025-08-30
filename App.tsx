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
  const [gameId, setGameId] = useState(null);
  const [selectedGameScript, setSelectedGameScript] = useState(null);
  const [gameSubscription, setGameSubscription] = useState(null);
  const [gameData, setGameData] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [gameCode, setGameCode] = useState('');
  const [joinInputError, setJoinInputError] = useState('');
  
  // Available game scripts state
  const [availableGameScripts, setAvailableGameScripts] = useState<any[]>([]);

  // Host control modal states
  const [showPlayerScriptModal, setShowPlayerScriptModal] = useState(false);
  const [selectedPlayerForScript, setSelectedPlayerForScript] = useState(null);

  // ScrollView refs for scroll to top functionality
  const gameScrollViewRef = useRef(null);
  const lobbyScrollViewRef = useRef(null);
  const characterSelectionScrollViewRef = useRef(null);
  const gameSelectionScrollViewRef = useRef(null);
  const introductionScrollViewRef = useRef(null);

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
      const scripts = gameScriptService.getAvailableScripts();
      console.log('🔧 Available game scripts:', scripts);
      console.log('🔧 Script IDs:', scripts.map(s => s.scriptId));
      setAvailableGameScripts(scripts);
      
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
                  
                  // Get the updated game data from Firebase (including the host player)
                  if (firebaseService.db) {
                    const gameDoc = await firebaseService.db.collection('games').doc(newGameId).get();
                    if (gameDoc.exists) {
                      const data = gameDoc.data();
                      if (data) {
                        console.log('🔧 Game data after creation:', data);
                        console.log('🔧 Players array:', data.players);
                        setGameData(data);
                      }
                    }
                  }
                  
                  // Set up real-time listener for game updates
                  if (firebaseService.db) {
                    const unsubscribe = firebaseService.db.collection('games').doc(newGameId)
                      .onSnapshot((doc) => {
                        if (doc.exists) {
                          const data = doc.data();
                          if (data) {
                            console.log('🔧 Real-time game update:', data);
                            setGameData(data);
                          }
                        }
                      }, (error) => {
                        console.error('Error listening to game updates:', error);
                      });
                    
                    // Store the unsubscribe function
                    setGameSubscription(() => unsubscribe);
                  }
                  
                  // Navigate to character selection (not introduction)
                  setView(VIEWS.CHARACTER_SELECTION);
                } catch (error) {
                  console.error('Error launching game:', error);
                  // Show error to user instead of pretending it worked
                  alert(`Failed to create game: ${error.message || 'Unknown error'}`);
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
              onSelectCharacter={async (character) => {
                console.log('Character selected:', character.characterName);
                try {
                  // Select the character in Firebase
                  await firebaseService.selectCharacter(gameId, username || 'anonymous', character.characterName);
                  console.log('🔧 Character selected in Firebase, navigating to lobby...');
                  // Navigate to lobby - the real-time listener will update gameData
                  setView(VIEWS.LOBBY);
                } catch (error) {
                  console.error('Error selecting character:', error);
                  alert('Failed to select character: ' + (error.message || 'Unknown error'));
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
              return gameData.players.find(p => p.userId === username);
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
              const assignedCharacters = gameData.players.filter(p => p.characterName).map(p => p.characterName);
              return gameScriptService.getCharacters(gameData.gameScriptId).filter(character => {
                return !assignedCharacters.includes(character.characterName);
              });
            };

            // Helper: can start game
            const minPlayers = gameScriptService.getGameScript(gameData?.gameScriptId)?.gameFlow?.minPlayers || 8;
            const maxPlayers = gameScriptService.getGameScript(gameData?.gameScriptId)?.gameFlow?.maxPlayers || 8;
            const allPlayersJoined = gameData?.players?.length >= minPlayers;
            const allCharactersAssigned = gameData?.players?.every(p => p.characterName);
            const canStartGame = isHost() && allPlayersJoined && allCharactersAssigned;

            // Copy game code
            const handleCopyGameCode = () => {
              if (!gameId) return;
              Clipboard.setString(gameId);
              alert('Game code copied to clipboard!');
            };

            // Add virtual player
            const handleAddVirtualPlayer = async (character) => {
              if (!gameId) return;
              try {
                const charName = character.characterName || character.Character;
                const userIdVirtual = `player_${charName.replace(/\W/g, '')}`;
                const username = charName;
                await firebaseService.joinGame(gameId, userIdVirtual, username);
                await firebaseService.selectCharacter(gameId, userIdVirtual, charName);
              } catch (error) {
                console.error('Error adding virtual player:', error);
                alert('Failed to add virtual player: ' + (error.message || 'Unknown error'));
              }
            };

            // Start game
            const handleStartGame = async () => {
              if (!gameId) return;
              try {
                await firebaseService.startGame(gameId);
                // Force navigation to INTRODUCTION view when game starts
                setView(VIEWS.INTRODUCTION);
              } catch (error) {
                console.error('Error in startGame:', error);
                alert('Cannot Start Game: ' + (error.message || 'Failed to start game.'));
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
              userId={userId}
              dynamicStyles={dynamicStyles}
              textSize={textSize}
              onAdvanceToNextRound={() => {
                // TODO: Implement next round logic
                console.log('Advancing to next round...');
              }}
              scrollViewRef={introductionScrollViewRef}
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
