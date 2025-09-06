import { useState, useRef, useEffect } from 'react';

// Define the structure of a single message
interface Message {
  sender: 'user' | 'bot';
  text: string;
}

// Define the props for the ChatPanel component
interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

/**
 * A slide-out panel component for the chat interface.
 * It displays the conversation, collapsible predefined questions, and provides an input for the user to send messages.
 * @param {ChatPanelProps} props - The props for the component.
 * @returns {JSX.Element} The rendered ChatPanel component.
 */
const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, onClose }) => {
  const [input, setInput] = useState('');
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false); // State for collapsible questions
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // List of predefined questions
  const predefinedQuestions = [
    "What is CareerMatch?",
    "How can I create an account on CareerMatch?",
    "How can a Applicant use CareerMatch?",
    "How can a HR use CareerMatch?",
    "How can a Admin use CareerMatch?",
    "What are the features of CareerMatch?",
    "What are the individual or separate services provided by CareerMatch?",
    "What are the featues for Applicant in CareerMatch?",
    "What are the featues for HR in CareerMatch?",
    "How can I find a job using CareerMatch ?",
    "What are the benefits of using this platform?",
    

  ];

  // Function to automatically scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to the bottom whenever the messages array is updated
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle the form submission
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  // Handle clicking a predefined question
  const handlePredefinedQuestion = (question: string) => {
    onSendMessage(question);
  };

  // Toggle the visibility of predefined questions
  const toggleQuestions = () => {
    setIsQuestionsOpen(prev => !prev);
  };

  return (
    <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card text-card-foreground shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
      {/* Chat Panel Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold">Chat Assistant</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-gradient-primary text-primary-foreground`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
          {/* Empty div to act as a reference for auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Collapsible Predefined Questions */}
      <div className="border-t border-border">
        <button
          onClick={toggleQuestions}
          className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted focus:outline-none"
          aria-label={isQuestionsOpen ? "Hide suggested questions" : "Show suggested questions"}
        >
          <span>Suggested Questions</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform duration-300 ${isQuestionsOpen ? 'rotate-180' : 'rotate-0'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isQuestionsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-4 flex flex-col gap-2">
            {predefinedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handlePredefinedQuestion(question)}
                className="px-3 py-1 text-sm text-left bg-muted text-foreground rounded-full hover:bg-gradient-primary hover:text-primary-foreground transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 bg-muted border border-border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-gradient-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center hover:bg-gradient-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;