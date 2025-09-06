// Define the props for the ChatIcon component
interface ChatIconProps {
  onClick: () => void; // Function to call when the icon is clicked
}

/**
 * A floating action button component to toggle the chat panel.
 * It displays a chat bubble icon with a gradient and an attached text panel on hover.
 * @param {ChatIconProps} props - The props for the component.
 * @returns {JSX.Element} The rendered ChatIcon component.
 */
const ChatIcon: React.FC<ChatIconProps> = ({ onClick }) => {
  return (
    // Use a group container to manage hover state for both elements
    <div 
      className="fixed bottom-8 right-8 flex items-center group cursor-pointer z-50"
      onClick={onClick} // Make the whole area clickable
    >
      {/* Text panel that appears on hover */}
      <div className="bg-background text-foreground px-4 py-2 rounded-lg shadow-lg mr-4 transition-all duration-300 ease-in-out transform translate-x-8 opacity-0 group-hover:opacity-100 group-hover:translate-x-0">
        <span className="font-semibold whitespace-nowrap">Ask AI Assistant</span>
      </div>

      {/* The icon button with the new gradient style */}
      <button
        className="bg-gradient-primary text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-transform duration-300 group-hover:scale-110"
        aria-label="Open chat"
      >
        {/* Simple SVG for a chat bubble icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    </div>
  );
};

export default ChatIcon;