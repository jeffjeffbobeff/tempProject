import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, PanResponder, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';

export default function JoinGameView({
  gameCode,
  setGameCode,
  onJoin,
  onBack,
  gameLoading = false,
  inputError = '',
  dynamicStyles = {},
}) {
  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      console.log('🔧 JoinGameView: Android back button pressed, calling onBack');
      onBack && onBack();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [onBack]);

  // PanResponder for swipe right to go back
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped right (dx > 50), go back
        if (gestureState.dx > 50) {
          console.log('🔧 JoinGameView: Swipe right detected, calling onBack');
          onBack && onBack();
        }
      },
    })
  ).current;
  return (
    <BackgroundWrapper view="home" overlayOpacity={0.7}>
      <SafeAreaView edges={['top','left','right']} style={{ flex: 1 }} {...panResponder.panHandlers}>
        <View style={[styles.container, { backgroundColor: 'transparent', flex: 1 }]}> 
          <StatusBar barStyle="light-content" backgroundColor="#181A20" />
          <KeyboardAvoidingView
            style={[styles.centered, { backgroundColor: 'transparent' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Text
              style={[
                styles.header,
                { flexWrap: 'wrap', width: '90%', alignSelf: 'center' }
              ]}
              numberOfLines={2}
              allowFontScaling
            >
              Join Game
            </Text>
            <Text style={dynamicStyles.label || styles.label}>Enter the game code:</Text>
            <TextInput
              style={dynamicStyles.input || styles.input}
              placeholder="Game Code (6 characters)"
              placeholderTextColor="#888"
              value={gameCode}
              onChangeText={text => {
                // Limit to 6 characters, convert to uppercase, and only allow letters and numbers
                const sanitizedText = text.slice(0, 6).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                setGameCode(sanitizedText);
              }}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onJoin}
              editable={!gameLoading}
            />
            {inputError ? <Text style={dynamicStyles.error || styles.error}>{inputError}</Text> : null}
            <TouchableOpacity
              style={[styles.button, gameLoading && styles.buttonDisabled]}
              activeOpacity={0.8}
              onPress={onJoin}
              disabled={gameLoading}
            >
              {gameLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Join Game</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
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