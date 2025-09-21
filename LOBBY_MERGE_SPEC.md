# Lobby + Character Selection Merge Implementation

## Overview
Merge the current Character Selection view with the Lobby view to create a unified experience where hosts can preview characters, customize invitations, and manage players all in one place.

## Current State Analysis
- **Character Selection View**: Separate screen for choosing characters
- **Lobby View**: Shows game code, player list, ready states
- **Game Code Generation**: Already exists and working
- **Share Functionality**: Already exists (click to copy)

## Implementation Plan

### Phase 1: New Lobby Structure ✅
- [ ] Merge Character Selection into Lobby
- [ ] Create unified layout with sections:
  - [ ] Invite Settings (top)
  - [ ] Character Selection (middle) 
  - [ ] Player Management (bottom)

### Phase 2: Invite Settings Section ✅
- [ ] **Date Picker**: Select event date
- [ ] **Time Picker**: Select event time (default PM)
- [ ] **Location**: Free text input (254 char limit)
- [ ] **Accents**: Picker (Encouraged, Optional, Mandatory, Forbidden)
- [ ] **Costumes**: Picker (Encouraged, Optional, Mandatory, Forbidden)
- [ ] **Instructions**: "Enter details to customize your invitations"
- [ ] **General Invite Button**: Copy invitation without character details
- [ ] **Storage**: Local only (not Firebase)

### Phase 3: Enhanced Character Selection ✅
- [ ] **Current Character Display**: Show selected character prominently
- [ ] **Character Details Modal**: 
  - [ ] Character Name
  - [ ] Character Description
  - [ ] "Details" button next to "Play"
- [ ] **Character Switching**: Choose from available characters
- [ ] **Virtual Player Toggle**: Under character buttons (replace "Add Virtual Player")
- [ ] **Remove**: "Add Virtual Player" buttons

### Phase 4: Host-Specific Features ✅
- [ ] **Invite Button**: After "Details" and "Play"
- [ ] **Character-Specific Invites**: Include selected character details
- [ ] **Virtual Player Management**: Toggle to set characters as virtual
- [ ] **Start Game Logic**: Require all players assigned (real or virtual)

### Phase 5: Invitation Generation ✅
- [ ] **Template Structure**:
  ```
  Join my murder mystery party! – [GameScript Title]
  – [GameScript Intro]
  – Your Character: [Selected Character Name]: [Character Description]
  – [Time] [Date]
  – [Location]
  – Accents: [Accent Setting]
  – Costumes: [Costume Setting]
  – To play, you must download the free App
  – Android: [placeholder Play Store link]
  – Apple: [placeholder App Store link]
  – Game Code: [Generated Game Code]
  ```

## Technical Implementation

### New Components Needed
- [ ] `InviteSettingsSection.js` - Host invite customization
- [ ] `CharacterDetailsModal.js` - Character information popup
- [ ] `InvitationGenerator.js` - Generate invitation text
- [ ] `UnifiedLobbyView.js` - Main merged view

### Modified Components
- [ ] `LobbyView.js` - Merge with character selection
- [ ] `CharacterSelectionView.js` - Integrate into lobby
- [ ] `App.tsx` - Update navigation logic

### New State Management
- [ ] Invite settings (local storage)
- [ ] Selected character for host
- [ ] Character details modal state
- [ ] Invitation generation state

## File Structure Changes
```
TempProject/
├── components/
│   └── views/
│       ├── UnifiedLobbyView.js (NEW)
│       ├── InviteSettingsSection.js (NEW)
│       ├── CharacterDetailsModal.js (NEW)
│       └── InvitationGenerator.js (NEW)
├── utils/
│   └── invitationUtils.js (NEW)
└── constants/
    └── InviteSettings.js (NEW)
```

## User Flow
1. **Host creates game** → Goes to unified lobby
2. **Host sets invite settings** → Customizes invitation details
3. **Host selects character** → Chooses their character
4. **Host generates invite** → Creates character-specific invitation
5. **Players join** → See character selection in lobby
6. **Players select characters** → Choose from available characters
7. **Host starts game** → All players must be assigned

## Success Criteria
- [ ] Single unified lobby view
- [ ] Host can customize invitations
- [ ] Character details easily accessible
- [ ] Virtual player management simplified
- [ ] Invitation generation working
- [ ] All existing functionality preserved

## Notes
- **Local Storage**: Invite settings stored locally only
- **Character Details**: Enhanced with modal for better UX
- **Virtual Players**: Simplified toggle system
- **Invitations**: Rich, detailed invitations with all game info
- **Backward Compatibility**: All existing game logic preserved

## Dependencies
- React Native date/time pickers
- Local storage for invite settings
- Modal components for character details
- Share functionality (existing)

---

**Status**: Planning Phase
**Last Updated**: [Current Date]
**Next Steps**: Begin Phase 1 - New Lobby Structure
