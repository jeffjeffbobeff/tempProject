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
  const [gameData, setGameData] = useState(null);
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
                  
                  // Get the game data from Firebase
                  if (firebaseService.db) {
                    const gameDoc = await firebaseService.db.collection('games').doc(newGameId).get();
                    if (gameDoc._exists) {
                      setGameData(gameDoc._data);
                    }
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
              onSelectCharacter={(character) => {
                console.log('Character selected:', character.characterName);
                // TODO: Navigate to lobby after character selection
                setView(VIEWS.LOBBY);
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
          
          {view === VIEWS.LOBBY && (
            <LobbyView
              gameId={gameId}
              gameData={gameData}
              userId={username || 'anonymous'}
              dynamicStyles={dynamicStyles}
              isHost={true} // TODO: Check if user is actually host
              onCopyGameCode={() => {
                console.log('Copying game code:', gameId);
                // TODO: Implement clipboard copy
              }}
              onAddVirtualPlayer={(character) => {
                console.log('Adding virtual player:', character.characterName);
                // TODO: Implement virtual player addition
              }}
              availableCharactersForVirtuals={[]} // TODO: Get available characters
              onStartGame={() => {
                console.log('Starting game...');
                // TODO: Implement game start logic
                setView(VIEWS.INTRODUCTION);
              }}
              canStartGame={true} // TODO: Check if game can start
              onChangeCharacter={() => {
                console.log('Changing character...');
                setView(VIEWS.CHARACTER_SELECTION);
              }}
              onBackToHome={() => {
                console.log('Going back to home...');
                goHome();
              }}
              scrollViewRef={lobbyScrollViewRef}
            />
          )}
          
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
