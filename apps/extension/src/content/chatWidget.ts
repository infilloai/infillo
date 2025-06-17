/**
 * Chat Widget Module for InfilloAI Extension
 * Provides a floating chat interface accessible from any webpage.
 */

import { ApiService } from '@/utils/apiService';
import { CSSIsolation } from '@/utils/cssIsolation';
import { ApiError } from '@/types/extension';

const LOG_PREFIX = '🔵 [ChatWidgetV2]';

export interface ChatWidgetConfig {
  position?: 'bottom-right' | 'bottom-left';
  offset?: { x: number; y: number };
}

// Interface for messages managed internally by the widget
export interface DisplayMessage {
  id: string; // Unique ID for the message element
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean; // Flag for assistant messages being streamed
}

export class ChatWidget {
  private static instance: ChatWidget | null = null;
  private isActive = false;
  private isOpen = false;
  private config: Required<ChatWidgetConfig>;
  
  // DOM Elements
  private widgetContainer: HTMLElement | null = null;
  private chatUiContainer: HTMLElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private messageInput: HTMLTextAreaElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private sendButton: HTMLButtonElement | null = null;

  // State Management
  private messages: DisplayMessage[] = [];
  private apiService: ApiService;
  private sessionId: string | null = null;
  private isStreaming = false;
  private streamConnection: { close: () => void } | null = null;


  private constructor(config: ChatWidgetConfig = {}) {
    console.log(`${LOG_PREFIX} Constructor called.`);
    this.config = {
      position: 'bottom-right',
      offset: { x: 20, y: 20 },
      ...config,
    };
    
    this.apiService = ApiService.getInstance();
  }

  static getInstance(config?: ChatWidgetConfig): ChatWidget {
    if (!ChatWidget.instance) {
      ChatWidget.instance = new ChatWidget(config);
    }
    return ChatWidget.instance;
  }

