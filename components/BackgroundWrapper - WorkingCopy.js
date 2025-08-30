import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

const BackgroundWrapper = ({ 
  children, 
  view = 'default',
  gameScriptId = null,
  overlayOpacity = 0.8,
  style = {} 
}) => {
  // Dynamic background selection based on view and game script
  const getBackgroundSource = () => {
    // Debug log
    // eslint-disable-next-line no-console
    // console.log('[BackgroundWrapper] getBackgroundSource view:', view, 'gameScriptId:', gameScriptId);
    // For views that don't depend on game script
    if (view === 'home' || view === 'game-selection') {
      return getGenericBackground(view);
    }
    // For game-specific views, use the game script to determine background
    if (gameScriptId) {
      const bg = getGameSpecificBackground(view, gameScriptId);
      // eslint-disable-next-line no-console
              // console.log('[BackgroundWrapper] getGameSpecificBackground result:', bg);
      return bg;
    }
    // Fallback to generic background
    return getGenericBackground(view);
  };

  // Get generic backgrounds for non-game-specific views
  const getGenericBackground = (viewType) => {
    try {
      switch (viewType) {
        case 'home':
          return require('../assets/images/backgrounds/home-opera-dark.png');
        case 'game-selection':
          return require('../assets/images/backgrounds/game-selection-stage.png');
        default:
          return null;
      }
    } catch (error) {
      // console.log(`Generic background not found for view: ${viewType}`);
      return null;
    }
  };

  // Get game-specific backgrounds based on script ID and view
  const getGameSpecificBackground = (viewType, scriptId) => {
    try {
      // Map game scripts to their themes/settings
      const scriptThemes = {
        'opera_murder_mystery_v1': 'opera-house',
        'jazz_age_mystery_v1': 'art-deco',
        'gothic_mansion_v1': 'gothic',
        'modern_detective_v1': 'modern',
        // Add more scripts as they're created
      };
      const theme = scriptThemes[scriptId] || 'default';
      // Map views to specific background types (add all possible views)
      const viewBackgrounds = {
        'lobby': `${theme}-lobby`,
        'game': `${theme}-game`,
        'character': `${theme}-character`,
        'character-selection': `${theme}-character`,
        'accusations': `${theme}-accusations`,
        'final-statements': `${theme}-final`,
        'game-end': `${theme}-end`,
        'default': `${theme}-game`,
      };
      const backgroundKey = viewBackgrounds[viewType] || viewBackgrounds['default'];
      if (!backgroundKey || typeof backgroundKey !== 'string') {
        // console.log('[BackgroundWrapper] No backgroundKey for viewType:', viewType, 'theme:', theme, 'scriptId:', scriptId);
        return getGenericBackground(viewType);
      }
      // eslint-disable-next-line no-console
      // console.log('[BackgroundWrapper] Using backgroundKey:', backgroundKey);
      return getBackgroundByKey(backgroundKey);
    } catch (error) {
              // console.log(`[BackgroundWrapper] Game-specific background not found for ${viewType} in ${scriptId}:`, error.message);
      return getGenericBackground(viewType);
    }
  };

  // Mapping function for all possible background combinations
  const getBackgroundByKey = (backgroundKey) => {
    if (!backgroundKey || typeof backgroundKey !== 'string') {
      // console.log('[BackgroundWrapper] Background key is undefined or not a string:', backgroundKey);
      return null;
    }
    try {
      switch (backgroundKey) {
        // Opera House backgrounds
        case 'opera-house-lobby':
          return require('../assets/images/backgrounds/opera-house-lobby.png');
        case 'opera-house-game':
          return require('../assets/images/backgrounds/opera-house-game.png');
        case 'opera-house-character':
          return require('../assets/images/backgrounds/opera-house-character.png');
        case 'opera-house-accusations':
          return require('../assets/images/backgrounds/opera-house-accusations.png');
        case 'opera-house-final':
          return require('../assets/images/backgrounds/opera-house-final.png');
        case 'opera-house-end':
          return require('../assets/images/backgrounds/opera-house-end.png');
        // Art Deco backgrounds
        case 'art-deco-lobby':
          return require('../assets/images/backgrounds/art-deco-lobby.png');
        case 'art-deco-game':
          return require('../assets/images/backgrounds/art-deco-game.png');
        case 'art-deco-character':
          return require('../assets/images/backgrounds/art-deco-character.png');
        case 'art-deco-accusations':
          return require('../assets/images/backgrounds/art-deco-accusations.png');
        case 'art-deco-final':
          return require('../assets/images/backgrounds/art-deco-final.png');
        case 'art-deco-end':
          return require('../assets/images/backgrounds/art-deco-end.png');
        // Gothic backgrounds
        case 'gothic-lobby':
          return require('../assets/images/backgrounds/gothic-lobby.png');
        case 'gothic-game':
          return require('../assets/images/backgrounds/gothic-game.png');
        case 'gothic-character':
          return require('../assets/images/backgrounds/gothic-character.png');
        case 'gothic-accusations':
          return require('../assets/images/backgrounds/gothic-accusations.png');
        case 'gothic-final':
          return require('../assets/images/backgrounds/gothic-final.png');
        case 'gothic-end':
          return require('../assets/images/backgrounds/gothic-end.png');
        // Modern backgrounds
        case 'modern-lobby':
          return require('../assets/images/backgrounds/modern-lobby.png');
        case 'modern-game':
          return require('../assets/images/backgrounds/modern-game.png');
        case 'modern-character':
          return require('../assets/images/backgrounds/modern-character.png');
        case 'modern-accusations':
          return require('../assets/images/backgrounds/modern-accusations.png');
        case 'modern-final':
          return require('../assets/images/backgrounds/modern-final.png');
        case 'modern-end':
          return require('../assets/images/backgrounds/modern-end.png');
        // Default fallbacks
        case 'default-lobby':
          return require('../assets/images/backgrounds/default-lobby.png');
        case 'default-game':
          return require('../assets/images/backgrounds/default-game.png');
        case 'default-character':
          return require('../assets/images/backgrounds/default-character.png');
        case 'default-accusations':
          return require('../assets/images/backgrounds/default-accusations.png');
        case 'default-final':
          return require('../assets/images/backgrounds/default-final.png');
        case 'default-end':
          return require('../assets/images/backgrounds/default-end.png');
        default:
          // console.log('[BackgroundWrapper] Background not found for key:', backgroundKey);
          return null;
      }
    } catch (error) {
              // console.log('[BackgroundWrapper] Background not found for key:', backgroundKey, error.message);
      return null;
    }
  };

  const backgroundSource = getBackgroundSource();

  if (backgroundSource) {
    return (
      <ImageBackground
        source={backgroundSource}
        style={[styles.background, style]}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { backgroundColor: `rgba(24, 26, 32, ${overlayOpacity})` }]}>
          {children}
        </View>
      </ImageBackground>
    );
  }

  // Fallback to gradient background when no image is available
  return (
    <View style={[styles.gradientBackground, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#181A20',
  },
});

export default BackgroundWrapper; 