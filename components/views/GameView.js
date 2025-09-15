import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';
import firebaseService from '../../firebase';
import gameScriptService from '../../gameScriptService';
import { parseFormattedText } from '../../utils/textFormatting';
import { getFontSize } from '../../utils/styles';

export default function GameView({
  gameId,
  gameData,
  userId,
  dynamicStyles,
  textSize,
  onAdvanceToNextRound,
  onExitGame,
  onShowPlayerScript,
  scrollViewRef,
}) {
  const [showPlayerStatus, setShowPlayerStatus] = useState(false);
  const [selectedAccusations, setSelectedAccusations] = useState([]);
  const [accusationSubmitted, setAccusationSubmitted] = useState(false);
  const [showPlayerAccusationStatus, setShowPlayerAccusationStatus] = useState(false);

  useEffect(() => {
    if (scrollViewRef && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [gameData?.currentRound]);

  // Helper: get current player
  const getCurrentPlayer = () => {
    if (!gameData?.players || !userId) return null;
    if (!Array.isArray(gameData.players)) {
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

  // Helper: get character script
  const getCharacterScript = (characterName, round) => {
    if (!characterName || !round || !gameData) return null;
    return gameScriptService.getCharacterScript(gameData.gameScriptId, characterName, round);
  };

  // Helper: get accusable characters
  const getAccusableCharacters = () => {
    if (!gameData) return [];
    const gameCharacters = gameScriptService.getCharacters(gameData.gameScriptId);
    
    // Add humorous accusation option from game script if it exists
    const humorousOption = gameScriptService.getHumorousAccusationOption(gameData.gameScriptId);
    if (humorousOption) {
      return [...gameCharacters, humorousOption];
    }
    
    return gameCharacters;
  };

  // Helper: get murderer characters
  const getMurdererCharacters = () => {
    if (!gameData) return [];
    return gameScriptService.getMurdererCharacters(gameData.gameScriptId);
  };

  // Helper: get accusation vote totals
  const getAccusationVoteTotals = () => {
    if (!gameData?.players) return {};
    
    if (!Array.isArray(gameData.players)) {
      return {};
    }
    
    const voteTotals = {};
    
    // Initialize vote counts for all characters
    const allCharacters = gameScriptService.getCharacters(gameData.gameScriptId);
    allCharacters.forEach(char => {
      voteTotals[char.characterName] = [];
    });
    
    // Add humorous accusation option to vote totals if it exists
    const humorousOption = gameScriptService.getHumorousAccusationOption(gameData.gameScriptId);
    if (humorousOption) {
      voteTotals[humorousOption.characterName] = [];
    }
    
    // Count accusations from each player
    gameData.players.forEach(player => {
      const accusations = player.accusations?.made || [];
      accusations.forEach(accusation => {
        if (accusation.round === 5.5 && accusation.accusedCharacter) {
          if (!voteTotals[accusation.accusedCharacter]) {
            voteTotals[accusation.accusedCharacter] = [];
          }
          voteTotals[accusation.accusedCharacter].push(player.username);
        }
      });
    });
    
    return voteTotals;
  };

  // Helper: all players ready for round
  const allPlayersReadyForRound = () => {
    if (!gameData || !gameData.players) return false;
    
    if (!Array.isArray(gameData.players)) {
      return false;
    }
    
    return gameData.players.every(p => 
      p.roundStates?.[gameData.currentRound]?.ready || false
    );
  };

  // Helper: check if a specific player has made an accusation in round 5.5
  const hasPlayerAccused = (player) => {
    if (!player || !player.accusations?.made) return false;
    return player.accusations.made.some(acc => acc.round === 5.5);
  };

  // Helper: get accusation status for all players
  const getAccusationStatus = () => {
    if (!gameData?.players) return { accused: 0, total: 0, players: [] };
    
    const players = gameData.players.map(player => ({
      ...player,
      hasAccused: hasPlayerAccused(player)
    }));
    
    const accusedCount = players.filter(p => p.hasAccused).length;
    
    return {
      accused: accusedCount,
      total: players.length,
      players: players
    };
  };

  // Helper: get character object
  const getCharacterObject = (characterName) => {
    if (!characterName || !gameData?.gameScriptId) return null;
    return gameScriptService.getCharacterByName(gameData.gameScriptId, characterName);
  };

  const currentPlayer = getCurrentPlayer();
  const currentRound = gameData?.currentRound || 1;
  let gameViewType = 'game';
  if (currentRound === 5.5) gameViewType = 'accusations';
  else if (currentRound === 6) gameViewType = 'final-statements';
  else if (currentRound === 7) gameViewType = 'game-end';

  const characterScript = getCharacterScript(currentPlayer?.characterName, currentRound);
  const isReady = currentPlayer?.roundStates?.[currentRound]?.ready || false;
  const roundInstructions = gameScriptService.getRoundInstructions(gameData?.gameScriptId, currentRound);
  
  // Transform backend round instructions to player-friendly labels
  const getPlayerFriendlyRoundInstructions = () => {
    switch (currentRound) {
      case 2: return 'Introduce yourself to the group and share your character\'s background';
      case 3: return 'Tell your story and react to others\' stories';
      case 4: return 'Make your observation about the events';
      case 5: return 'Make your observation about the events';
      case 5.5: return 'Deliberate with your party and make accusations';
      case 6: return 'Read your final statements in order';
      default: return roundInstructions;
    }
  };

  const handleSetPlayerReady = async (readyStatus) => {
    if (!gameId || !userId) return;
    
    try {
      const roundToUpdate = gameData?.currentRound;
      await firebaseService.updatePlayerReady(gameId, userId, readyStatus, roundToUpdate);
    } catch (error) {
      console.error('Error setting ready status:', error);
      alert('Failed to update ready status. Please try again.');
    }
  };

  const handleBuyCoffee = () => {
    Linking.openURL('https://coff.ee/murdermystery');
  };

  const handleSetPlayerReadyManually = async (playerId, readyStatus) => {
    if (!gameId) return;
    
    try {
      const roundToUpdate = gameData?.currentRound;
      await firebaseService.updatePlayerReady(gameId, playerId, readyStatus, roundToUpdate);
    } catch (error) {
      console.error('Error setting player ready status manually:', error);
    }
  };

  const handleSubmitAccusation = async () => {
    if (!gameId || !userId || selectedAccusations.length === 0) return;
    
    try {
      // Submit each selected accusation
      for (const accusedCharacter of selectedAccusations) {
        await firebaseService.submitAccusation(gameId, userId, accusedCharacter);
      }
      
      setAccusationSubmitted(true);
      setSelectedAccusations([]);
    } catch (error) {
      console.error('Error submitting accusation:', error);
      alert('Failed to submit accusation. Please try again.');
    }
  };

  const handleMakePlayerAccuseRandomly = async (playerId) => {
    if (!gameId || !isHost()) return;
    
    try {
      await firebaseService.makePlayerAccuseRandomly(gameId, playerId);
    } catch (error) {
      console.error('Error making player accuse randomly:', error);
      alert('Failed to make player accuse randomly.');
    }
  };

  // Accusation round (round 5.5)
  if (currentRound === 5.5) {
    const allAccusationsSubmitted = gameData?.players?.every(player => 
      player.accusations?.made?.some(acc => acc.round === 5.5)
    );

    return (
      <BackgroundWrapper 
        view={gameViewType}
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
                  paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20, 
                  paddingBottom: 20,
                  backgroundColor: 'transparent' 
                }
              ]}
            >
              <Text style={styles.header}>Round 5 - Make Accusations</Text>
              <Text style={[dynamicStyles.label, {paddingHorizontal: 16}]}> {getPlayerFriendlyRoundInstructions()} </Text>
              
              {accusationSubmitted ? (
                <View style={[styles.gameInfo, {alignItems: 'center'}]}>
                  <Text style={dynamicStyles.label}>Waiting for other players to make accusations...</Text>
                  <Text style={dynamicStyles.subtitle}>
                    {gameData?.players?.filter(p => p.accusations?.made?.some(acc => acc.round === 5.5)).length || 0} of {gameData?.players?.length || 0} players have submitted accusations
                  </Text>
                </View>
              ) : (
                <View style={styles.gameInfo}>
                  <Text style={dynamicStyles.label}>Select who you think is the murderer (you can select multiple):</Text>
                
                  {getAccusableCharacters().map((character, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.characterCard,
                        selectedAccusations.includes(character.characterName) && styles.selectedCard
                      ]}
                      onPress={() => {
                        if (selectedAccusations.includes(character.characterName)) {
                          setSelectedAccusations(selectedAccusations.filter(name => name !== character.characterName));
                        } else {
                          setSelectedAccusations([...selectedAccusations, character.characterName]);
                        }
                      }}
                    >
                      <Text style={dynamicStyles.characterNameWhite}>
                        {character.characterName}, {character.shortDescription}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity
                    style={[styles.button, selectedAccusations.length === 0 && styles.buttonDisabled, {alignSelf: 'center'}]}
                    activeOpacity={0.8}
                    onPress={handleSubmitAccusation}
                    disabled={selectedAccusations.length === 0}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {selectedAccusations.length === 0
                        ? 'Select at least one character'
                        : selectedAccusations.length === 1
                          ? 'Submit Your Accusation'
                          : `Submit Your Accusations (${selectedAccusations.length})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Host Controls - Accusation Status */}
              {isHost() && (
                <View style={styles.gameInfo}>
                  <TouchableOpacity
                    style={styles.collapsibleHeader}
                    onPress={() => setShowPlayerAccusationStatus(!showPlayerAccusationStatus)}
                  >
                    <Text style={dynamicStyles.collapsibleHeaderText}>
                      Accusations Made: {getAccusationStatus().accused}/{getAccusationStatus().total}
                    </Text>
                    <Text style={dynamicStyles.collapsibleArrow}>
                      {showPlayerAccusationStatus ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  
                  {showPlayerAccusationStatus && (
                    <View style={styles.playerStatusContainer}>
                      {getAccusationStatus().players.map((player) => {
                        const isVirtualPlayer = player.userId.startsWith('player');
                        
                        return (
                          <View key={player.userId} style={styles.playerRow}>
                            <View style={styles.playerInfo}>
                              <Text style={dynamicStyles.playerText}>
                                {player.userId === userId ? 'You' : player.username} ({player.characterName})
                                {isVirtualPlayer && ' [Virtual]'}
                              </Text>
                              <Text style={[dynamicStyles.playerText, { fontSize: 14, opacity: 0.8 }]}>
                                {player.hasAccused ? '✓ Accusation Made' : '✗ Not Accused'}
                              </Text>
                            </View>
                            
                            {/* Force Random Guess button only for players who haven't accused */}
                            {!player.hasAccused && (
                              <View style={styles.playerControls}>
                                <TouchableOpacity
                                  style={[styles.smallButton, styles.notReadyButton]}
                                  onPress={() => handleMakePlayerAccuseRandomly(player.userId)}
                                >
                                  <Text style={dynamicStyles.smallButtonText}>
                                    Force Random Guess
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Host Controls - Advance to Final Statements */}
              {isHost() && (
                <View style={styles.gameInfo}>
                  <TouchableOpacity
                    style={[
                      styles.button, 
                      allAccusationsSubmitted ? [styles.button, { backgroundColor: '#4CAF50' }] : styles.buttonDisabled,
                      {alignSelf: 'center'}
                    ]}
                    activeOpacity={0.8}
                    onPress={onAdvanceToNextRound}
                    disabled={!allAccusationsSubmitted}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {allAccusationsSubmitted ? 'Advance to Final Statements' : 'Waiting for all accusations...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  // Final statements round (round 6)
  if (currentRound === 6) {
    const characterObj = getCharacterObject(currentPlayer?.characterName);
    return (
      <BackgroundWrapper 
        view={gameViewType}
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
                { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20, backgroundColor: 'transparent' }
              ]}
            >
              <Text style={styles.header}>Round 6 - Final Statements</Text>
              <Text style={[dynamicStyles.label, {paddingHorizontal: 16}]}>Read your final statements in order</Text>
              <Text style={[dynamicStyles.label, {paddingHorizontal: 16, marginBottom: 8}]}>(your statement order: {characterObj?.finalStatementOrder || 'No order specified'})</Text>
              <View style={styles.gameInfo}>
                <Text style={dynamicStyles.label}>Your Final Statement:</Text>
                <View style={styles.scriptContainer}>
                  <Text style={dynamicStyles.scriptText}>
                    {characterScript?.finalStatement || 'No final statement available.'}
                  </Text>
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
              {isHost() && (
                <View style={styles.gameInfo}>
                  <TouchableOpacity
                    style={styles.collapsibleHeader}
                    onPress={() => setShowPlayerStatus(!showPlayerStatus)}
                  >
                    <Text style={dynamicStyles.collapsibleHeaderText}>
                      Players Ready: {gameData?.players?.filter(p => p.roundStates?.[currentRound]?.ready).length || 0}/{gameData?.players?.length || 0}
                    </Text>
                    <Text style={dynamicStyles.collapsibleArrow}>
                      {showPlayerStatus ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {showPlayerStatus && (
                    <View style={styles.playerStatusContainer}>
                      {gameData?.players.map((player) => {
                        const playerReady = player.roundStates?.[currentRound]?.ready || false;
                        const isVirtualPlayer = player.userId.startsWith('player');
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
                                {player.userId !== userId && (
                                  <TouchableOpacity
                                    style={[styles.smallButton, styles.viewScriptButton]}
                                    onPress={() => onShowPlayerScript(player)}
                                  >
                                    <Text style={dynamicStyles.smallButtonText}>View Script</Text>
                                  </TouchableOpacity>
                                )}
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
                      style={[styles.button, allPlayersReadyForRound() ? styles.buttonActive : styles.buttonDisabled]}
                      activeOpacity={0.8}
                      onPress={onAdvanceToNextRound}
                      disabled={!allPlayersReadyForRound()}
                    >
                      <Text style={dynamicStyles.buttonText}>
                        {allPlayersReadyForRound() ? 'Advance to Next Round' : 'Waiting for all players...'}
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

  // Main game view (regular rounds and game end)
  return (
    <BackgroundWrapper 
      view={gameViewType}
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
                  paddingBottom: 100,
                  backgroundColor: 'transparent' 
                }
              ]}
            >
            <Text style={currentRound === 7 ? {color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginVertical: 16} : styles.header}>
              {currentRound === 7 ? 'The END' : 
               currentRound === 2 ? 'Round 1 - Introduce Yourself' :
               currentRound === 3 ? 'Round 2 - Tell Your Story' :
               currentRound === 4 ? 'Round 3 - Make Your Observation' :
               currentRound === 5 ? 'Round 4 - Make Your Observation' :
               currentRound === 5.5 ? 'Round 5 - Make Accusations' :
               currentRound === 6 ? 'Round 6 - Final Statements' :
               `Round ${currentRound}`
              }
            </Text>
            {currentRound !== 7 && <Text style={dynamicStyles.label}>{getPlayerFriendlyRoundInstructions()}</Text>}
            
            {/* Murderer and Vote Totals for Round 7 */}
            {currentRound === 7 && (
              <>
                <View style={styles.gameInfo}>
                  <Text style={dynamicStyles.label}>
                    {getMurdererCharacters().length === 1 ? 'The murderer:' : 'The murderers:'}
                  </Text>
                  <Text style={{color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginVertical: 16}}>
                    {getMurdererCharacters().map(murderer => murderer.characterName).join(', ') || 'Unknown'}
                  </Text>
                </View>

                <View style={styles.gameInfo}>
                  <Text style={dynamicStyles.label}>Accusation Totals:</Text>
                  {Object.entries(getAccusationVoteTotals()).map(([characterName, accusers]) => (
                    <View key={characterName} style={styles.scriptContainer}>
                      <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center'}}>
                        {characterName}
                      </Text>
                      <Text style={dynamicStyles.subtitle}>
                        Total votes: {accusers.length}
                      </Text>
                      {accusers.length > 0 && (
                        <Text style={dynamicStyles.scriptText}>
                          Accused by: {accusers.join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
                
                                 {/* Coffee link for Round 7 */}
                 <View style={[styles.gameInfo, {alignItems: 'center'}]}>
                   <TouchableOpacity
                     style={[styles.button, { backgroundColor: '#FF9800', alignSelf: 'center', marginBottom: 16 }]}
                     activeOpacity={0.8}
                     onPress={handleBuyCoffee}
                   >
                     <Text style={dynamicStyles.buttonText}>
                       If you enjoyed the Party, consider buying the developer a ☕
                     </Text>
                   </TouchableOpacity>
                 </View>
                
                <View style={[styles.gameInfo, {alignItems: 'center'}]}>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#6b2d35', alignSelf: 'center' }]}
                    activeOpacity={0.8}
                    onPress={onExitGame}
                  >
                    <Text style={dynamicStyles.buttonText}>Exit Game</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            
            {/* Player Scripts - Same for Host and Players */}
            <View style={styles.gameInfo}>
              {/* Only show character name on Round 1 */}
              {currentRound === 1 && (
                <>
                  <Text style={dynamicStyles.label}>Your Character:</Text>
                  <Text style={[dynamicStyles.characterNameWhite, styles.centeredText]}>{currentPlayer?.characterName}</Text>
                </>
              )}
              
              {characterScript && (
                <>
                  {characterScript.introduction && (
                    <>
                      <Text style={dynamicStyles.label}>Your Script:</Text>
                      <View style={styles.scriptContainer}>
                        {parseFormattedText(characterScript.introduction, dynamicStyles.scriptText)}
                      </View>
                    </>
                  )}
                  
                  {characterScript.secretInformation && (
                    <>
                      <Text style={dynamicStyles.label}>Secret Information:</Text>
                      <View style={styles.scriptContainer}>
                        {parseFormattedText(characterScript.secretInformation, dynamicStyles.scriptText)}
                      </View>
                    </>
                  )}
                  
                  {characterScript.story && (
                    <>
                      <Text style={dynamicStyles.label}>Your Story:</Text>
                      <View style={styles.scriptContainer}>
                        {parseFormattedText(characterScript.story, dynamicStyles.scriptText)}
                      </View>
                    </>
                  )}
                  
                  {characterScript.accusation && (
                    <>
                      <View style={styles.scriptContainer}>
                        {parseFormattedText(characterScript.accusation, dynamicStyles.scriptText)}
                      </View>
                    </>
                  )}
                  
                  {characterScript.accusedOf && (
                    <>
                      <Text style={dynamicStyles.label}>
                        Respond to accusations of {characterScript.accusedOf}
                      </Text>
                      <View style={styles.scriptContainer}>
                        {parseFormattedText(characterScript.rebuttal, dynamicStyles.scriptText)}
                      </View>
                    </>
                  )}
                  
                  {characterScript.finalStatement && (
                    <>
                      <Text style={dynamicStyles.label}>Your Final Statement:</Text>
                      <View style={styles.scriptContainer}>
                        {parseFormattedText(characterScript.finalStatement, dynamicStyles.scriptText)}
                      </View>
                    </>
                  )}
                </>
              )}
              
              {/* Only show ready button if not Round 7 */}
              {currentRound !== 7 && (
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
              )}
            </View>

            {/* Host Controls - Only for Host and not Round 7 */}
            {isHost() && currentRound !== 7 && (
              <View style={styles.gameInfo}>
                <TouchableOpacity
                  style={styles.collapsibleHeader}
                  onPress={() => setShowPlayerStatus(!showPlayerStatus)}
                >
                  <Text style={dynamicStyles.collapsibleHeaderText}>
                    Players Ready: {gameData?.players?.filter(p => p.roundStates?.[currentRound]?.ready).length || 0}/{gameData?.players?.length || 0}
                  </Text>
                  <Text style={dynamicStyles.collapsibleArrow}>
                    {showPlayerStatus ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                
                {showPlayerStatus && (
                  <View style={styles.playerStatusContainer}>
                    {gameData?.players.map((player) => {
                      const playerReady = player.roundStates?.[currentRound]?.ready || false;
                      const isVirtualPlayer = player.userId.startsWith('player');
                      
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
                              {player.userId !== userId && (
                                <TouchableOpacity
                                  style={[styles.smallButton, styles.viewScriptButton]}
                                  onPress={() => onShowPlayerScript(player)}
                                >
                                  <Text style={dynamicStyles.smallButtonText}>View Script</Text>
                                </TouchableOpacity>
                              )}
                              
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
                    style={[styles.button, allPlayersReadyForRound() ? styles.buttonActive : styles.buttonDisabled]}
                    activeOpacity={0.8}
                    onPress={onAdvanceToNextRound}
                    disabled={!allPlayersReadyForRound()}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {allPlayersReadyForRound() ? 'Advance to Next Round' : 'Waiting for all players...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Exit Game button for Round 7 */}
            {false && currentRound === 7 && (
              <View style={styles.gameInfo}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#6b2d35' }]}
                  activeOpacity={0.8}
                  onPress={onExitGame}
                >
                  <Text style={dynamicStyles.buttonText}>Exit Game</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
} 