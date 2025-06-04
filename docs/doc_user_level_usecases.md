# User-Level Use Cases

## Use Case 1: Submit New Message
**Primary Actor:** User  
**Level:** User Goal  
**Stakeholders and Interests:**
- User: Wants to send a message and receive an AI response quickly and accurately
- System: Needs to process user input and generate appropriate responses

**Preconditions:** User is in composer mode with text entered  
**Success Guarantee:** Message is sent and AI response is received  
**Main Success Scenario:**
1. User clicks "Save & Submit" button
2. System adds user message to chat
3. System submits conversation to AI service
4. System streams AI response back to user
5. System completes response and updates UI

**Extensions:**
- 2a. User prefers keyboard shortcuts:
  - 2a1. If "Enter to Submit" is enabled, user presses Enter
  - 2a2. If "Enter to Submit" is disabled, user presses Ctrl+Enter or Shift+Enter
- 3a. Storage quota exceeded:
  - 3a1. System displays storage quota error
  - 3a2. Use case ends in failure
- 4a. User decides to stop generation:
  - 4a1. User clicks "Stop Generation"
  - 4a2. System aborts the request
  - 4a3. Use case ends in alternative success

## Use Case 2: Save Draft Message
**Primary Actor:** User  
**Level:** User Goal  
**Preconditions:** User is in composer mode with text entered  
**Success Guarantee:** Message is saved as draft  
**Main Success Scenario:**
1. User clicks "Save" button
2. System stores draft content
3. UI remains in composer mode

**Extensions:**
- 1a. User prefers keyboard shortcuts:
  - 1a1. User presses Ctrl+Enter or Shift+Enter

## Use Case 3: Edit Existing Message
**Primary Actor:** User  
**Level:** User Goal  
**Preconditions:** User has selected an existing message  
**Success Guarantee:** Message is updated with new content  
**Main Success Scenario:**
1. User clicks "Save" button
2. System updates message content
3. System exits edit mode

**Extensions:**
- 1a. User prefers keyboard shortcuts:
  - 1a1. User presses Ctrl+Enter or Shift+Enter
- 1b. User decides to cancel:
  - 1b1. User clicks "Cancel" button or presses Escape
  - 1b2. System exits edit mode without saving
  - 1b3. Use case ends in alternative success

## Use Case 4: Edit and Regenerate Response
**Primary Actor:** User  
**Level:** User Goal  
**Preconditions:** User has edited an existing message  
**Success Guarantee:** Message is updated and subsequent AI responses are regenerated  
**Main Success Scenario:**
1. User clicks "Save & Submit" button
2. System displays confirmation modal
3. User confirms action
4. System updates message content
5. System removes subsequent messages
6. System triggers regeneration of AI response
7. System exits edit mode

**Extensions:**
- 2a. User cancels at confirmation:
  - 2a1. User clicks "Cancel" in modal
  - 2a2. System closes modal
  - 2a3. User remains in edit mode
  - 2a4. Use case ends without changes
- 3a. User prefers keyboard shortcuts:
  - 3a1. User presses Ctrl+Shift+Enter

## Use Case 5: Regenerate Last AI Response
**Primary Actor:** User  
**Level:** User Goal  
**Preconditions:** Chat has at least one AI response  
**Success Guarantee:** New AI response is generated while preserving the old one  
**Main Success Scenario:**
1. User clicks "Regenerate" button
2. System marks last message as outdated
3. System creates placeholder for new message
4. System submits conversation to AI service
5. System streams new AI response
6. System displays both old (dimmed) and new responses

**Extensions:**
- 5a. Error during generation:
  - 5a1. System displays error message
  - 5a2. Use case ends in failure