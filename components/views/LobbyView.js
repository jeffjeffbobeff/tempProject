import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';

export default function LobbyView({
  gameId,
  gameData,
  userId,
  dynamicStyles = {},
  isHost = false,
  onCopyGameCode,
  onAddVirtualPlayer,
  availableCharactersForVirtuals = [],
  onStartGame,
  canStartGame = false,
  onChangeCharacter,
  onBackToHome,
  scrollViewRef,
}) {
  const [showVirtualPlayerButtons, setShowVirtualPlayerButtons] = useState(false);

  const minPlayers = gameData?.minPlayers || 8;
  const maxPlayers = gameData?.maxPlayers || 8;
  const allPlayersJoined = gameData?.players?.length >= minPlayers;

  return (
    <BackgroundWrapper view="lobby" overlayOpacity={0.7}>
      <SafeAreaView edges={['top','left','right']} style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: 'transparent', alignItems: 'stretch' }]}> 
          <StatusBar barStyle="light-content" backgroundColor="#181A20" />
          <ScrollView ref={scrollViewRef} style={{ flex: 1 }} contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20, backgroundColor: 'transparent' }}>
            <Text style={dynamicStyles.header || styles.header}>Game Lobby</Text>
            <TouchableOpacity
              style={[styles.gameCodeContainer, { width: '60%', alignSelf: 'center' }]}
              activeOpacity={0.8}
              onPress={onCopyGameCode}
            >
              <Text style={dynamicStyles.gameCodeLabel || styles.gameCodeLabel}>Game Code:</Text>
              <Text style={dynamicStyles.gameCode || styles.gameCode}>{gameId}</Text>
              <Text style={dynamicStyles.copyHint || styles.copyHint}>Tap to copy</Text>
            </TouchableOpacity>
            {gameData && (
              <View style={styles.gameInfo}>
                <Text style={dynamicStyles.label || styles.label}>
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
                {isHost && (
                  <View style={{ width: '100%', alignItems: 'center', marginTop: 16 }}>
                    <TouchableOpacity
                      style={styles.collapsibleHeader}
                      activeOpacity={0.8}
                      onPress={() => setShowVirtualPlayerButtons(v => !v)}
                    >
                      <Text style={dynamicStyles.collapsibleHeaderText}>Add Virtual Players</Text>
                      <Text style={styles.collapsibleArrow}>{showVirtualPlayerButtons ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    {showVirtualPlayerButtons && (
                      <View style={styles.testButtons}>
                        {availableCharactersForVirtuals.map((character, index) => {
                          const charName = character.characterName || character.Character;
                          return (
                            <TouchableOpacity
                              key={charName}
                              style={[styles.button, styles.testButton, { alignItems: 'center', justifyContent: 'center' }]}
                              onPress={() => onAddVirtualPlayer(character)}
                            >
                              <Text style={[dynamicStyles.testButtonText || styles.testButtonText, { textAlign: 'center', width: '100%' }]}>Add {charName}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
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
            <View style={{ alignItems: 'center', width: '100%' }}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { paddingHorizontal: 32, paddingVertical: 18, marginBottom: 32 }]}
                activeOpacity={0.8}
                onPress={onChangeCharacter}
              >
                <Text style={dynamicStyles.buttonText || styles.buttonText}>Change Character</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
} 