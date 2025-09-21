import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';

function truncateDescription(description, maxLength = 70) {
  if (!description) return '';
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength) + '...';
}

export default function GameSelectionView({ availableGameScripts = [], onBack, onLaunchGame, gameLoading = false, dynamicStyles, containerOnLayout, parentOnLayout, scrollViewRef }) {
  const backgroundProps = {
    view: 'game-selection',
    overlayOpacity: 0.7,
  };
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsScript, setDetailsScript] = useState(null);

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

  const handleSelect = (script) => {
    if (script.status === 'coming_soon') {
      setDetailsScript(script);
      setShowDetails(true);
    } else if (selectedScriptId === script.scriptId) {
      setSelectedScriptId(null);
    } else {
      setSelectedScriptId(script.scriptId);
    }
  };

  const handleShowDetails = (script) => {
    setDetailsScript(script);
    setShowDetails(true);
  };

  return (
    <BackgroundWrapper {...backgroundProps} style={{ flex: 1 }}>
      <SafeAreaView edges={['top','left','right']} style={{ flex: 1 }} {...panResponder.panHandlers}>
        <ScrollView ref={scrollViewRef} style={{ flex: 1 }} contentContainerStyle={{}} showsVerticalScrollIndicator={true}>
          <View style={{}} onLayout={parentOnLayout}>
            <Text
              style={[
                dynamicStyles && dynamicStyles.header ? dynamicStyles.header : styles.header,
                { flexWrap: 'wrap', width: '90%', alignSelf: 'center', paddingHorizontal: 60 }
              ]}
              numberOfLines={2}
              allowFontScaling
            >
              Choose Your Mystery
            </Text>
            <View style={styles.viewContainer} onLayout={containerOnLayout}>
              {availableGameScripts.length === 0 ? (
                <Text style={dynamicStyles && dynamicStyles.label ? dynamicStyles.label : styles.label}>No games available.</Text>
              ) : (
                availableGameScripts.map(script => (
                  <TouchableOpacity
                    key={script.scriptId}
                    style={[
                      styles.gameCard,
                      script.status === 'coming_soon' && styles.comingSoonCard,
                      selectedScriptId === script.scriptId && styles.selectedGameCard
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelect(script)}
                    disabled={gameLoading}
                  >
                    <View style={styles.gameCardHeader}>
                      <Text style={dynamicStyles && dynamicStyles.gameTitle ? dynamicStyles.gameTitle : styles.gameTitle}>{script.title}</Text>
                      {selectedScriptId === script.scriptId && (
                        <Text style={dynamicStyles && dynamicStyles.checkmark ? dynamicStyles.checkmark : styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={dynamicStyles && dynamicStyles.gameDescription ? dynamicStyles.gameDescription : styles.gameDescription}>
                      {truncateDescription(script.description)}
                    </Text>
                    {selectedScriptId === script.scriptId && script.status !== 'coming_soon' ? (
                      <TouchableOpacity
                        style={[styles.button, styles.launchButton]}
                        activeOpacity={0.8}
                        onPress={() => onLaunchGame && onLaunchGame(script.scriptId)}
                        disabled={gameLoading}
                      >
                        <Text style={dynamicStyles && dynamicStyles.buttonText ? dynamicStyles.buttonText : styles.buttonText}>
                          {gameLoading ? 'Launching...' : 'Launch Game'}
                        </Text>
                        {gameLoading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.comingSoonBadge}>
                        <TouchableOpacity
                          style={{width: '100%', alignItems: 'center'}}
                          activeOpacity={0.8}
                          onPress={() => handleShowDetails(script)}
                          disabled={gameLoading}
                        >
                          <Text style={dynamicStyles && dynamicStyles.comingSoonText ? dynamicStyles.comingSoonText : styles.comingSoonText}>
                            {script.status === 'coming_soon' ? 'Coming Soon' : 'Details'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>
        {/* Game Details Modal */}
        <Modal
          visible={showDetails}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDetails(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseX}
                onPress={() => setShowDetails(false)}
              >
                <Text style={styles.modalCloseXText}>✕</Text>
              </TouchableOpacity>

              {/* Content */}
              <ScrollView showsVerticalScrollIndicator={true}>
                {detailsScript ? (
                  <View>
                    <Text style={styles.modalTitle}>
                      {detailsScript.title}
                    </Text>
                    
                    <Text style={styles.modalDescription}>
                      {detailsScript.description}
                    </Text>

                    <View style={{ marginTop: 20, marginBottom: 15 }}>
                      <Text style={{ color: '#fff', fontSize: 16, marginBottom: 5 }}>
                        Duration: {detailsScript.estimatedDuration} minutes
                      </Text>
                    </View>

                    <View style={{ marginBottom: 15 }}>
                      <Text style={{ color: '#fff', fontSize: 16, marginBottom: 5 }}>
                        Setting: {detailsScript.setting}
                      </Text>
                    </View>

                    <View style={{ marginBottom: 15 }}>
                      <Text style={{ color: '#fff', fontSize: 16, marginBottom: 5 }}>
                        Time Period: {detailsScript.timePeriod}
                      </Text>
                    </View>

                    <View style={{ marginBottom: 15 }}>
                      <Text style={{ color: '#fff', fontSize: 16, marginBottom: 5 }}>
                        Difficulty: {detailsScript.difficulty}
                      </Text>
                    </View>

                    <View style={{ marginBottom: 15 }}>
                      <Text style={{ color: '#fff', fontSize: 16, marginBottom: 5 }}>
                        Players: {detailsScript.maxPlayers}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.modalTitle}>
                    No game details available
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </BackgroundWrapper>
  );
} 