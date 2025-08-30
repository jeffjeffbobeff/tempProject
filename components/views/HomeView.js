import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';

export default function HomeView({ username = '', createGame, joinGame, myGames, gameLoading = false, dynamicStyles, onBackToOnboarding }) {
  const backgroundProps = {
    view: 'home',
    overlayOpacity: 0.6,
  };

  // PanResponder for swipe right to go back to onboarding
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped left(gestureState.dx > 50), go back to onboarding
        if (gestureState.dx > 50) {
          onBackToOnboarding && onBackToOnboarding();
        }
      },
    })
  ).current;

  return (
    <BackgroundWrapper {...backgroundProps}>
      <SafeAreaView edges={['top','left','right']} style={{ flex: 1 }} {...panResponder.panHandlers}>
        <View style={[
          styles.container,
          {
            backgroundColor: 'transparent',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '-25%',
          },
        ]}>
                     <Text style={[dynamicStyles && dynamicStyles.header ? dynamicStyles.header : styles.header, { paddingHorizontal: 10 }]}>Welcome{username ? `, ${username}` : ''}!</Text>
          <TouchableOpacity
            style={[styles.button, gameLoading && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={createGame}
            disabled={gameLoading}
          >
            {gameLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={dynamicStyles && dynamicStyles.buttonText ? dynamicStyles.buttonText : styles.buttonText}>Start New Game</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, gameLoading && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={joinGame}
            disabled={gameLoading}
          >
            <Text style={dynamicStyles && dynamicStyles.buttonText ? dynamicStyles.buttonText : styles.buttonText}>Join Game</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, gameLoading && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={myGames}
            disabled={gameLoading}
          >
            <Text style={dynamicStyles && dynamicStyles.buttonText ? dynamicStyles.buttonText : styles.buttonText}>My Games</Text>
          </TouchableOpacity>
        </View>
        
        {/* Branding text at bottom */}
        <View style={{
          justifyContent: 'flex-end', // Pushes content to the bottom
          alignItems: 'center',       // Centers horizontally
          paddingBottom: 30,          // Adds space from the bottom edge
        }}>
          <Text style={{
            color: '#888',
            fontSize: 24,
            fontWeight: '400',
            textAlign: 'center',
            opacity: 0.7,
          }}>
            Murder Mystery Party
          </Text>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
} 