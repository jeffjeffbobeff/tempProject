import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';
import gameScriptService from '../../gameScriptService';

export default function MyGamesView({
  myGames = [],
  myGamesLoading = false,
  myGamesFilter = 'all',
  setMyGamesFilter = (filter) => {},
  onGo = (game) => {},
  onInvite = (game) => {},
  onDelete = (game) => {},
  onBack = () => {},
  dynamicStyles = {},
}) {
  // PanResponder for swipe left to go back
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped left (dx > 50), go back
        if (gestureState.dx > 50) {
          onBack && onBack();
        }
      },
    })
  ).current;
  // Filter games based on current filter
  const filteredGames = myGames.filter(game => {
    switch (myGamesFilter) {
      case 'active':
        return game.gameData?.status === 'LOBBY' || game.gameData?.status === 'IN_PROGRESS';
      case 'completed':
        return game.gameData?.status === 'COMPLETED';
      case 'hosted':
        return game.role === 'host';
      case 'joined':
        return game.role === 'player';
      default:
        return true; // 'all'
    }
  });

  return (
    <BackgroundWrapper view="home" overlayOpacity={0.7}>
      <SafeAreaView edges={['top','left','right']} style={{flex:1}} {...panResponder.panHandlers}>
        <View style={[styles.container, { backgroundColor: 'transparent' }]}> 
          <StatusBar barStyle="light-content" backgroundColor="#181A20" />
          <ScrollView 
            style={[styles.scrollView, { backgroundColor: 'transparent' }]}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20, backgroundColor: 'transparent' }
            ]}
          >
            <Text style={styles.header}>My Games</Text>
            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              {['all', 'active', 'completed', 'hosted', 'joined'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    myGamesFilter === filter && styles.filterButtonActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setMyGamesFilter(filter)}
                >
                  <Text style={
                    dynamicStyles.filterButtonText || styles.filterButtonText
                  }>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Loading State */}
            {myGamesLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={dynamicStyles.label || styles.label}>Loading your games...</Text>
              </View>
            ) : (
              <>
                {/* Games List */}
                {filteredGames.length > 0 ? (
                  <View style={styles.gamesList}>
                    {filteredGames.map((game, index) => {
                      const scriptId = game.gameData?.gameScriptId;
                      const script = scriptId && game.gameData?.gameScript ? game.gameData.gameScript : null;
                      const gameStatus = game.gameData?.status || 'Unknown';
                      const playerCount = game.gameData?.players?.length || 0;
                      const isHost = game.role === 'host';
                      const showGo = true;
                      const showInvite = true;
                      const showDelete = isHost;
                      return (
                        <View key={`${game.gameId}-${index}`} style={styles.gameCard}>
                          {/* Game Header */}
                          <View style={styles.gameCardHeader}>
                            <Text style={dynamicStyles.gameTitle || styles.gameTitle}>
                              {gameScriptService.getGameScript(game.gameData?.gameScriptId)?.title || game.gameData?.gameScriptId || 'Unknown Game'}
                            </Text>
                          </View>
                          {/* Game Details */}
                          <View style={styles.gameCardDetails}>
                            <View style={styles.gameDetailRow}>
                              <Text style={dynamicStyles.gameDetailLabel || styles.gameDetailLabel}>Status: </Text>
                              <Text style={dynamicStyles.gameDetailValue || styles.gameDetailValue}>
                                {gameStatus === 'LOBBY' ? 'Lobby' : 
                                 gameStatus === 'IN_PROGRESS' ? 'In Progress' : 
                                 gameStatus === 'COMPLETED' ? 'Completed' : gameStatus}
                              </Text>
                            </View>
                            <View style={styles.gameDetailRow}>
                              <Text style={dynamicStyles.gameDetailLabel || styles.gameDetailLabel}>Role: </Text>
                              <Text style={dynamicStyles.gameDetailValue || styles.gameDetailValue}>
                                {isHost ? 'Host' : 'Player'}
                              </Text>
                            </View>
                          </View>
                          {/* Game Actions */}
                          <View style={styles.gameCardActions}>
                            {showGo && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonPrimary]}
                                activeOpacity={0.8}
                                onPress={() => onGo(game)}
                              >
                                <Text style={dynamicStyles.actionButtonText || styles.actionButtonText}>Go</Text>
                              </TouchableOpacity>
                            )}
                            {showInvite && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonSecondary]}
                                activeOpacity={0.8}
                                onPress={() => onInvite(game)}
                              >
                                <Text style={dynamicStyles.actionButtonText || styles.actionButtonText}>Invite</Text>
                              </TouchableOpacity>
                            )}
                            {showDelete && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonDanger]}
                                activeOpacity={0.8}
                                onPress={() => onDelete(game)}
                              >
                                <Text style={dynamicStyles.actionButtonText || styles.actionButtonText}>Delete</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.centered}>
                    <Text style={dynamicStyles.label || styles.label}>
                      {myGamesFilter === 'all' ? 'No games found' : `No ${myGamesFilter} games found`}
                    </Text>
                    <Text style={dynamicStyles.subtitle || styles.subtitle}>
                      {myGamesFilter === 'all' ? 'Start or join a game to see it here' : 'Try a different filter'}
                    </Text>
                  </View>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={onBack}
            >
              <Text style={dynamicStyles.buttonText || styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
} 