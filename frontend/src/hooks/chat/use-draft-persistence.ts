import { useEffect, useRef, useCallback, useState } from "react";
import {
  useConversationLocalStorageState,
  getConversationState,
  setConversationState,
} from "#/utils/conversation-local-storage";
import { getTextContent } from "#/components/features/chat/utils/chat-input.utils";

/**
 * Check if a conversation ID is a temporary task ID.
 * Task IDs have the format "task-{uuid}" and are used during V1 conversation initialization.
 */
const isTaskId = (id: string): boolean => id.startsWith("task-");

const DRAFT_SAVE_DEBOUNCE_MS = 500;

/**
 * Hook for persisting draft messages to localStorage.
 * Handles debounced saving on input, restoration on mount, and clearing on confirmed delivery.
 */
export const useDraftPersistence = (
  conversationId: string,
  chatInputRef: React.RefObject<HTMLDivElement | null>,
) => {
  const { state, setDraftMessage } =
    useConversationLocalStorageState(conversationId);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);
  const [isRestored, setIsRestored] = useState(false);

  // Track current conversationId to prevent saving draft to wrong conversation
  const currentConversationIdRef = useRef(conversationId);
  // Track if this is the first mount to handle initial cleanup
  const isFirstMountRef = useRef(true);

  // IMPORTANT: This effect must run FIRST when conversation changes
  // It handles cleanup and special cases like task-to-real ID transitions
  useEffect(() => {
    const previousConversationId = currentConversationIdRef.current;
    const isInitialMount = isFirstMountRef.current;
    currentConversationIdRef.current = conversationId;
    isFirstMountRef.current = false;

    // Cancel any pending debounced save from previous conversation
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const element = chatInputRef.current;

    // Handle conversation change (not initial mount)
    if (!isInitialMount && previousConversationId !== conversationId) {
      // Special case: transitioning from task ID to real conversation ID
      // This happens when a new conversation finishes initializing.
      // The user may have typed a draft during initialization that wasn't saved
      // (because task IDs don't persist to localStorage). Transfer it now.
      const wasTaskId = isTaskId(previousConversationId);
      const isNowRealId = !isTaskId(conversationId);

      if (wasTaskId && isNowRealId && element) {
        const currentText = getTextContent(element).trim();
        if (currentText) {
          // Save the draft to the NEW (real) conversation ID
          setConversationState(conversationId, { draftMessage: currentText });
          // Don't clear the DOM - keep the draft visible
          // Mark as restored to prevent the restoration effect from overwriting
          hasRestoredRef.current = true;
          setIsRestored(true);
          return; // Skip normal cleanup
        }
      }
    }

    // ALWAYS clear DOM on mount or conversation change
    // This prevents stale drafts from appearing in new conversations
    // (e.g., from browser form restoration or React DOM recycling)
    // The restoration effect will then restore the correct draft if one exists
    if (element) {
      element.textContent = "";
    }

    // Reset restoration flag so draft will be restored for new conversation
    hasRestoredRef.current = false;
    setIsRestored(false);
  }, [conversationId, chatInputRef]);

  // Restore draft from localStorage - reads directly to avoid state sync timing issues
  useEffect(() => {
    if (hasRestoredRef.current) {
      return;
    }

    const element = chatInputRef.current;
    if (!element) {
      return;
    }

    // Read directly from localStorage to avoid stale state from useConversationLocalStorageState
    // The hook's state may not have synced yet after conversationId change
    const { draftMessage } = getConversationState(conversationId);

    // Only restore if there's a saved draft and the input is empty
    if (draftMessage && getTextContent(element).trim() === "") {
      element.textContent = draftMessage;
      // Move cursor to end
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    hasRestoredRef.current = true;
    setIsRestored(true);
  }, [chatInputRef, conversationId]);

  // Debounced save function - called from onInput handler
  const saveDraft = useCallback(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Capture the conversationId at the time of input
    const capturedConversationId = conversationId;

    saveTimeoutRef.current = setTimeout(() => {
      // Verify we're still on the same conversation before saving
      // This prevents saving draft to wrong conversation if user switched quickly
      if (capturedConversationId !== currentConversationIdRef.current) {
        return;
      }

      const element = chatInputRef.current;
      if (!element) {
        return;
      }

      const text = getTextContent(element).trim();
      // Only save if content has changed
      if (text !== (state.draftMessage || "")) {
        setDraftMessage(text || null);
      }
    }, DRAFT_SAVE_DEBOUNCE_MS);
  }, [chatInputRef, state.draftMessage, setDraftMessage, conversationId]);

  // Clear draft - called after message delivery is confirmed
  const clearDraft = useCallback(() => {
    // Cancel any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setDraftMessage(null);
  }, [setDraftMessage]);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    },
    [],
  );

  return {
    saveDraft,
    clearDraft,
    isRestored,
    hasDraft: !!state.draftMessage,
  };
};
