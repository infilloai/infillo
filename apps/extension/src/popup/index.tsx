/**
 * Popup Component for InfilloAI Extension
 * Provides the main user interface for the extension popup
 */

import { createRoot } from 'react-dom/client';
import { PopupApp } from './PopupApp';

// Initialize the popup
const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
} else {
  console.error('Popup root element not found');
} 