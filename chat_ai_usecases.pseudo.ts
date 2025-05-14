// Use Case 1: Submit New Message
function submitNewMessage() {
  if (userClickedSaveAndSubmit() || 
      (enterToSubmitEnabled && userPressedEnter()) ||
      (enterToSubmitDisabled && userPressedCtrlEnterOrShiftEnter())) {
    
    if (storageQuotaExceeded()) {
      displayError("Storage quota exceeded");
      return FAILURE;
    }
    
    addMessageToChat(userMessage);
    submitConversationToAI();
    
    while (aiGenerating) {
      if (userClickedStopGeneration()) {
        abortRequest();
        return ALTERNATIVE_SUCCESS;
      }
      streamResponseToUser();
    }
    
    completeResponseAndUpdateUI();
    return SUCCESS;
  }
}

// Use Case 2: Save Draft Message
function saveDraftMessage() {
  if (userClickedSave() || userPressedCtrlEnterOrShiftEnter()) {
    storeDraftContent();
    remainInComposerMode();
    return SUCCESS;
  }
}

// Use Case 3: Edit Existing Message
function editExistingMessage() {
  if (userClickedSave() || userPressedCtrlEnterOrShiftEnter()) {
    updateMessageContent();
    exitEditMode();
    return SUCCESS;
  }
  
  if (userClickedCancel() || userPressedEscape()) {
    exitEditMode();
    return ALTERNATIVE_SUCCESS;
  }
}

// Use Case 4: Edit and Regenerate Response
function editAndRegenerateResponse() {
  if (userClickedSaveAndSubmit()) {
    displayConfirmationModal();
    
    if (userConfirmsAction()) {
      updateMessageContent();
      removeSubsequentMessages();
      triggerAIResponseRegeneration();
      exitEditMode();
      return SUCCESS;
    } else {
      closeModal();
      remainInEditMode();
      return NO_CHANGES;
    }
  }
  
  if (userPressedCtrlShiftEnter()) {
    // Same actions as confirming above
    // ...
  }
}

// Use Case 5: Regenerate Last AI Response
function regenerateLastAIResponse() {
  if (userClickedRegenerate()) {
    markLastMessageAsOutdated();
    createPlaceholderForNewMessage();
    
    try {
      // Re-try AI response without editing the user message
      submitConversationToAI();
      streamNewAIResponse();
      displayBothResponses();
      return SUCCESS;
    } catch (error) {
      displayErrorMessage(error);
      return FAILURE;
    }
  }
}

// Main handler function to check mode and route to appropriate use case
function handleUserAction() {
  if (isComposingNewMessage()) {
    if (isDraftSaveRequest()) {
      return saveDraftMessage();
    } else {
      return submitNewMessage();
    }
  } else if (isEditingExistingMessage()) {
      return editExistingMessage();
  } else if (isViewingConversation()) {
    if (isRegenerateRequested()) {
      return regenerateLastAIResponse();
    }
  }
  
  return NO_ACTION;
}

// Helper functions to determine current mode
function isComposingNewMessage() {
  return currentMode === "COMPOSE_NEW";
}

function isEditingExistingMessage() {
  return currentMode === "EDIT_EXISTING";
}

function isViewingConversation() {
  return currentMode === "VIEW_CONVERSATION";
}

// Helper functions to determine requested action
function isDraftSaveRequest() {
  return userClickedSave() && !userClickedSaveAndSubmit();
}

function isRegenerateRequested() {
  // Regenerate is specifically for re-trying without editing
  return userClickedRegenerate();
}
