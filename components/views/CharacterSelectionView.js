import React from 'react';
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

export default function CharacterSelectionView({
  gameId,
  gameData,
  userId,
  dynamicStyles,
  onSelectCharacter,
  onKeepCharacter,
  onRemoveVirtualPlayer,
  scrollViewRef,
}) {
  // Helper: get all characters for display
  const getAllCharacters = () => {
    if (!gameData || !gameData.gameScriptId) return [];
    return gameScriptService.getCharacters(gameData.gameScriptId);
  };

  // Helper: get current player
  const getCurrentPlayer = () => {
    if (!gameData?.players || !userId) return null;
    if (!Array.isArray(gameData.players)) {
      return null;
    }
    return gameData.players.find(p => p.userId === userId);
  };

  const allCharacters = getAllCharacters();
  const currentPlayer = getCurrentPlayer();

  const handleSelectCharacter = async (character) => {
    if (!gameId || !userId) return;
    const charName = character.characterName || character.Character;
    
    // Remove virtual player if this character is assigned to one
    const assignedVirtual = gameData.players.find(p =>
      p.characterName === charName && p.userId.startsWith('player_')
    );
    if (assignedVirtual) {
      await firebaseService.removePlayerFromGame(gameId, assignedVirtual.userId);
      // Wait for backend update
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
      await firebaseService.selectCharacter(gameId, userId, charName);
      onSelectCharacter(character);
    } catch (error) {
      console.error('Error selecting character:', error);
      alert('Failed to select character. Please try again.');
    }
  };



  return (
    <BackgroundWrapper view="character" overlayOpacity={0.7}>
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
            <Text style={styles.header}>Choose Your Character</Text>
            
            {currentPlayer?.characterName && (
              <View style={styles.currentCharacterContainer}>
                <Text style={dynamicStyles.label}>Your Current Character:</Text>
                <Text style={[dynamicStyles.characterNameWhite, styles.centeredText, { fontSize: 20 }]}>
                  {currentPlayer.characterName}, {gameScriptService.getCharacterByName(gameData?.gameScriptId, currentPlayer.characterName)?.shortDescription}
                </Text>
                <View style={styles.centeredButtonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    activeOpacity={0.8}
                    onPress={onKeepCharacter}
                  >
                    <Text style={dynamicStyles.buttonText}>Keep Character</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={dynamicStyles.label}>All Characters:</Text>
            
            {allCharacters.map((character, index) => {
              const charName = character.characterName || character.Character;
              // Check if this character is currently assigned to a virtual player
              const assignedVirtual = gameData.players.find(p => p.characterName === charName && p.userId.startsWith('player_'));
              // Check if this character is assigned to a real player (host or non-virtual)
              const assignedReal = gameData.players.find(p => p.characterName === charName && !p.userId.startsWith('player_'));
              return (
                <View key={index} style={[styles.characterCard, { width: '90%', alignSelf: 'center' }]}>
                  <View style={styles.characterInfo}>
                    <Text style={dynamicStyles.characterNameWhite}>
                      {character.characterName}, {character.shortDescription}
                    </Text>
                  </View>
                  {assignedVirtual ? (
                    <TouchableOpacity
                      style={styles.playButton}
                      activeOpacity={0.8}
                      onPress={() => handleSelectCharacter(character)}
                    >
                      <Text style={styles.playButtonText}>Play</Text>
                    </TouchableOpacity>
                  ) : assignedReal ? (
                    <TouchableOpacity style={[styles.playButton, { backgroundColor: '#666', opacity: 0.7 }]} disabled={true}>
                      <Text style={styles.playButtonText}>Assigned</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.playButton}
                      activeOpacity={0.8}
                      onPress={() => handleSelectCharacter(character)}
                    >
                      <Text style={styles.playButtonText}>Play</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
} 