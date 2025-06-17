import React, { useEffect, useRef, ReactNode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CSSIsolation, IsolatedElementOptions } from '@/utils/cssIsolation';

interface IsolatedContainerProps extends IsolatedElementOptions {
  children: ReactNode;
  onMount?: (shadowRoot: ShadowRoot) => void;
  onUnmount?: () => void;
}

/**
 * IsolatedContainer Component
 * Renders children inside a Shadow DOM for complete CSS isolation
 */
export const IsolatedContainer: React.FC<IsolatedContainerProps> = ({
  children,
  id,
  className,
  styles,
  onMount,
  onUnmount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const reactRootRef = useRef<Root | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    // Create isolated container with Shadow DOM
    const { shadowRoot } = CSSIsolation.createIsolatedContainer({
      id,
      className,
      styles,
    });

    shadowRootRef.current = shadowRoot;

    // Create React root inside Shadow DOM
    const shadowContainer = document.createElement('div');
    shadowContainer.id = 'react-root';
    shadowRoot.appendChild(shadowContainer);

    // Mount React app in Shadow DOM
    const root = createRoot(shadowContainer);
    reactRootRef.current = root;
    root.render(children);

    // Call onMount callback
    onMount?.(shadowRoot);

    return () => {
      // Cleanup
      if (reactRootRef.current) {
        reactRootRef.current.unmount();
      }
      onUnmount?.();
    };
  }, [children, id, className, styles, onMount, onUnmount]);

  return <div ref={containerRef} />;
};

/**
 * Hook for creating isolated containers programmatically
 */
export const useIsolatedContainer = (options: IsolatedElementOptions = {}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  const createContainer = () => {
    if (containerRef.current) return { container: containerRef.current, shadowRoot: shadowRootRef.current };

    const { container, shadowRoot } = CSSIsolation.createIsolatedContainer(options);
    containerRef.current = container;
    shadowRootRef.current = shadowRoot;

    return { container, shadowRoot };
  };

  const removeContainer = () => {
    if (containerRef.current) {
      CSSIsolation.removeIsolatedContainer(containerRef.current);
      containerRef.current = null;
      shadowRootRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      removeContainer();
    };
  }, []);

  return {
    createContainer,
    removeContainer,
    container: containerRef.current,
    shadowRoot: shadowRootRef.current,
  };
}; 