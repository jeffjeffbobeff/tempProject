import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import faqData from '../faq.json';
import helpData from '../helpContent.json';

const HamburgerMenu = ({
  showMenu,
  setShowMenu,
  showTextSizeModal,
  setShowTextSizeModal,
  showHowToPlayModal,
  setShowHowToPlayModal,
  showHowToHostModal,
  setShowHowToHostModal,
  showFAQModal,
  setShowFAQModal,
  textSize,
  saveTextSize,
  goHome,
  firebaseService,
  styles,
  dynamicStyles,
}) => {
  const insets = useSafeAreaInsets();
  // Always place below the status bar/safe area
  const hamburgerButtonStyle = {
    position: 'absolute',
    top: (insets.top || StatusBar.currentHeight || 0) + 4,
    right: 15,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <>
      {/* Hamburger Button (always visible, top right) */}
      <TouchableOpacity
        style={hamburgerButtonStyle}
        activeOpacity={0.8}
        onPress={() => setShowMenu(true)}
      >
        <Text style={dynamicStyles && dynamicStyles.hamburgerIcon ? dynamicStyles.hamburgerIcon : styles.hamburgerIcon}>☰</Text>
      </TouchableOpacity>

      {/* Hamburger Menu Overlay */}
      {showMenu && (
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuContent, { 
            top: Platform.OS === 'ios' ? 100 : StatusBar.currentHeight + 60, 
            right: 20 
          }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowTextSizeModal(true); }}>
              <Text style={dynamicStyles && dynamicStyles.menuItemText ? dynamicStyles.menuItemText : styles.menuItemText}>Adjust Text Size</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowHowToPlayModal(true); }}>
              <Text style={dynamicStyles && dynamicStyles.menuItemText ? dynamicStyles.menuItemText : styles.menuItemText}>How to Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowHowToHostModal(true); }}>
              <Text style={dynamicStyles && dynamicStyles.menuItemText ? dynamicStyles.menuItemText : styles.menuItemText}>How to Host</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowFAQModal(true); }}>
              <Text style={dynamicStyles && dynamicStyles.menuItemText ? dynamicStyles.menuItemText : styles.menuItemText}>FAQs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => { setShowMenu(false); goHome(); }}>
              <Text style={dynamicStyles && dynamicStyles.menuItemText ? dynamicStyles.menuItemText : styles.menuItemText}>Home</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Text Size Modal */}
      <Modal visible={showTextSizeModal} transparent animationType="slide" onRequestClose={() => setShowTextSizeModal(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.helpModalContent}>
            <Text style={dynamicStyles && dynamicStyles.modalTitle ? dynamicStyles.modalTitle : styles.modalTitle}>Adjust Text Size</Text>
            {[['medium', 'Medium (Default)'], ['large', 'Large']].map(([size, label]) => (
              <TouchableOpacity
                key={size}
                style={[styles.textSizeOption, textSize === size && styles.textSizeOptionSelected]}
                onPress={() => saveTextSize(size)}
              >
                <Text style={dynamicStyles && dynamicStyles.textSizeOptionText ? dynamicStyles.textSizeOptionText : styles.textSizeOptionText}>{label}</Text>
                {textSize === size && <Text style={dynamicStyles && dynamicStyles.textSizeOptionCheck ? dynamicStyles.textSizeOptionCheck : styles.textSizeOptionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowTextSizeModal(false)}>
              <Text style={dynamicStyles && dynamicStyles.modalCloseButtonText ? dynamicStyles.modalCloseButtonText : styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* How to Play Modal */}
      <Modal visible={showHowToPlayModal} transparent animationType="slide" onRequestClose={() => setShowHowToPlayModal(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.helpModalContent}>
            <Text style={dynamicStyles && dynamicStyles.modalTitle ? dynamicStyles.modalTitle : styles.modalTitle}>{helpData.howToPlay.title}</Text>
            <ScrollView style={{ flex: 1 }}>
              {helpData.howToPlay.sections.map((section, idx) => (
                <View key={idx} style={styles.helpSection}>
                  <Text style={dynamicStyles && dynamicStyles.helpSectionTitle ? dynamicStyles.helpSectionTitle : styles.helpSectionTitle}>{section.title}</Text>
                  <Text style={dynamicStyles && dynamicStyles.helpSectionContent ? dynamicStyles.helpSectionContent : styles.helpSectionContent}>{section.content}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowHowToPlayModal(false)}>
              <Text style={dynamicStyles && dynamicStyles.modalCloseButtonText ? dynamicStyles.modalCloseButtonText : styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* How to Host Modal */}
      <Modal visible={showHowToHostModal} transparent animationType="slide" onRequestClose={() => setShowHowToHostModal(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.helpModalContent}>
            <Text style={dynamicStyles && dynamicStyles.modalTitle ? dynamicStyles.modalTitle : styles.modalTitle}>{helpData.howToHost.title}</Text>
            <ScrollView style={{ flex: 1 }}>
              {helpData.howToHost.sections.map((section, idx) => (
                <View key={idx} style={styles.helpSection}>
                  <Text style={dynamicStyles && dynamicStyles.helpSectionTitle ? dynamicStyles.helpSectionTitle : styles.helpSectionTitle}>{section.title}</Text>
                  <Text style={dynamicStyles && dynamicStyles.helpSectionContent ? dynamicStyles.helpSectionContent : styles.helpSectionContent}>{section.content}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowHowToHostModal(false)}>
              <Text style={dynamicStyles && dynamicStyles.modalCloseButtonText ? dynamicStyles.modalCloseButtonText : styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FAQ Modal */}
      <Modal visible={showFAQModal} transparent animationType="slide" onRequestClose={() => setShowFAQModal(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.helpModalContent}>
            <Text style={dynamicStyles && dynamicStyles.modalTitle ? dynamicStyles.modalTitle : styles.modalTitle}>FAQs</Text>
            <ScrollView style={{ flex: 1 }}>
              {faqData.faqs.map((faq, idx) => (
                <View key={idx} style={styles.faqItem}>
                  <Text style={dynamicStyles && dynamicStyles.faqQuestion ? dynamicStyles.faqQuestion : styles.faqQuestion}>{faq.question}</Text>
                  <Text style={dynamicStyles && dynamicStyles.faqAnswer ? dynamicStyles.faqAnswer : styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowFAQModal(false)}>
              <Text style={dynamicStyles && dynamicStyles.modalCloseButtonText ? dynamicStyles.modalCloseButtonText : styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default HamburgerMenu; 