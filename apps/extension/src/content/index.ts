/**
 * Content Script for InfilloAI Extension
 * 
 * This script is the main entry point for the extension's functionality
 * on web pages. It is responsible for initializing the form detector
 * and the chat widget.
 */

console.log('🚀 InfilloAI Content Script v2.0 Loading...');

import { FormDetector } from './formDetector';
// import { ChatWidget } from './chatWidget';

// Set up message listeners immediately, before other initialization
console.log('📞 InfilloAI: Setting up message listeners...');
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('📞 InfilloAI: Received message:', message.type, 'with data:', message.data);
  
  switch (message.type) {
    case 'ORIGIN_BLOCK_STATUS_CHANGED':
      console.log('🔄 InfilloAI: Origin block status changed:', message.data);
      const { origin, isBlocked } = message.data;
      
      console.log('🔄 InfilloAI: Message details:', {
        messageType: message.type,
        messageData: message.data,
        currentOrigin: window.location.origin,
        messageOrigin: origin,
        newBlockedStatus: isBlocked,
        timestamp: new Date().toISOString()
      });
      
      // Verify this message applies to current origin
      if (origin !== window.location.origin) {
        console.log('🔄 InfilloAI: Status change is for different origin, ignoring:', {
          messageOrigin: origin,
          currentOrigin: window.location.origin
        });
        sendResponse({ success: true, ignored: true });
        break;
      }
      
      console.log('🔄 InfilloAI: Origin matches, checking if FormDetector is available...');
      
      // Check if FormDetector is available (it might not be initialized yet)
      if (typeof (window as any).infilloAIFormDetector === 'undefined') {
        console.warn('⚠️ InfilloAI: FormDetector not yet available, storing status for later');
        (window as any).infilloAIPendingBlockStatus = { origin, isBlocked };
        sendResponse({ success: true, deferred: true });
        break;
      }
      
      const formDetector = (window as any).infilloAIFormDetector;
      console.log('🔄 InfilloAI: Origin matches, applying status change...');
      
      // Check current form detector state before change
      console.log('🔄 InfilloAI: FormDetector state before change:', {
        isActive: formDetector.getIsActive(),
        hasFormsDetected: formDetector.hasFormsDetected(),
        detectedForm: formDetector.getDetectedForm()
      });
      
      if (isBlocked) {
        console.log('🚫 InfilloAI: Origin blocked, stopping form detection immediately');
        console.log('🚫 InfilloAI: Calling formDetector.stop()...');
        formDetector.stop();
        console.log('✅ InfilloAI: Form detection stopped due to origin block');
      } else {
        console.log('✅ InfilloAI: Origin unblocked, starting form detection immediately');
        console.log('✅ InfilloAI: Calling formDetector.start()...');
        formDetector.start();
        console.log('✅ InfilloAI: Form detection started due to origin unblock');
      }
      
      // Check current form detector state after change
      console.log('🔄 InfilloAI: FormDetector state after change:', {
        isActive: formDetector.getIsActive(),
        hasFormsDetected: formDetector.hasFormsDetected(),
        detectedForm: formDetector.getDetectedForm()
      });
      
      sendResponse({ 
        success: true, 
        origin, 
        isBlocked, 
        applied: true,
        formDetectorActive: formDetector.getIsActive(),
        timestamp: new Date().toISOString()
      });
      break;
    default:
      console.log('📞 InfilloAI: Unknown message type:', message.type);
      // Allows other listeners to handle the message
      return false; 
  }
  return true; // Indicates an async response
});

console.log('✅ InfilloAI: Message listeners set up successfully');

/**
 * Main initialization function for the content script.
 * We wrap the initialization in a function to control execution flow
 * and handle potential errors gracefully.
 */
