import React, { useMemo } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

// Static mapping of background asset paths to require statements
// React Native requires static string literals for require() calls
// If any background is missing, the app will gracefully fall back to a black background
const BACKGROUND_ASSET_MAP = {
  '../assets/images/backgrounds/opera_murder_mystery_v1background.png': require('../assets/images/backgrounds/opera_murder_mystery_v1background.png'),
  '../assets/images/backgrounds/OldWestDark.png': require('../assets/images/backgrounds/OldWestDark.png'),
  '../assets/images/backgrounds/SpaceStation.png': require('../assets/images/backgrounds/SpaceStation.png'),
  '../assets/images/backgrounds/orient_express_v1background.png': require('../assets/images/backgrounds/shared-background.png'),
  '../assets/images/backgrounds/victorian_manor_v1background.png': require('../assets/images/backgrounds/shared-background.png'),
  // Add more mappings as needed for new scripts
  // If a mapping is missing, the app will fall back to black background
};

const BackgroundWrapper = ({ 
  children, 
  view = 'default',
  gameScriptId = null,
  backgroundAssetPath = null,
  overlayOpacity = 0.8,
  style = {} 
}) => {
  // Memoized background source calculation to prevent unnecessary re-renders
  const backgroundSource = useMemo(() => {
    try {
      let backgroundSource = null;
      
      // For views that don't depend on game script (home and game-selection)
      if (view === 'home' || view === 'game-selection') {
        try {
          backgroundSource = require('../assets/images/backgrounds/shared-background.png');
        } catch (error) {
          // Fallback to null
        }
      }
      // For game-specific views, use the provided background asset path if available
      else if (backgroundAssetPath) {
        backgroundSource = BACKGROUND_ASSET_MAP[backgroundAssetPath] || null;
      }
      // Fallback to game-specific background based on script ID (legacy support)
      if (!backgroundSource && gameScriptId) {
        try {
          switch (gameScriptId) {
            case 'opera_murder_mystery_v1':
              backgroundSource = require('../assets/images/backgrounds/opera_murder_mystery_v1background.png');
              break;
            case 'victorian_manor_v1':
              backgroundSource = require('../assets/images/backgrounds/shared-background.png');
              break;
            case 'orient_express_v1':
              backgroundSource = require('../assets/images/backgrounds/shared-background.png');
              break;
            default:
              backgroundSource = null;
          }
        } catch (error) {
          backgroundSource = null;
        }
      }
      // Fallback to shared background
      if (!backgroundSource) {
        try {
          backgroundSource = require('../assets/images/backgrounds/shared-background.png');
        } catch (error) {
          backgroundSource = null;
        }
      }
      
      return backgroundSource || null;
    } catch (error) {
      return null;
    }
  }, [view, gameScriptId, backgroundAssetPath]); // Only recalculate when these props change

  // Render with background image or fallback
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

  // Fallback to black background when no image is available
  return (
    <View style={[styles.blackBackground, style]}>
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
    alignItems: 'stretch',
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  blackBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default BackgroundWrapper; 