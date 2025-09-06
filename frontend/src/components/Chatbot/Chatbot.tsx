import { useState, useEffect } from 'react';
import { ragService } from '@/api/axios';
import ChatIcon from './ChatIcon';
import ChatPanel from './ChatPanel';

// Define the structure of a single message
interface Message {
  sender: 'user' | 'bot';
  text: string;
}

// Define the structure of the RAG API response
interface RagResponse {
  answer: string;
}

/**
 * The main controller component for the chatbot.
 * It manages the chatbot's state (open/closed, messages) and handles interactions.
 * @returns {JSX.Element} The rendered Chatbot component.
 */
const Chatbot = () => {
  // Assume isLoggedIn is provided by your auth system (e.g., context, prop, or state management)
  const isLoggedIn = false; // Replace with actual auth check (e.g., useAuth().isLoggedIn)

  // State to manage the visibility of the chat panel
  const [isOpen, setIsOpen] = useState(false);
  
  // State to hold the conversation history
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: "Hello! I'm your smart assistant. How can I help you with CareerMatch ?" }
  ]);
  
  // State to indicate if the bot is waiting for a response
  const [isLoading, setIsLoading] = useState(false);

  // Track if this is the first user message
  const [messageCount, setMessageCount] = useState(0);

  // Reset chat history when user is logged out
  useEffect(() => {
    if (!isLoggedIn) {
      setMessages([{ sender: 'bot', text: "Hello! I'm your smart assistant. How can I help you with CareerMatch ?" }]);
      setMessageCount(0);
    }
  }, [isLoggedIn]);

  // Toggles the chat panel's visibility
  const handleToggleChat = () => {
    setIsOpen(prev => !prev); // Simply toggle visibility, no "Goodbye" message
  };

  /**
   * Handles sending a message from the user.
   * It adds the user's message to the state and fetches a response from the RAG backend.
   * @param {string} userMessage - The message typed by the user.
   * @param {boolean} isConversationEnd - Whether this is the end of the conversation.
   */
  const handleSendMessage = async (userMessage: string, isConversationEnd = false) => {
    // List of phrases that indicate the end of a conversation
    const endConversationPhrases = ['bye', 'goodbye', 'stop', 'end', 'quit', 'see you', 'later'];
    const isEndPhrase = endConversationPhrases.some(phrase => 
      userMessage.toLowerCase().includes(phrase)
    );

    // Add user's message to the chat history
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setMessageCount(prev => prev + 1);
    setIsLoading(true);

    try {
      // Make API call to the RAG endpoint with typed response
      const response = await ragService.post<RagResponse>('/rag', {
        query: userMessage,
        is_first_message: messageCount === 0,
        is_conversation_end: isEndPhrase || isConversationEnd
      });
      const botResponse = response.data.answer;

      // Add the bot's response to the chat history
      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    } catch (error) {
      // Handle error
      setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, something went wrong. Please try again." }]);
      console.error("Error fetching RAG response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* The chat icon is always visible */}
      <ChatIcon onClick={handleToggleChat} />
      
      {/* The chat panel is rendered conditionally based on the isOpen state */}
      {isOpen && (
        <ChatPanel
          messages={messages}
          onSendMessage={(message: string) => handleSendMessage(message)}
          onClose={handleToggleChat}
        />
      )}
    </>
  );
};

export default Chatbot;