import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from '../BackgroundWrapper';
import styles from '../../styles/AppStyles';

export default function OnboardingView({
  input,
  setInput,
  inputError,
  setInputError,
  handleOnboarding,
  dynamicStyles,
  isUsernameChange = false,
}) {
  return (
    <BackgroundWrapper view="home" overlayOpacity={0.7}>
      <SafeAreaView edges={['top','left','right']} style={{flex:1}}>
        <View style={[styles.container, { backgroundColor: 'transparent' }]}> 
          <StatusBar barStyle="light-content" backgroundColor="#181A20" />
          <KeyboardAvoidingView
            style={[styles.centered, { backgroundColor: 'transparent' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Text style={styles.header}>Murder Mystery Party</Text>
            <Text style={dynamicStyles.label}>
              {isUsernameChange ? 'Change your username:' : 'Enter your username:'}
            </Text>
            <TextInput
              style={dynamicStyles.input}
              placeholder="Username (max 30 characters)"
              placeholderTextColor="#888"
              value={input}
              onChangeText={text => {
                // Limit to 30 characters and only allow alphanumeric characters, spaces, and common punctuation
                const sanitizedText = text.slice(0, 30).replace(/[^a-zA-Z0-9\s\-_\.]/g, '');
                setInput(sanitizedText);
                setInputError('');
              }}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleOnboarding}
            />
            {inputError ? <Text style={dynamicStyles.error}>{inputError}</Text> : null}
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={handleOnboarding}
            >
                              <Text style={dynamicStyles.buttonText}>
                  {isUsernameChange ? 'Update Username' : 'Continue'}
                </Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
} 