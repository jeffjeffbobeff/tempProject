import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';
import firebaseService from '../../firebase';
import gameScriptService from '../../gameScriptService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UnifiedLobbyView({
  gameId,
  gameData,
  userId,
  dynamicStyles = {},
  isHost = false,
  onCopyGameCode,
  onStartGame,
  canStartGame = false,
  onBackToHome,
  scrollViewRef,
}) {
  // State for invite settings
  const [inviteSettings, setInviteSettings] = useState({
    date: '',
    time: '7:00 PM',
    location: '',
    accents: 'Optional',
    costumes: 'Optional',
  });

  // State for character selection
  const [showCharacterDetails, setShowCharacterDetails] = useState(false);
  const [selectedCharacterForDetails, setSelectedCharacterForDetails] = useState(null);
  const [showInviteSettings, setShowInviteSettings] = useState(false);

  // Load invite settings from local storage
  useEffect(() => {
    loadInviteSettings();
  }, []);

  const loadInviteSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('inviteSettings');
      if (saved) {
        setInviteSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading invite settings:', error);
    }
  };

  const saveInviteSettings = async (settings) => {
    try {
      await AsyncStorage.setItem('inviteSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving invite settings:', error);
    }
  };

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

  // Helper: check if character is assigned
  const isCharacterAssigned = (character) => {
    const charName = character.characterName || character.Character;
    return gameData.players.some(p => p.characterName === charName);
  };

  // Helper: check if character is assigned to virtual player
  const isCharacterAssignedToVirtual = (character) => {
    const charName = character.characterName || character.Character;
    return gameData.players.some(p => 
      p.characterName === charName && p.userId.startsWith('player_')
    );
  };

  // Handle character selection
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
    } catch (error) {
      console.error('Error selecting character:', error);
      Alert.alert('Error', 'Failed to select character. Please try again.');
    }
  };

  // Handle virtual player toggle
  const handleToggleVirtualPlayer = async (character) => {
    if (!gameId) return;
    const charName = character.characterName || character.Character;
    
    if (isCharacterAssignedToVirtual(character)) {
      // Remove virtual player
      const virtualPlayer = gameData.players.find(p => 
        p.characterName === charName && p.userId.startsWith('player_')
      );
      if (virtualPlayer) {
        await firebaseService.removePlayerFromGame(gameId, virtualPlayer.userId);
      }
    } else {
      // Add virtual player
      const virtualPlayerId = `player_${Date.now()}`;
      await firebaseService.addPlayerToGame(gameId, virtualPlayerId, charName, false);
      await firebaseService.selectCharacter(gameId, virtualPlayerId, charName);
    }
  };

  // Generate invitation text
  const generateInvitation = (character = null) => {
    const gameScript = gameScriptService.getGameScript(gameData?.gameScriptId);
    const gameTitle = gameScript?.metadata?.title || 'Murder Mystery Game';
    const gameDescription = gameScript?.metadata?.description || 'Join us for an exciting murder mystery!';
    
    let invitation = `Join my murder mystery party! \n– ${gameTitle}\n`;
    invitation += `– ${gameDescription}\n`;
    
    if (character) {
      const charName = character.characterName || character.Character;
      const charDesc = character.shortDescription || character.description || '';
      invitation += `– Your Character: ${charName} - ${charDesc}\n`;
    }
    
    // Only include date/time if both are set
    if (inviteSettings.date && inviteSettings.time) {
      invitation += `– ${inviteSettings.time} ${inviteSettings.date}\n`;
    }
    
    // Only include location if it's set
    if (inviteSettings.location && inviteSettings.location.trim()) {
      invitation += `– ${inviteSettings.location}\n`;
    }
    
    // Only include accents if it's set (not default)
    if (inviteSettings.accents && inviteSettings.accents !== 'Optional') {
      invitation += `– Accents: ${inviteSettings.accents}\n`;
    }
    
    // Only include costumes if it's set (not default)
    if (inviteSettings.costumes && inviteSettings.costumes !== 'Optional') {
      invitation += `– Costumes: ${inviteSettings.costumes}\n`;
    }
    
    invitation += `– To play, you must download the free App\n`;
    invitation += `– Android: [placeholder Play Store link]\n`;
    invitation += `– Apple: [placeholder App Store link]\n`;
    invitation += `– Game Code: ${gameId}`;
    
    return invitation;
  };

  // Handle copy invitation
  const handleCopyInvitation = (character = null) => {
    const invitation = generateInvitation(character);
    Clipboard.setString(invitation);
    Alert.alert(
      'Invitation Copied', 
      `The invitation has been copied to your clipboard!\n\nPaste the invitation into a text, whatsapp, or email message.\n\n${invitation}`
    );
  };

  const allCharacters = getAllCharacters();
  const currentPlayer = getCurrentPlayer();
  const minPlayers = gameData?.minPlayers || 8;
  const maxPlayers = gameData?.maxPlayers || 8;

  return (
    <BackgroundWrapper view="lobby" overlayOpacity={0.7}>
      <SafeAreaView edges={['top','left','right']} style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: 'transparent', alignItems: 'stretch' }]}>
          <StatusBar barStyle="light-content" backgroundColor="#181A20" />
          <ScrollView 
            ref={scrollViewRef} 
            style={{ flex: 1 }} 
            contentContainerStyle={{ 
              paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20, 
              backgroundColor: 'transparent' 
            }}
          >
            <Text style={dynamicStyles.header || styles.header}>Game Lobby</Text>
            
            {/* Game Code Section */}
            <TouchableOpacity
              style={[styles.gameCodeContainer, { width: '60%', alignSelf: 'center' }]}
              activeOpacity={0.8}
              onPress={onCopyGameCode}
            >
              <Text style={dynamicStyles.gameCodeLabel || styles.gameCodeLabel}>Game Code:</Text>
              <Text style={dynamicStyles.gameCode || styles.gameCode}>{gameId}</Text>
              <Text style={dynamicStyles.copyHint || styles.copyHint}>Tap to copy</Text>
            </TouchableOpacity>

            {/* Host Invite Settings Section */}
            {isHost && (
              <View style={styles.gameInfo}>
                <TouchableOpacity
                  style={styles.collapsibleHeader}
                  activeOpacity={0.8}
                  onPress={() => setShowInviteSettings(!showInviteSettings)}
                >
                  <Text style={dynamicStyles.collapsibleHeaderText}>Invite Settings</Text>
                  <Text style={styles.collapsibleArrow}>{showInviteSettings ? '▼' : '▶'}</Text>
                </TouchableOpacity>
                
                {showInviteSettings && (
                  <View style={styles.inviteSettingsContainer}>
                    <Text style={[dynamicStyles.label, { fontSize: 14, opacity: 0.8, marginBottom: 16 }]}>
                      Enter details to customize your invitations
                    </Text>
                    
                    {/* Date Input */}
                    <View style={styles.inputRow}>
                      <Text style={dynamicStyles.label}>Date:</Text>
                      <TextInput
                        style={styles.textInput}
                        value={inviteSettings.date}
                        onChangeText={(text) => {
                          const newSettings = { ...inviteSettings, date: text };
                          setInviteSettings(newSettings);
                          saveInviteSettings(newSettings);
                        }}
                        placeholder="e.g., December 25, 2024"
                        placeholderTextColor="#999"
                      />
                    </View>
                    
                    {/* Time Input */}
                    <View style={styles.inputRow}>
                      <Text style={dynamicStyles.label}>Time:</Text>
                      <TextInput
                        style={styles.textInput}
                        value={inviteSettings.time}
                        onChangeText={(text) => {
                          const newSettings = { ...inviteSettings, time: text };
                          setInviteSettings(newSettings);
                          saveInviteSettings(newSettings);
                        }}
                        placeholder="e.g., 7:00 PM"
                        placeholderTextColor="#999"
                      />
                    </View>
                    
                    {/* Location Input */}
                    <View style={styles.inputRow}>
                      <Text style={dynamicStyles.label}>Location:</Text>
                      <TextInput
                        style={styles.textInput}
                        value={inviteSettings.location}
                        onChangeText={(text) => {
                          const newSettings = { ...inviteSettings, location: text };
                          setInviteSettings(newSettings);
                          saveInviteSettings(newSettings);
                        }}
                        placeholder="e.g., 123 Main St, City"
                        placeholderTextColor="#999"
                        maxLength={254}
                      />
                    </View>
                    
                    {/* Accents Picker */}
                    <View style={styles.inputRow}>
                      <Text style={dynamicStyles.label}>Accents:</Text>
                      <View style={styles.pickerRow}>
                        {['Encouraged', 'Optional', 'Mandatory', 'Forbidden'].map((option) => (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.pickerOption,
                              inviteSettings.accents === option && styles.pickerOptionSelected
                            ]}
                            onPress={() => {
                              const newSettings = { ...inviteSettings, accents: option };
                              setInviteSettings(newSettings);
                              saveInviteSettings(newSettings);
                            }}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              inviteSettings.accents === option && styles.pickerOptionTextSelected
                            ]}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    
                    {/* Costumes Picker */}
                    <View style={styles.inputRow}>
                      <Text style={dynamicStyles.label}>Costumes:</Text>
                      <View style={styles.pickerRow}>
                        {['Encouraged', 'Optional', 'Mandatory', 'Forbidden'].map((option) => (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.pickerOption,
                              inviteSettings.costumes === option && styles.pickerOptionSelected
                            ]}
                            onPress={() => {
                              const newSettings = { ...inviteSettings, costumes: option };
                              setInviteSettings(newSettings);
                              saveInviteSettings(newSettings);
                            }}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              inviteSettings.costumes === option && styles.pickerOptionTextSelected
                            ]}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    
                    {/* General Invite Button */}
                    <View style={{ alignItems: 'center', marginTop: 16 }}>
                      <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={() => handleCopyInvitation()}
                      >
                        <Text style={dynamicStyles.buttonText}>General Invite</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Character Selection Section */}
            <View style={styles.gameInfo}>
              {/* Current Character Display */}
              {currentPlayer?.characterName && (
                <View style={styles.currentCharacterContainer}>
                  <Text style={dynamicStyles.label}>Your Current Character:</Text>
                  <Text style={[dynamicStyles.characterNameWhite, styles.centeredText, { fontSize: 20 }]}>
                    {currentPlayer.characterName}, {gameScriptService.getCharacterByName(gameData?.gameScriptId, currentPlayer.characterName)?.shortDescription}
                  </Text>
                </View>
              )}

              {/* Character List */}
              {allCharacters.map((character, index) => {
                const charName = character.characterName || character.Character;
                const isAssigned = isCharacterAssigned(character);
                const isAssignedToVirtual = isCharacterAssignedToVirtual(character);
                const isAssignedToReal = isAssigned && !isAssignedToVirtual;
                
                return (
                  <View key={index} style={[styles.characterCard, { width: '90%', alignSelf: 'center' }]}>
                    <View style={styles.characterInfo}>
                      <Text style={dynamicStyles.characterNameWhite}>
                        {charName}, {character.shortDescription}
                      </Text>
                    </View>
                    
                    <View style={styles.characterActions}>
                      {/* First Row: Details and Play */}
                      <View style={styles.characterButtonRow}>
                        {/* Details Button */}
                        <TouchableOpacity
                          style={[styles.button, styles.secondaryButton, { flex: 1, marginRight: 4 }]}
                          onPress={() => {
                            setSelectedCharacterForDetails(character);
                            setShowCharacterDetails(true);
                          }}
                        >
                          <Text style={dynamicStyles.buttonText}>Details</Text>
                        </TouchableOpacity>
                        
                        {/* Play/Assigned Button */}
                        {isAssignedToReal ? (
                          <TouchableOpacity 
                            style={[styles.button, { backgroundColor: '#666', opacity: 0.7, flex: 1, marginLeft: 4 }]} 
                            disabled={true}
                          >
                            <Text style={dynamicStyles.buttonText}>Assigned</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.button, styles.primaryButton, { flex: 1, marginLeft: 4 }]}
                            onPress={() => handleSelectCharacter(character)}
                          >
                            <Text style={dynamicStyles.buttonText}>Play</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {/* Second Row: Invite and Make Virtual (Host only) */}
                      {isHost && (
                        <View style={styles.characterButtonRow}>
                          {/* Host Invite Button */}
                          <TouchableOpacity
                            style={[styles.button, styles.secondaryButton, { flex: 1, marginRight: 4 }]}
                            onPress={() => handleCopyInvitation(character)}
                          >
                            <Text style={dynamicStyles.buttonText}>Invite</Text>
                          </TouchableOpacity>
                          
                          {/* Host Virtual Toggle */}
                          <TouchableOpacity
                            style={[
                              styles.button, 
                              { flex: 1, marginLeft: 4 },
                              isAssignedToVirtual ? styles.notReadyButton : styles.readyButton
                            ]}
                            onPress={() => handleToggleVirtualPlayer(character)}
                          >
                            <Text style={dynamicStyles.buttonText}>
                              {isAssignedToVirtual ? 'Virtual' : 'Make Virtual'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Players List */}
            {gameData && (
              <View style={styles.gameInfo}>
                <Text style={dynamicStyles.label}>
                  Players {gameData.players.length}/{maxPlayers}: {gameData.players.length < minPlayers ? 'Waiting for more players' : 'Ready to play!'}
                </Text>
                {gameData.players.map((player, index) => {
                  const isCurrent = player.userId === userId;
                  return (
                    <View key={`${player.userId}-${index}`} style={styles.playerRow}>
                      <Text style={dynamicStyles.playerText || styles.playerText}>
                        {player.username}{isCurrent ? ' (You)' : ''}{player.isHost ? ' *HOST' : ''}
                      </Text>
                      <Text style={dynamicStyles.playerStatus || styles.playerStatus}>
                        {player.characterName ? `- ${player.characterName}` : '- No character'}
                      </Text>
                      {player.isSimulated && (
                        <Text style={dynamicStyles.simulatedTag || styles.simulatedTag}>[SIM]</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Start Game Button */}
            {isHost && (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, !canStartGame && styles.buttonDisabled]}
                  onPress={onStartGame}
                  disabled={!canStartGame}
                >
                  <Text style={[dynamicStyles.buttonText || styles.buttonText, styles.centeredText, { paddingHorizontal: 16 }]}>
                    {canStartGame ? 'Start Game' : 'Waiting for everyone to join'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Back to Home Button */}
            <View style={{ alignItems: 'center', width: '100%' }}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { paddingHorizontal: 32, paddingVertical: 18, marginBottom: 32 }]}
                activeOpacity={0.8}
                onPress={onBackToHome}
              >
                <Text style={dynamicStyles.buttonText || styles.buttonText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Character Details Modal */}
      <Modal
        visible={showCharacterDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCharacterDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseX}
              activeOpacity={0.8}
              onPress={() => setShowCharacterDetails(false)}
            >
              <Text style={styles.modalCloseXText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedCharacterForDetails?.characterName || selectedCharacterForDetails?.Character}
            </Text>
            <Text style={styles.modalDescription}>
              {selectedCharacterForDetails?.characterDetails || selectedCharacterForDetails?.shortDescription || 'No description available.'}
            </Text>
          </View>
        </View>
      </Modal>
    </BackgroundWrapper>
  );
}
