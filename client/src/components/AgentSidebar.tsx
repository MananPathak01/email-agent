import { useState } from "react";
import { Bot } from "lucide-react";

const agents = [
  {
    key: "clara",
    name: "Clara",
    role: "HR Agent",
    color: "bg-gradient-to-br from-blue-400 to-purple-500",
    icon: <Bot className="h-6 w-6" />,
  },
  {
    key: "dex",
    name: "Dex",
    role: "IT Agent",
    color: "bg-gradient-to-br from-blue-400 to-purple-500",
    icon: <span className="font-bold text-lg">D</span>,
  },
  {
    key: "nova",
    name: "Nova",
    role: "Sales Agent",
    color: "bg-gradient-to-br from-pink-500 to-yellow-400",
    icon: <span className="font-bold text-lg">N</span>,
  },
  {
    key: "echo",
    name: "Echo",
    role: "Marketing Agent",
    color: "bg-gradient-to-br from-green-400 to-blue-400",
    icon: <span className="font-bold text-lg">E</span>,
  },
];

export default function AgentSidebar({ selected, onSelect }: { selected?: string, onSelect?: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`h-full flex flex-col items-center transition-all duration-300 bg-white border-r border-gray-200 shadow-sm z-30 ${expanded ? 'w-48' : 'w-16'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{ minWidth: expanded ? 192 : 64 }}
    >
      <div className="flex flex-col gap-2 mt-4 w-full items-center">
        {agents.map((agent) => (
          <button
            key={agent.key}
            onClick={() => onSelect?.(agent.key)}
            className={`group flex items-center w-full px-2 py-2 rounded-lg transition-all duration-200 ${selected === agent.key ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            style={{ minWidth: 0 }}
          >
            <span className={`flex items-center justify-center h-10 w-10 rounded-full ${agent.color} text-white shadow-lg mr-0 ${expanded ? 'mr-3' : ''}`}>{agent.icon}</span>
            {expanded && (
              <span className="flex flex-col text-left">
                <span className="font-semibold text-gray-900 text-sm">{agent.name}</span>
                <span className="text-xs text-gray-500">{agent.role}</span>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 