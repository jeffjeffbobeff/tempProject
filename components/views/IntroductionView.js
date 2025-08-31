import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';
import firebaseService from '../../firebase';
import gameScriptService from '../../gameScriptService';
import { parseFormattedText } from '../../utils/textFormatting';
import { getFontSize } from '../../utils/styles';

export default function IntroductionView({
  gameId,
  gameData,
  userId,
  dynamicStyles,
  textSize,
  onAdvanceToNextRound,
  onNavigateToNextView,
  scrollViewRef,
}) {
  const [showPlayerStatus, setShowPlayerStatus] = useState(false);
  const hasNavigated = useRef(false);

  // Auto-navigate when round changes (e.g., from introduction round 1 to round 2)
  useEffect(() => {
    if (gameData?.currentRound && gameData.currentRound > 1 && !hasNavigated.current) {
      console.log('🔧 Round advanced from introduction (1) to round', gameData.currentRound, '- auto-navigating to next view');
      hasNavigated.current = true; // Prevent multiple navigation attempts
      // Navigate to the next view since the round has already advanced
      if (onNavigateToNextView) {
        onNavigateToNextView();
      }
    }
  }, [gameData?.currentRound, onNavigateToNextView]);

  // Reset navigation guard when game changes
  useEffect(() => {
    hasNavigated.current = false;
  }, [gameId]);

  // Helper: get current player
  const getCurrentPlayer = () => {
    if (!gameData?.players || !userId) return null;
    if (!Array.isArray(gameData.players)) {
      console.warn('gameData.players is not an array in getCurrentPlayer:', gameData.players);
      return null;
    }
    return gameData.players.find(p => p.userId === userId);
  };

  // Helper: is host
  const isHost = () => {
    const player = getCurrentPlayer();
    return player && player.isHost;
  };

  // Helper: get background asset path
  const getBackgroundAssetPath = () => {
    if (!gameData?.gameScriptId) return null;
    const gameScript = gameScriptService.getGameScript(gameData.gameScriptId);
    return gameScript?.metadata?.backgroundAsset || null;
  };

  const currentPlayer = getCurrentPlayer();
  const introductionText = gameScriptService.getIntroduction(gameData?.gameScriptId);
  const isReady = currentPlayer?.roundStates?.[1]?.ready || false;
  const allPlayersReady = gameData?.players?.every(p => p.roundStates?.[1]?.ready || false);

  // Enhanced debug logging
  console.log('🔧 INTRODUCTION screen debug:', {
    currentPlayer: currentPlayer?.userId,
    currentPlayerRoundStates: currentPlayer?.roundStates,
    isReady,
    allPlayersReady,
    gameDataCurrentRound: gameData?.currentRound,
    playersCount: gameData?.players?.length,
    playersReadyCount: gameData?.players?.filter(p => p.roundStates?.[1]?.ready).length,
    isHost: isHost(),
    gameId,
    userId
  });
  
  // Log each player's ready status
  if (gameData?.players) {
    console.log('🔧 Player ready status breakdown:');
    gameData.players.forEach(player => {
      console.log(`  - ${player.username} (${player.userId}): ready=${player.roundStates?.[1]?.ready || false}, isHost=${player.isHost}`);
    });
  }

  const handleSetPlayerReady = async (readyStatus) => {
    console.log('🔧 handleSetPlayerReady called with:', { readyStatus, gameId, userId, currentRound: gameData?.currentRound });
    
    if (!gameId || !userId) {
      console.log('🔧 Early return: missing gameId or userId');
      return;
    }
    
    try {
      // Use the current round (1 for introduction)
      const roundToUpdate = gameData?.currentRound;
      console.log('🔧 Calling firebaseService.updatePlayerReady with:', { gameId, userId, readyStatus, roundToUpdate });
      
      await firebaseService.updatePlayerReady(gameId, userId, readyStatus, roundToUpdate);
      console.log('🔧 Successfully updated player ready status');
    } catch (error) {
      console.error('🔧 Error setting ready status:', error);
      alert('Failed to update ready status. Please try again.');
    }
  };

  const handleSetPlayerReadyManually = async (playerId, readyStatus) => {
    // console.log('🔧 setPlayerReadyManually called with:', { playerId, readyStatus, gameId, currentRound: gameData?.currentRound });
    
    if (!gameId) {
      // console.log('🔧 Early return: no gameId');
      return;
    }
    
    try {
      // Use the current round (1 for introduction)
      const roundToUpdate = gameData?.currentRound;
      // console.log('🔧 roundToUpdate:', roundToUpdate);
      
      if (roundToUpdate === undefined || roundToUpdate === null) {
        // console.log('🔧 Early return: no roundToUpdate');
        return;
      }
      
      // console.log('🔧 Calling firebaseService.updatePlayerReady with:', { gameId, playerId, readyStatus, roundToUpdate });
      await firebaseService.updatePlayerReady(gameId, playerId, readyStatus, roundToUpdate);
      // console.log(`🔧 Successfully set player ${playerId} ready status to: ${readyStatus} for round: ${roundToUpdate}`);
    } catch (error) {
      console.error('🔧 Error setting player ready status manually:', error);
    }
  };

  return (
    <BackgroundWrapper 
      view="game" 
      gameScriptId={gameData?.gameScriptId} 
      backgroundAssetPath={getBackgroundAssetPath()}
      overlayOpacity={0.7}
    >
      <SafeAreaView edges={['top','left','right']} style={{flex:1}}>
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
          <StatusBar barStyle="light-content" backgroundColor="#181A20" />
                  <ScrollView 
          ref={scrollViewRef}
          style={[styles.scrollView, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + getFontSize(20, textSize) : getFontSize(40, textSize), 
              backgroundColor: 'transparent' 
            }
          ]}
        >
            <Text style={styles.header}>The Murder</Text>
            
            <View style={styles.gameInfo}>
              <View style={styles.scriptContainer}>
                {parseFormattedText(introductionText || 'Introduction text not available.', dynamicStyles.scriptText)}
              </View>
            </View>

            <View style={styles.centeredButtonContainer}>
              <TouchableOpacity
                style={[styles.button, isReady && styles.buttonActive]}
                activeOpacity={0.8}
                onPress={() => handleSetPlayerReady(!isReady)}
              >
                <Text style={dynamicStyles.buttonText}>
                  {isReady ? 'Ready ✓' : 'I\'m Ready'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Host Controls - Only for Host */}
            {console.log('🔧 Host controls evaluation:', { 
              isHost: isHost(), 
              currentPlayerId: currentPlayer?.userId,
              currentPlayerUsername: currentPlayer?.username,
              currentPlayerCharacter: currentPlayer?.characterName,
              currentPlayerIsHost: currentPlayer?.isHost,
              userId 
            })}
            {isHost() && (
              <View style={styles.gameInfo}>
                <TouchableOpacity
                  style={styles.collapsibleHeader}
                  onPress={() => setShowPlayerStatus(!showPlayerStatus)}
                >
                  <Text style={dynamicStyles.collapsibleHeaderText}>
                    Players Ready: {gameData?.players?.filter(p => p.roundStates?.[1]?.ready).length || 0}/{gameData?.players?.length || 0}
                  </Text>
                  <Text style={dynamicStyles.collapsibleArrow}>
                    {showPlayerStatus ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                
                {showPlayerStatus && (
                  <View style={styles.playerStatusContainer}>
                    {gameData?.players.map((player) => {
                      const playerReady = player.roundStates?.[1]?.ready || false;
                      const isVirtualPlayer = player.userId.startsWith('player'); // Virtual players
                      
                      // console.log('🔧 Player debug:', {
                      //   playerId: player.userId,
                      //   playerName: player.username,
                      //   playerRoundStates: player.roundStates,
                      //   playerReady,
                      //   isVirtualPlayer
                      // });
                      
                      return (
                        <View key={player.userId} style={styles.playerRow}>
                          <View style={styles.playerInfo}>
                            <Text style={dynamicStyles.playerText}>
                              {player.userId === userId ? 'You' : player.username} ({player.characterName})
                              {isVirtualPlayer && ' [Virtual]'}
                            </Text>
                          </View>
                          
                          {/* Host Controls for each player */}
                          {isHost() && (
                            <View style={styles.playerControls}>
                              <TouchableOpacity
                                style={[styles.smallButton, playerReady ? styles.markReadyButton : styles.markNotReadyButton]}
                                onPress={() => handleSetPlayerReadyManually(player.userId, !playerReady)}
                              >
                                <Text style={dynamicStyles.smallButtonText}>
                                  {playerReady ? 'Ready' : 'Not Ready'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
                
                <View style={styles.centeredButtonContainer}>
                  <TouchableOpacity
                    style={[styles.button, allPlayersReady ? styles.buttonActive : styles.buttonDisabled]}
                    activeOpacity={0.8}
                    onPress={() => {
                      // console.log('Begin Round 1 button pressed');
                      onAdvanceToNextRound();
                    }}
                    disabled={!allPlayersReady}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {allPlayersReady ? 'Begin Round 1' : 'Waiting for all players...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
} 