async function initializeInfilloAI() {
  try {
    // Ensure we only initialize once
    if ((window as any).infilloAIInitialized) {
      console.log('InfilloAI: Already initialized. Skipping.');
      return;
    }
    (window as any).infilloAIInitialized = true;

    console.log('🔧 InfilloAI: Initializing services...');

    // Initialize the Form Detector first
    const formDetector = FormDetector.getInstance();
    
    // Store FormDetector globally for message handlers
    (window as any).infilloAIFormDetector = formDetector;
    
    // Check if there's a pending block status to apply
    if ((window as any).infilloAIPendingBlockStatus) {
      const { origin, isBlocked } = (window as any).infilloAIPendingBlockStatus;
      console.log('🔄 InfilloAI: Applying pending block status:', { origin, isBlocked });
      
      if (origin === window.location.origin) {
        if (isBlocked) {
          console.log('🚫 InfilloAI: Applying pending block - stopping form detection');
          // Don't start form detection at all
          (window as any).infilloAIPendingBlockStatus = null;
          return;
        } else {
          console.log('✅ InfilloAI: Applying pending unblock - will start form detection');
        }
      }
      (window as any).infilloAIPendingBlockStatus = null;
    }
    
    // Initialize Chat Widget (but don't start it yet)
    // const chatWidget = ChatWidget.getInstance({
    //   position: 'bottom-right',
    //   offset: { x: 20, y: 20 },
    // });

    // Set up callbacks for form detection
    // formDetector.onFormsDetected(() => {
    //   console.log('✅ InfilloAI: Forms detected - starting chat widget');
    //   chatWidget.start();
    // });

    // formDetector.onNoForms(() => {
    //   console.log('❌ InfilloAI: No forms detected - stopping chat widget');
    //   chatWidget.stop();
    // });

    // Check if current origin is blocked before starting form detection
    const currentOrigin = window.location.origin;
    console.log('🔍 InfilloAI: Checking if origin is blocked:', currentOrigin);
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_ORIGIN_BLOCKED',
        origin: currentOrigin
      });
      
      if (response?.success && response?.data?.isBlocked) {
        console.log('🚫 InfilloAI: Origin is blocked, skipping form detection:', currentOrigin);
        return;
      } else {
        console.log('✅ InfilloAI: Origin is not blocked, starting form detection');
        // Start form detection (this will trigger callbacks if forms are found)
        formDetector.start();
        console.log('✅ InfilloAI: Form Detector started.');
      }
    } catch (error) {
      console.warn('⚠️ InfilloAI: Could not check blocked status, starting form detection anyway:', error);
      // If we can't check blocked status, start form detection as fallback
      formDetector.start();
      console.log('✅ InfilloAI: Form Detector started (fallback).');
    }

    // Check initial state - if forms are already detected, start chat widget
    // if (formDetector.hasFormsDetected()) {
    //   console.log('✅ InfilloAI: Initial forms detected - starting chat widget');
    //   chatWidget.start();
    // }
    
    console.log('👍 InfilloAI: Content script fully initialized.');

  } catch (error) {
    console.error('❌ InfilloAI: Critical error during content script initialization:', error);
  }
}

/**
 * We need to be careful about when we inject our code.
 * Waiting for `document.readyState` to be `complete` is the most reliable
 * method to ensure the page's DOM is fully available.
 */
if (document.readyState === 'complete') {
  initializeInfilloAI();
} else {
  window.addEventListener('load', initializeInfilloAI, { once: true });
}

// Export for potential testing
export { initializeInfilloAI };

// Debug utilities for autofill data inspection
(window as any).InfilloAIDebug = {
  async viewAutofillData() {
    try {
      const result = await chrome.storage.local.get(null);
      const autofillData: Record<string, string[]> = {};
      
      Object.keys(result || {}).forEach(key => {
        if (key.startsWith('autofill_')) {
          const fieldType = key.replace('autofill_', '');
          autofillData[fieldType] = result[key];
        }
      });
      
      console.group('📋 InfilloAI Autofill Storage');
      if (Object.keys(autofillData).length === 0) {
        console.log('No autofill data stored yet. Fill out forms and accept suggestions to see data here.');
      } else {
        Object.entries(autofillData).forEach(([fieldType, values]) => {
          console.group(`🏷️ ${fieldType} (${values.length} entries)`);
          values.forEach((value: string, index: number) => {
            console.log(`${index + 1}. "${value}"`);
          });
          console.groupEnd();
        });
      }
      console.groupEnd();
      
      return autofillData;
    } catch (error) {
      console.error('Error viewing autofill data:', error);
      return {};
    }
  },

  async clearAutofillData() {
    try {
      const result = await chrome.storage.local.get(null);
      const autofillKeys = Object.keys(result || {}).filter(key => key.startsWith('autofill_'));
      
      await chrome.storage.local.remove(autofillKeys);
      console.log(`🗑️ Cleared ${autofillKeys.length} autofill data types`);
      return true;
    } catch (error) {
      console.error('Error clearing autofill data:', error);
      return false;
    }
  }
}; 