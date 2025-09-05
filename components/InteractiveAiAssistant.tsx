import React, { useState, useRef, useEffect } from 'react';
import type { UrlAuditReport, ChatMessage } from '../types.js';
import { getAiChatResponse } from '../services/geminiService.js';
import Loader from './Loader.js';
import { SparklesIcon } from './icons.js';

const initialMessage: ChatMessage = {
  role: 'ai',
  content: "I've analyzed this page. What would you like to improve first?",
  options: [
    { label: 'Meta Title', prompt: 'Help me with the Meta Title.' },
    { label: 'Meta Description', prompt: 'Help me with the Meta Description.' },
    { label: 'H1 Tag', prompt: 'Help me with the H1 Tag.' },
    { label: 'Page Content', prompt: 'Give me ideas for the page content.' },
  ],
};

const followupQuestions: Record<string, string> = {
    'Meta Title': 'Great! What are the main keywords you want to target for this page?',
    'Meta Description': 'Sounds good. What are the target keywords and the primary call-to-action?',
    'H1 Tag': 'Okay. What is the main topic or keyword for this page?',
    'Page Content': 'I can help with that. What specific topics or angles are you looking to explore?'
};

interface InteractiveAiAssistantProps {
  report: UrlAuditReport;
  onClose: () => void;
}

const InteractiveAiAssistant: React.FC<InteractiveAiAssistantProps> = ({ report, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const formatContent = (content: string) => {
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\s*[-*]\s(.*)/gm, '</li><li>$1')
      .replace(/^\s*\d+\.\s(.*)/gm, '</li><li>$1');
      
    if (html.includes('</li>')) {
        html = `<ul>${html}</ul>`.replace(`<ul></li>`, '<ul>');
    }
    
    return html.replace(/\n/g, '<br />');
  };

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: messageContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const followupQuestion = Object.entries(followupQuestions).find(([key]) => messageContent.includes(key))?.[1];

    if (followupQuestion) {
        setTimeout(() => {
            setMessages([...newMessages, { role: 'ai', content: followupQuestion }]);
            setIsLoading(false);
        }, 500);
    } else {
        const aiResponseContent = await getAiChatResponse(report, newMessages);
        const aiMessage: ChatMessage = { role: 'ai', content: aiResponseContent };
        setMessages([...newMessages, aiMessage]);
        setIsLoading(false);
    }
  };

  const handleOptionClick = (prompt: string) => {
    setUserInput('');
    sendMessage(prompt);
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(userInput);
    setUserInput('');
  };

  return (
    <div className="mt-4 pt-4 border-t border-ash-gray-light/30 bg-alabaster/50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-lg text-moss-green flex items-center gap-2">
            <SparklesIcon className="w-6 h-6" />
            AI Assistant
        </h4>
        <button onClick={onClose} className="text-ash-gray hover:text-moss-green font-bold text-2xl leading-none">&times;</button>
      </div>

      <div className="h-80 overflow-y-auto pr-2 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-moss-green text-white' : 'bg-white text-moss-green'}`}>
              <div className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
              {msg.options && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.options.map(opt => (
                    <button key={opt.label} onClick={() => handleOptionClick(opt.prompt)} className="text-xs bg-ash-gray-light/50 hover:bg-ash-gray-light/70 text-moss-green font-bold py-1 px-3 rounded-full transition-colors">
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
         {isLoading && (
            <div className="flex justify-start">
                 <div className="bg-white rounded-lg p-3 inline-flex items-center">
                    <Loader /> <span className="ml-2 text-ash-gray">Thinking...</span>
                 </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleFormSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your request..."
          className="flex-grow bg-white text-lg text-moss-green placeholder-ash-gray outline-none px-4 py-2 rounded-lg border border-ash-gray-light/50 focus:ring-2 focus:ring-saffron"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-saffron hover:bg-saffron/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-ash-gray">
          Send
        </button>
      </form>
    </div>
  );
};

export default InteractiveAiAssistant;