  start(): void {
    console.log(`${LOG_PREFIX} start() called.`);
    if (this.isActive) return;
    
    this.isActive = true;
    this.createWidget();
    this.setupEventListeners();
    console.log(`${LOG_PREFIX} Chat widget initialized and displayed successfully.`);
  }

  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.cleanup();
  }

  close(): void {
    console.log(`${LOG_PREFIX} close() called - closing entire chat widget`);
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove chat interface
    this.hideChatInterface();
    
    // Remove toggle button
    if (this.widgetContainer) {
      this.widgetContainer.remove();
      this.widgetContainer = null;
      this.toggleButton = null;
    }
    
    console.log(`${LOG_PREFIX} Chat widget completely closed and removed from DOM`);
  }

  private createWidget(): void {
    console.log(`${LOG_PREFIX} createWidget() - Creating toggle button (always visible).`);
    
    // First, create the toggle button (always visible)
    this.createToggleButton();
    
    // Chat interface will be created on-demand when toggle button is clicked
    console.log(`${LOG_PREFIX} Toggle button created. Chat interface will be created on demand.`);
  }

  private createToggleButton(): void {
    const toggleStyles = `
      :host {
        all: initial;
        position: fixed !important;
        z-index: 2147483647 !important;
        pointer-events: none;
        display: block !important;
        visibility: visible !important;
      }

      * {
        all: unset;
        display: revert;
        box-sizing: border-box;
      }

      .chat-toggle-button {
        width: 60px !important;
        height: 60px !important;
        background: #4F39F6 !important;
        border-radius: 50% !important;
        border: none !important;
        cursor: pointer !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.2s ease !important;
        pointer-events: all !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }

      .chat-toggle-button:hover {
        transform: scale(1.1) !important;
      }

      .chat-toggle-button::after {
        content: '';
        display: block !important;
        width: 32px !important;
        height: 32px !important;
        background-image: url('data:image/svg+xml;utf8,<svg width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(%23clip0_164_11149)"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.1375 4.86621C11.4605 4.86621 10.7901 4.99918 10.1647 5.25753C9.53928 5.51586 8.97096 5.89455 8.4923 6.37188C8.0136 6.84927 7.63389 7.41597 7.37481 8.03967C7.19323 8.47681 7.07344 8.93598 7.01801 9.40394C6.97444 9.77173 6.77294 10.1114 6.44153 10.2767L5.46127 10.7654C5.12986 10.9307 4.91242 11.2704 4.95598 11.6381C5.01141 12.1062 5.13122 12.5653 5.3128 13.0024C5.57189 13.6261 5.9516 14.1928 6.43025 14.6702C6.90895 15.1475 7.47727 15.5262 8.10268 15.7846C8.72814 16.0429 9.39848 16.1759 10.0754 16.1759C10.7524 16.1759 11.4227 16.0429 12.0482 15.7846C12.6736 15.5262 13.2419 15.1475 13.7206 14.6702C14.1993 14.1928 14.579 13.6261 14.8381 13.0024C15.0196 12.5653 15.1394 12.1062 15.1949 11.6381C15.2384 11.2704 15.4399 10.9307 15.7714 10.7654L16.7516 10.2767C17.083 10.1114 17.3005 9.77173 17.2569 9.40394C17.2015 8.93598 17.0816 8.47681 16.9001 8.03967C16.641 7.41597 16.2613 6.84927 15.7826 6.37188C15.3039 5.89455 14.7357 5.51586 14.1102 5.25753C13.4847 4.99918 12.8144 4.86621 12.1375 4.86621ZM14.5188 9.02335C14.5707 9.14842 14.6126 9.27711 14.644 9.40814C14.7306 9.76827 14.5055 10.1114 14.1741 10.2767L13.1939 10.7654C12.8624 10.9307 12.6685 11.2738 12.582 11.6339C12.5505 11.765 12.5087 11.8937 12.4568 12.0188C12.3272 12.3306 12.1374 12.614 11.898 12.8527C11.6587 13.0913 11.3745 13.2807 11.0618 13.4099C10.7491 13.539 10.4139 13.6055 10.0754 13.6055C9.73697 13.6055 9.4018 13.539 9.08905 13.4099C8.77634 13.2807 8.49221 13.0913 8.25285 12.8527C8.0135 12.614 7.82362 12.3306 7.69411 12.0188C7.64214 11.8937 7.60034 11.765 7.56884 11.6339C7.48235 11.2738 7.70739 10.9307 8.0388 10.7654L9.01901 10.2767C9.35047 10.1114 9.54435 9.76827 9.63085 9.40814C9.66234 9.27711 9.7042 9.14842 9.75611 9.02335C9.88568 8.71148 10.0755 8.42812 10.3149 8.18946C10.5542 7.95074 10.8383 7.76145 11.1511 7.63227C11.4638 7.5031 11.799 7.43658 12.1375 7.43658C12.476 7.43658 12.8111 7.5031 13.1238 7.63227C13.4365 7.76145 13.7207 7.95074 13.96 8.18946C14.1994 8.42812 14.3892 8.71148 14.5188 9.02335Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.1373 0.754883C10.9187 0.754883 9.71211 0.994226 8.58631 1.45925C7.46052 1.92428 6.43762 2.60588 5.57594 3.46513C4.71432 4.32439 4.03083 5.34447 3.56451 6.46712C3.17562 7.40338 2.94412 8.39576 2.87797 9.40424C2.85373 9.77384 2.64872 10.1127 2.31728 10.2779L1.33707 10.7667C1.00563 10.932 0.791713 11.2709 0.815954 11.6404C0.882106 12.6489 1.1136 13.6413 1.50249 14.5775C1.96881 15.7002 2.6523 16.7203 3.51395 17.5795C4.37558 18.4388 5.39851 19.1204 6.52431 19.5854C7.65006 20.0504 8.85668 20.2898 10.0752 20.2898C11.2938 20.2898 12.5004 20.0504 13.6262 19.5854C14.752 19.1204 15.7749 18.4388 16.6365 17.5795C17.4982 16.7203 18.1817 15.7002 18.648 14.5775C19.0369 13.6413 19.2684 12.6489 19.3345 11.6404C19.3588 11.2709 19.5637 10.932 19.8952 10.7667L20.8754 10.2779C21.2069 10.1127 21.4208 9.77384 21.3966 9.40424C21.3304 8.39576 21.0989 7.40338 20.71 6.46712C20.2437 5.34447 19.5602 4.32439 18.6985 3.46513C17.8369 2.60588 16.814 1.92428 15.6882 1.45925C14.5624 0.994226 13.3558 0.754883 12.1373 0.754883ZM16.7494 11.64C16.783 11.2711 16.9863 10.932 17.3177 10.7667L18.2979 10.2779C18.6293 10.1127 18.845 9.7735 18.8114 9.40468C18.7504 8.73395 18.588 8.07509 18.3287 7.4508C17.9919 6.63996 17.4983 5.90325 16.8759 5.28267C16.2537 4.66209 15.5149 4.16983 14.7018 3.83397C13.8888 3.49812 13.0173 3.32526 12.1373 3.32526C11.2572 3.32526 10.3858 3.49812 9.57268 3.83397C8.75959 4.16983 8.02083 4.66209 7.39854 5.28267C6.77626 5.90325 6.28261 6.63996 5.94583 7.4508C5.68651 8.07509 5.52408 8.73395 5.46308 9.40468C5.42953 9.7735 5.22624 10.1127 4.8948 10.2779L3.91459 10.7667C3.58315 10.932 3.36753 11.2711 3.40107 11.64C3.46207 12.3107 3.62449 12.9696 3.88381 13.5939C4.2206 14.4047 4.71423 15.1414 5.33652 15.762C5.95882 16.3825 6.69758 16.8748 7.51067 17.2107C8.32372 17.5465 9.19517 17.7194 10.0752 17.7194C10.9553 17.7194 11.8268 17.5465 12.6398 17.2107C13.4529 16.8748 14.1917 16.3825 14.8139 15.762C15.4363 15.1414 15.9299 14.4047 16.2667 13.5939C16.526 12.9696 16.6884 12.3107 16.7494 11.64Z" fill="white"/><path d="M21.4138 9.79883H18.8353C18.8342 9.93025 18.7571 10.0491 18.6386 10.1082L16.9772 10.9365C16.8588 10.9956 16.7832 11.1145 16.7739 11.2459H19.3523C19.3605 11.1144 19.4363 10.9956 19.5548 10.9365L21.2161 10.1082C21.3345 10.0491 21.4115 9.9303 21.4138 9.79883Z" fill="white"/><path d="M0.798828 11.2459H3.37726C3.37839 11.1145 3.45557 10.9956 3.57402 10.9365L5.23537 10.1082C5.35382 10.0491 5.4294 9.93025 5.43872 9.79883H2.86027C2.8521 9.9303 2.77629 10.0491 2.65785 10.1082L0.996496 10.9365C0.878052 10.9956 0.801097 11.1144 0.798828 11.2459Z" fill="white"/><path d="M6.98639 9.79883C6.97585 9.93025 6.90049 10.0491 6.78206 10.1082L5.1207 10.9365C5.00224 10.9956 4.92482 11.1145 4.92493 11.2459H7.50675C7.50124 11.1147 7.57972 10.9956 7.6982 10.9365L9.35954 10.1082C9.47807 10.0491 9.55245 9.92996 9.56817 9.79883H6.98639Z" fill="white"/><path d="M14.7062 9.79883C14.7117 9.92996 14.6333 10.0491 14.5148 10.1082L12.8534 10.9365C12.7349 10.9956 12.6605 11.1147 12.6448 11.2459H15.2266C15.2371 11.1145 15.3125 10.9956 15.4309 10.9365L17.0923 10.1082C17.2107 10.0491 17.2881 9.93025 17.288 9.79883H14.7062Z" fill="white"/></g><defs><clipPath id="clip0_164_11149"><rect width="21" height="20.0233" fill="white" transform="translate(0.5 0.5)"/></clipPath></defs></svg>') !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        pointer-events: none !important;
      }
    `;

    console.log(`${LOG_PREFIX} Creating toggle button using CSSIsolation...`);
    const { container, shadowRoot } = CSSIsolation.createIsolatedContainer({
      id: `infilloai-toggle-button-${Date.now()}`,
      styles: toggleStyles
    });

    const toggleButton = document.createElement('button');
    toggleButton.className = 'chat-toggle-button';
    toggleButton.title = 'Chat with InfilloAI';

    shadowRoot.appendChild(toggleButton);

    // Store references
    this.widgetContainer = container;
    this.toggleButton = toggleButton;

    // Position the toggle button
    this.positionToggleButton();
    
    // Add to page
    document.body.appendChild(container);
    console.log(`${LOG_PREFIX} Toggle button added to body`);

    // Force immediate visibility
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
  }

  private createChatInterface(): void {
    if (this.chatUiContainer) return; // Already created

    console.log(`${LOG_PREFIX} Creating chat interface...`);
    
    const chatStyles = `
      :host {
        all: initial;
        position: fixed !important;
        z-index: 2147483648 !important;
        pointer-events: none;
        display: block !important;
        visibility: visible !important;
      }

      * {
        all: unset;
        display: revert;
        box-sizing: border-box;
      }

      .chat-interface {
        background: white !important;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        border: 1px solid #e5e7eb;
        width: 370px;
        height: 600px;
        pointer-events: all;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
        transition: all 0.3s ease;
        position: relative;
        display: flex !important;
        flex-direction: column !important;
        visibility: visible !important;
        overflow: hidden;
      }

      .chat-interface * {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .chat-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0;
        background: white;
      }

      .chat-header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .chat-header-logo {
        width: 28px;
        height: 26px;
        background-image: url('data:image/svg+xml;utf8,<svg width="34" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(%23clip0_131_3793)"><path fill-rule="evenodd" clip-rule="evenodd" d="M18.6038 6.97964C17.5219 6.97964 16.4506 7.19215 15.451 7.60503C14.4515 8.01788 13.5433 8.62307 12.7783 9.38592C12.0133 10.1488 11.4065 11.0545 10.9924 12.0513C10.7022 12.7499 10.5108 13.4837 10.4222 14.2316C10.3526 14.8194 10.0305 15.3622 9.5009 15.6263L7.9343 16.4074C7.40465 16.6715 7.05716 17.2144 7.12678 17.8022C7.21536 18.5501 7.40684 19.2838 7.69702 19.9824C8.11108 20.9792 8.71791 21.8849 9.48287 22.6478C10.2479 23.4107 11.1562 24.0159 12.1556 24.4287C13.1552 24.8416 14.2265 25.0541 15.3083 25.0541C16.3903 25.0541 17.4616 24.8416 18.4611 24.4287C19.4606 24.0159 20.3689 23.4107 21.1339 22.6478C21.8989 21.8849 22.5057 20.9792 22.9197 19.9824C23.2099 19.2838 23.4014 18.5501 23.49 17.8022C23.5596 17.2144 23.8816 16.6715 24.4113 16.4074L25.9779 15.6263C26.5075 15.3622 26.855 14.8194 26.7854 14.2316C26.6968 13.4837 26.5053 12.7499 26.2151 12.0513C25.8011 11.0545 25.1942 10.1488 24.4293 9.38592C23.6643 8.62307 22.7561 8.01788 21.7565 7.60503C20.7569 7.19215 19.6856 6.97964 18.6038 6.97964ZM22.4095 13.6233C22.4925 13.8232 22.5594 14.0289 22.6097 14.2383C22.748 14.8138 22.3882 15.3622 21.8586 15.6263L20.2921 16.4074C19.7624 16.6715 19.4525 17.2199 19.3143 17.7954C19.2639 18.0049 19.1971 18.2105 19.1141 18.4105C18.907 18.9088 18.6036 19.3616 18.2211 19.7431C17.8386 20.1246 17.3845 20.4272 16.8848 20.6336C16.385 20.84 15.8493 20.9463 15.3083 20.9463C14.7675 20.9463 14.2318 20.84 13.732 20.6336C13.2323 20.4272 12.7782 20.1246 12.3956 19.7431C12.0131 19.3616 11.7097 18.9088 11.5027 18.4105C11.4196 18.2105 11.3528 18.0049 11.3025 17.7954C11.1643 17.2199 11.5239 16.6715 12.0536 16.4074L13.6201 15.6263C14.1498 15.3622 14.4596 14.8138 14.5979 14.2383C14.6482 14.0289 14.7151 13.8232 14.7981 13.6233C15.0051 13.1249 15.3085 12.6721 15.691 12.2907C16.0735 11.9092 16.5276 11.6066 17.0274 11.4002C17.5272 11.1938 18.0628 11.0875 18.6038 11.0875C19.1448 11.0875 19.6804 11.1938 20.1802 11.4002C20.6799 11.6066 21.134 11.9092 21.5165 12.2907C21.899 12.6721 22.2025 13.1249 22.4095 13.6233Z" fill="%234F39F6"/><path fill-rule="evenodd" clip-rule="evenodd" d="M18.6039 0.407104C16.6565 0.407104 14.7281 0.789609 12.9289 1.53279C11.1298 2.27596 9.49502 3.36526 8.11793 4.73846C6.74094 6.11168 5.64862 7.74191 4.90338 9.53607C4.28187 11.0323 3.91191 12.6183 3.80619 14.23C3.76745 14.8207 3.43982 15.3622 2.91013 15.6263L1.34361 16.4074C0.81392 16.6715 0.472056 17.2131 0.510796 17.8037C0.616517 19.4155 0.986478 21.0014 1.60798 22.4976C2.35322 24.2918 3.44554 25.922 4.82257 27.2953C6.19959 28.6685 7.83438 29.7577 9.63356 30.5009C11.4327 31.2441 13.361 31.6266 15.3084 31.6266C17.2559 31.6266 19.1842 31.2441 20.9833 30.5009C22.7825 29.7577 24.4173 28.6685 25.7943 27.2953C27.1714 25.922 28.2636 24.2918 29.0089 22.4976C29.6304 21.0014 30.0004 19.4155 30.1061 17.8037C30.1449 17.2131 30.4724 16.6715 31.0021 16.4074L32.5687 15.6263C33.0984 15.3622 33.4402 14.8207 33.4015 14.23C33.2958 12.6183 32.9258 11.0323 32.3043 9.53607C31.559 7.74191 30.4667 6.11168 29.0897 4.73846C27.7127 3.36526 26.0779 2.27596 24.2788 1.53279C22.4796 0.789609 20.5513 0.407104 18.6039 0.407104ZM25.9747 17.8031C26.0283 17.2136 26.3532 16.6715 26.8829 16.4074L28.4494 15.6263C28.9791 15.3622 29.3237 14.8201 29.2701 14.2307C29.1726 13.1588 28.913 12.1058 28.4986 11.1081C27.9603 9.81229 27.1715 8.63492 26.1769 7.64314C25.1824 6.65138 24.0018 5.86467 22.7024 5.32793C21.403 4.79119 20.0103 4.51493 18.6039 4.51493C17.1973 4.51493 15.8047 4.79119 14.5053 5.32793C13.2059 5.86467 12.0252 6.65138 11.0307 7.64314C10.0362 8.63492 9.24729 9.81229 8.70907 11.1081C8.29463 12.1058 8.03504 13.1588 7.93756 14.2307C7.88394 14.8201 7.55906 15.3622 7.02937 15.6263L5.46285 16.4074C4.93316 16.6715 4.58858 17.2136 4.64218 17.8031C4.73966 18.8749 4.99923 19.9279 5.41366 20.9257C5.95189 22.2214 6.74079 23.3988 7.73531 24.3906C8.72983 25.3823 9.91047 26.1691 11.2099 26.7058C12.5093 27.2425 13.902 27.5187 15.3084 27.5187C16.7149 27.5187 18.1076 27.2425 19.407 26.7058C20.7064 26.1691 21.8871 25.3823 22.8816 24.3906C23.8761 23.3988 24.665 22.2214 25.2032 20.9257C25.6176 19.9279 25.8772 18.8749 25.9747 17.8031Z" fill="%234F39F6"/><path d="M33.4291 14.8606H29.3084C29.3066 15.0706 29.1832 15.2606 28.9939 15.3549L26.3388 16.6788C26.1496 16.7732 26.0287 16.9631 26.0139 17.1732H30.1346C30.1476 16.963 30.2688 16.7732 30.4581 16.6788L33.1132 15.3549C33.3024 15.2606 33.4254 15.0707 33.4291 14.8606Z" fill="%237463F8"/><path d="M0.483398 17.1732H4.6041C4.60591 16.9631 4.72924 16.7732 4.91854 16.6788L7.57361 15.3549C7.76291 15.2606 7.8837 15.0706 7.89861 14.8606H3.77788C3.76483 15.0707 3.64366 15.2606 3.45437 15.3549L0.7993 16.6788C0.610009 16.7732 0.487025 16.963 0.483398 17.1732Z" fill="%237463F8"/><path d="M10.3719 14.8606C10.3551 15.0706 10.2346 15.2606 10.0454 15.3549L7.39026 16.6788C7.20094 16.7732 7.07723 16.9632 7.07739 17.1732H11.2035C11.1947 16.9636 11.3201 16.7732 11.5095 16.6788L14.1645 15.3549C14.354 15.2605 14.4728 15.0701 14.498 14.8606H10.3719Z" fill="%237463F8"/><path d="M22.7091 14.8606C22.7178 15.0701 22.5925 15.2605 22.403 15.3549L19.748 16.6788C19.5586 16.7732 19.4398 16.9636 19.4146 17.1732H23.5407C23.5575 16.9632 23.6779 16.7732 23.8672 16.6788L26.5223 15.3549C26.7116 15.2606 26.8353 15.0706 26.8351 14.8606H22.7091Z" fill="%237463F8"/></g><defs><clipPath id="clip0_131_3793"><rect width="33.561" height="32" fill="white" transform="translate(0.00585938)"/></clipPath></defs></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        flex-shrink: 0;
      }

      .chat-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
      }

      .chat-close-button {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .chat-close-button:hover {
        background: #f3f4f6;
        color: #1f2937;
      }

      .chat-close-button::after {
        content: '';
        display: block;
        width: 16px;
        height: 16px;
        background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }

      .chat-close-button:hover::after {
        background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%231f2937" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>');
      }

      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: white;
      }

      .message {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
      }

      .message.user {
        background: #4f46e5;
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }

      .message.assistant {
        background: #f3f4f6;
        color: #1f2937;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
      }

      .chat-input-container {
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: white;
        flex-shrink: 0;
      }

      .chat-input-wrapper {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .chat-input {
        flex: 1;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 14px;
        resize: none;
        outline: none;
        background: white;
        color: #1f2937;
        min-height: 40px;
        max-height: 120px;
      }

      .chat-input:focus {
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }

      .send-button {
        width: 40px;
        height: 40px;
        background: #4f46e5;
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s ease;
      }

      .send-button:hover:not(:disabled) {
        background: #4338ca;
      }

      .send-button:disabled {
        background: #a5b4fc;
        cursor: not-allowed;
      }

      .send-button::after {
        content: '';
        display: block;
        width: 16px;
        height: 16px;
        background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M22 2L11 13L2 10L22 2Z"/><path d="M22 2L15 22L11 13"/></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }
    `;

    const { container, shadowRoot } = CSSIsolation.createIsolatedContainer({
      id: `infilloai-chat-interface-${Date.now()}`,
      styles: chatStyles
    });

    const chatInterface = document.createElement('div');
    chatInterface.className = 'chat-interface';
    
    chatInterface.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-content">
          <div class="chat-header-logo"></div>
          <h3>InfilloAI</h3>
        </div>
        <button class="chat-close-button" title="Close"></button>
      </div>
      <div class="chat-messages">
        <div class="message assistant">Welcome to InfilloAI Assistant! How can I help you today?</div>
      </div>
      <div class="chat-input-container">
        <div class="chat-input-wrapper">
          <textarea class="chat-input" placeholder="Type a message..." rows="1"></textarea>
          <button class="send-button" disabled></button>
        </div>
      </div>
    `;

    shadowRoot.appendChild(chatInterface);

    // Store references
    this.chatUiContainer = container;
    this.closeButton = shadowRoot.querySelector('.chat-close-button') as HTMLButtonElement;
    this.messageInput = shadowRoot.querySelector('.chat-input') as HTMLTextAreaElement;
    this.messagesContainer = shadowRoot.querySelector('.chat-messages') as HTMLElement;
    this.sendButton = shadowRoot.querySelector('.send-button') as HTMLButtonElement;

    // Position the chat interface
    this.positionChatInterface();
    
    // Add to page
    document.body.appendChild(container);

    // Force immediate visibility
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';

    // Set up event listeners for the chat interface
    this.setupChatEventListeners();

    // Focus the input
    this.messageInput?.focus();

    console.log(`${LOG_PREFIX} Chat interface created and displayed`);
  }

  private positionToggleButton(): void {
    if (!this.widgetContainer) return;
    
    const { offset } = this.config;
    const buttonSize = 60;
    
    // Position in bottom-right corner
    let left = window.innerWidth - buttonSize - offset.x;
    let top = window.innerHeight - buttonSize - offset.y;
    
    // Ensure it doesn't go off screen
    left = Math.max(16, left);
    top = Math.max(16, top);
    
    console.log(`${LOG_PREFIX} Positioning toggle button at:`, { left, top });
    
    this.widgetContainer.style.position = 'fixed';
    this.widgetContainer.style.left = `${left}px`;
    this.widgetContainer.style.top = `${top}px`;
  }

  private positionChatInterface(): void {
    if (!this.chatUiContainer) return;
    
    const { offset } = this.config;
    const chatWidth = 370;
    const chatHeight = 600;
    const buttonSize = 60;
    
    // Position next to the toggle button (to the left)
    let left = window.innerWidth - chatWidth - offset.x - buttonSize - 16; // 16px gap
    let top = window.innerHeight - chatHeight - offset.y;
    
    // Ensure it doesn't go off screen
    left = Math.max(16, left);
    top = Math.max(16, top);
    
    console.log(`${LOG_PREFIX} Positioning chat interface at:`, { left, top });
    
    this.chatUiContainer.style.position = 'fixed';
    this.chatUiContainer.style.left = `${left}px`;
    this.chatUiContainer.style.top = `${top}px`;
  }

  toggle(): void {
    console.log(`${LOG_PREFIX} toggle() called. Current state: isOpen=${this.isOpen}`);
    this.isOpen ? this.hideChatInterface() : this.showChatInterface();
  }

  showChatInterface(): void {
    console.log(`${LOG_PREFIX} showChatInterface() called`);
    if (this.isOpen) return;
    
    // Create chat interface if it doesn't exist
    if (!this.chatUiContainer) {
      this.createChatInterface();
    } else {
      // Just show it if it already exists
      this.chatUiContainer.style.display = 'block';
      this.chatUiContainer.style.visibility = 'visible';
      this.chatUiContainer.style.opacity = '1';
      this.messageInput?.focus();
    }
    
    this.isOpen = true;
    console.log(`${LOG_PREFIX} Chat interface shown`);
  }

  hideChatInterface(): void {
    console.log(`${LOG_PREFIX} hideChatInterface() called`);
    if (!this.isOpen || !this.chatUiContainer) return;
    
    // Hide the chat interface (same as suggestionPopup.ts)
    this.chatUiContainer.remove();
    this.chatUiContainer = null;
    this.closeButton = null;
    this.messageInput = null;
    this.messagesContainer = null;
    this.sendButton = null;
    
    this.isOpen = false;
    console.log(`${LOG_PREFIX} Chat interface hidden`);
  }

  private setupEventListeners(): void {
    console.log(`${LOG_PREFIX} setupEventListeners() called`);
    
    // Set up toggle button listener
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', (e) => {
        console.log(`${LOG_PREFIX} Toggle button clicked!`, e);
        this.toggle();
      });
      console.log(`${LOG_PREFIX} Toggle button listener set up`);
    }
    
    console.log(`${LOG_PREFIX} Event listeners set up successfully.`);
  }

  private setupChatEventListeners(): void {
    console.log(`${LOG_PREFIX} setupChatEventListeners() called`);
    
    if(!this.closeButton || !this.sendButton || !this.messageInput) {
        console.error(`${LOG_PREFIX} Cannot setup chat listeners, a DOM element is missing:`, {
          closeButton: !!this.closeButton,
          sendButton: !!this.sendButton,
          messageInput: !!this.messageInput
        });
        return
    }
    
    this.closeButton.addEventListener('click', (e) => {
      console.log(`${LOG_PREFIX} Close button clicked!`, e);
      this.hideChatInterface();
    });
    
    this.sendButton.addEventListener('click', (e) => {
      console.log(`${LOG_PREFIX} Send button clicked!`, e);
      this.sendMessage();
    });
    
    this.messageInput.addEventListener('input', () => {
      this.sendButton!.disabled = this.messageInput!.value.trim().length === 0;
    });

    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    console.log(`${LOG_PREFIX} Chat event listeners set up successfully.`);
  }

  private async sendMessage(): Promise<void> {
    if (!this.messageInput || this.isStreaming) return;
    const content = this.messageInput.value.trim();
    if (!content) return;

    this.messageInput.value = '';
    this.sendButton!.disabled = true;

    this.addMessage({ id: `user-${Date.now()}`, content, sender: 'user', timestamp: new Date() });
    this.isStreaming = true;
    
    try {
      this.streamConnection = await this.apiService.chatStream(
        content, this.sessionId || undefined,
        this.handleStreamMessage.bind(this),
        this.handleStreamError.bind(this),
        this.handleStreamClose.bind(this)
      );
    } catch (error) {
      this.handleStreamError(error as ApiError);
    }
  }

  private handleStreamMessage(chunk: { response: string; sessionId: string; done: boolean }): void {
    if (!this.sessionId) this.sessionId = chunk.sessionId;
    
    let assistantMessage = this.messages.find(m => m.isStreaming);

    if (!assistantMessage) {
      assistantMessage = { id: `assistant-${Date.now()}`, content: '', sender: 'assistant', isStreaming: true, timestamp: new Date() };
      this.addMessage(assistantMessage);
    }

    assistantMessage.content += chunk.response;
    this.updateMessage(assistantMessage.id, assistantMessage.content);

    if (chunk.done) {
      assistantMessage.isStreaming = false;
      this.handleStreamClose();
    }
  }

  private handleStreamError(error: ApiError): void {
    this.addMessage({
        id: `error-${Date.now()}`,
        content: `Sorry, an error occurred: ${error.message}`,
        sender: 'assistant',
        timestamp: new Date()
    });
    this.handleStreamClose();
  }

  private handleStreamClose(): void {
    this.isStreaming = false;
    this.streamConnection = null;
    if (this.messageInput) {
      this.sendButton!.disabled = this.messageInput.value.trim().length === 0;
    }
  }

  private addMessage(message: DisplayMessage): void {
    if (!this.messagesContainer) return;
    this.messages.push(message);
    const el = this.createMessageElement(message);
    this.messagesContainer.appendChild(el);
    this.scrollToBottom();
  }

  private updateMessage(id: string, content: string): void {
    const messageElement = this.messagesContainer?.querySelector(`#${id}`);
    if (messageElement) {
      messageElement.textContent = content;
      this.scrollToBottom();
    }
  }

  private createMessageElement(message: DisplayMessage): HTMLElement {
    const el = document.createElement('div');
    el.id = message.id;
    el.className = `message ${message.sender}`;
    el.textContent = message.content;
    return el;
  }
  
  private scrollToBottom(): void {
    this.messagesContainer?.scrollTo({ top: this.messagesContainer.scrollHeight, behavior: 'smooth' });
  }

  private cleanup(): void {
    this.streamConnection?.close();
    
    // Clean up chat interface
    this.hideChatInterface();
    
    // Clean up toggle button
    this.widgetContainer?.remove();
    this.widgetContainer = null;
    this.toggleButton = null;
    
    this.isActive = false;
    this.messages = [];
  }
} 