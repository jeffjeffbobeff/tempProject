import { useMemo } from 'react';

/**
 * Get text size multiplier based on text size setting
 * @param {string} textSize - The text size setting ('small', 'medium', 'large')
 * @returns {number} - The multiplier value
 */
export const getTextSizeMultiplier = (textSize) => {
  switch (textSize) {
    case 'large': return 1.3;
    default: return 1.0; // medium and all others
  }
};

/**
 * Get dynamic font size based on text size setting
 * @param {number} baseSize - The base font size
 * @param {string} textSize - The text size setting
 * @returns {number} - The calculated font size
 */
export const getFontSize = (baseSize, textSize) => {
  return Math.round(baseSize * getTextSizeMultiplier(textSize));
};

/**
 * Create dynamic styles with text size applied
 * @param {string} textSize - The text size setting
 * @returns {object} - The dynamic styles object
 */
export const createDynamicStyles = (textSize) => {
  return {
    header: {
      color: '#fff',
      fontSize: getFontSize(32, textSize),
      fontWeight: 'bold',
      marginBottom: 32,
      textAlign: 'center',
    },
    title: {
      color: '#fff',
      fontSize: getFontSize(32, textSize),
      fontWeight: 'bold',
      marginBottom: 32,
      textAlign: 'center',
    },
    label: {
      color: '#fff',
      fontSize: getFontSize(18, textSize),
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      color: '#888',
      fontSize: getFontSize(16, textSize),
      marginTop: 16,
      textAlign: 'center',
    },
    input: {
      width: 250,
      padding: 14,
      borderRadius: 8,
      backgroundColor: '#23242a',
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#333',
    },
    buttonText: {
      color: '#fff',
      fontSize: getFontSize(18, textSize),
      fontWeight: '600',
      letterSpacing: 1,
      textAlign: 'center',
    },
    error: {
      color: '#ff6b6b',
      marginBottom: 8,
      fontSize: getFontSize(14, textSize),
    },
    gameCode: {
      color: '#4CAF50',
      fontSize: getFontSize(24, textSize),
      fontWeight: 'bold',
      letterSpacing: 2,
      textAlign: 'center',
    },
    gameCodeLabel: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
    },
    copyHint: {
      color: '#888',
      fontSize: getFontSize(12, textSize),
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
    },
    debugText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      marginTop: 20,
    },
    playerText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      fontWeight: '600',
    },
    playerStatus: {
      color: '#888',
      fontSize: getFontSize(14, textSize),
    },
    readyStatus: {
      color: '#ff6b6b',
      fontSize: getFontSize(14, textSize),
      fontWeight: '600',
    },
    simulatedTag: {
      color: '#FFA500',
      fontSize: getFontSize(12, textSize),
      fontWeight: 'bold',
    },
    characterName: {
      color: '#000',
      fontSize: getFontSize(16, textSize),
      fontWeight: 'bold',
      marginBottom: 2,
    },
    characterDescription: {
      color: '#666',
      fontSize: getFontSize(14, textSize),
      fontStyle: 'italic',
    },
    characterNameWhite: {
      color: '#ffffff',
      fontSize: getFontSize(16, textSize),
      fontWeight: 'bold',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    gameTitle: {
      color: '#fff',
      fontSize: getFontSize(18, textSize),
      fontWeight: 'bold',
      marginBottom: 8,
    },
    gameDescription: {
      color: '#888',
      fontSize: getFontSize(14, textSize),
      marginBottom: 8,
    },
    comingSoonText: {
      color: '#fff',
      fontSize: getFontSize(12, textSize),
      fontWeight: 'bold',
    },
    checkmark: {
      color: '#4CAF50',
      fontSize: getFontSize(18, textSize),
      fontWeight: 'bold',
    },
    detailsButtonTextSmall: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      fontWeight: '600',
    },
    modalTitle: {
      color: '#000',
      fontSize: getFontSize(24, textSize),
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    modalCloseButtonText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      fontWeight: '600',
    },
    helpSectionTitle: {
      color: '#000',
      fontSize: getFontSize(20, textSize),
      fontWeight: 'bold',
      marginBottom: 12,
    },
    helpSectionContent: {
      color: '#333',
      fontSize: getFontSize(16, textSize),
      lineHeight: getFontSize(24, textSize),
      marginBottom: 8,
    },
    textSizeOptionText: {
      color: '#000',
      fontSize: getFontSize(16, textSize),
      flex: 1,
    },
    textSizeOptionCheck: {
      color: '#4CAF50',
      fontSize: getFontSize(18, textSize),
      fontWeight: 'bold',
    },
    faqQuestion: {
      color: '#000',
      fontSize: getFontSize(16, textSize),
      fontWeight: 'bold',
      marginBottom: 8,
    },
    faqAnswer: {
      color: '#333',
      fontSize: getFontSize(14, textSize),
      lineHeight: getFontSize(20, textSize),
    },
    menuItemText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      fontWeight: '600',
      marginLeft: 12,
    },
    hamburgerIcon: {
      color: '#fff',
      fontSize: getFontSize(20, textSize),
      fontWeight: 'bold',
    },
    roundTitle: {
      color: '#fff',
      fontSize: getFontSize(24, textSize),
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    roundNumber: {
      color: '#4CAF50',
      fontSize: getFontSize(20, textSize),
      fontWeight: 'bold',
      marginBottom: 8,
    },
    scriptText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      lineHeight: getFontSize(24, textSize),
      marginBottom: 8,
      textAlign: 'justify',
    },
    accusationText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      marginBottom: 8,
    },
    accusationCount: {
      color: '#4CAF50',
      fontSize: getFontSize(14, textSize),
      fontWeight: 'bold',
    },
    finalStatementText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      lineHeight: getFontSize(24, textSize),
      marginBottom: 8,
      textAlign: 'justify',
    },
    gameEndTitle: {
      color: '#fff',
      fontSize: getFontSize(28, textSize),
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    gameEndText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      marginBottom: 8,
      textAlign: 'center',
    },
    testTitle: {
      color: '#fff',
      fontSize: getFontSize(18, textSize),
      fontWeight: 'bold',
      marginBottom: 12,
    },
    testButtonText: {
      color: '#fff',
      fontSize: getFontSize(14, textSize),
      fontWeight: '600',
    },
    selectedText: {
      color: '#fff',
      fontSize: getFontSize(14, textSize),
      fontWeight: 'bold',
      marginTop: 8,
    },
    collapsibleHeaderText: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      fontWeight: '600',
    },
    collapsibleArrow: {
      color: '#888',
      fontSize: getFontSize(14, textSize),
    },
    showPlayerStatus: {
      color: '#fff',
      fontSize: getFontSize(16, textSize),
      fontWeight: '600',
    },
    playButtonText: {
      color: '#fff',
      fontSize: getFontSize(18, textSize),
      fontWeight: '600',
    },
    smallButtonText: {
      color: '#fff',
      fontSize: getFontSize(12, textSize),
      fontWeight: '600',
    },
    readyStatusButtonText: {
      color: '#fff',
      fontSize: getFontSize(14, textSize),
      fontWeight: '600',
    },
    filterButtonText: {
      color: '#fff',
      fontSize: getFontSize(14, textSize),
      fontWeight: '600',
    },
    filterButtonTextActive: {
      color: '#fff',
      fontSize: getFontSize(14, textSize),
      fontWeight: 'bold',
    },
    statusBadgeText: {
      color: '#fff',
      fontSize: getFontSize(12, textSize),
      fontWeight: '600',
    },
    gameDetailLabel: {
      color: '#888',
      fontSize: getFontSize(14, textSize),
      fontWeight: '500',
    },
    gameDetailValue: {
      color: '#fff',
      fontSize: getFontSize(14, textSize),
      fontWeight: '600',
    },
    actionButtonText: {
      color: '#fff',
      fontSize: getFontSize(14, textSize),
      fontWeight: '600',
    },
  };
};

/**
 * React hook to create memoized dynamic styles
 * @param {string} textSize - The text size setting
 * @returns {object} - The memoized dynamic styles object
 */
export const useDynamicStyles = (textSize) => {
  return useMemo(() => createDynamicStyles(textSize), [textSize]);
}; 