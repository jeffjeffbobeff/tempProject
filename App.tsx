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
  const [view, setView] = useState(VIEWS.HOME);
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
      setAvailableGameScripts(scripts);
      
      // Load saved text size
      const savedTextSize = await AsyncStorage.getItem('textSize');
      if (savedTextSize) {
        setTextSize(savedTextSize);
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
    setView(VIEWS.ONBOARDING);
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
        <SafeAreaView style={styles.container}>
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.header}>Loading...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Background Wrapper */}
        <BackgroundWrapper>
          {/* Main Content */}
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
              onLaunchGame={(script: any) => {
                setSelectedGameScript(script);
                setView(VIEWS.INTRODUCTION);
              }}
              gameLoading={gameLoading}
              dynamicStyles={dynamicStyles}
              containerOnLayout={() => {}}
              parentOnLayout={() => {}}
              scrollViewRef={gameSelectionScrollViewRef}
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
