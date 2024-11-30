import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BarChart3, ChevronDown, Crown, Home, LineChart, MessageSquare, Search, Send, Target, Users2, Atom, Bell, Settings } from 'lucide-react'
import Link from "next/link"
import { motion, AnimatePresence } from 'framer-motion'

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setChatMessages([...chatMessages, { role: 'user', content: inputMessage }])
      setInputMessage('')
      // Simulate AI response
      setTimeout(() => {
        setChatMessages(
          prev => [...prev, { role: 'assistant', content: 'Thank you for your message. How can I assist you further?' }]
        )
      }, 1000)
    }
  }

  return (
    (<div className="min-h-screen bg-[#131314] text-white">
      <div className="grid lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <ScrollArea className="hidden lg:block bg-[#1A1A1A] p-4 h-screen">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2 mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}>
            <Crown className="h-8 w-8" />
            <span className="text-xl font-bold">Cogent</span>
          </motion.div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-8 bg-[#0D0D0D] border-0 text-white placeholder:text-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          {/* Navigation */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="text-xs uppercase text-gray-400">Dashboard</div>
            <NavItem icon={<Home className="h-4 w-4" />} label="Home" />

            <div className="text-xs uppercase text-gray-400 mt-6">Modules</div>
            <NavItem icon={<BarChart3 className="h-4 w-4" />} label="Market Analysis" />
            <NavItem icon={<Users2 className="h-4 w-4" />} label="Customer Discovery" />
            <NavItem icon={<Target className="h-4 w-4" />} label="Competitive Intelligence" />
            <NavItem icon={<LineChart className="h-4 w-4" />} label="Product Evolution" />
            <NavItem icon={<Atom className="h-4 w-4" />} label="Market Expansion" />

            <div className="text-xs uppercase text-gray-400 mt-6">Operations</div>
            <NavItem
              icon={<MessageSquare className="h-4 w-4" />}
              label="Talk to Agents"
              rightIcon={<Send
                className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />} />
          </motion.div>

          {/* User Section */}
          <motion.div
            className="absolute bottom-4 left-4 right-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}>
            <div className="flex items-center gap-3 px-3 py-2 bg-[#0D0D0D] rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>CB</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">crazybot_14ds</div>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </ScrollArea>

        {/* Main Content */}
        <div className="flex flex-col h-screen">
          {/* Header */}
          <motion.div
            className="flex items-center justify-between p-4 border-b border-gray-800"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>CEO</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">CEO</span>
                  <span className="text-xs text-gray-400">Strategic planning and coordination</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Notifications</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="ghost" size="icon">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Content Area */}
          <ScrollArea className="flex-grow p-6">
            {/* Popular Prompts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}>
              <h2 className="text-xl font-semibold mb-4">Popular Prompts</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <PromptCard text="How satisfied are our customers with our service?" />
                <PromptCard text="How can we improve our online presence?" />
                <PromptCard text="How effective are our current marketing strategies?" />
                <PromptCard text="What competitors are doing differently?" />
              </div>
            </motion.div>

            {/* Chat Interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}>
              <h2 className="text-xl font-semibold mb-4">Chat Interface</h2>
              <Card className="bg-[#0D0D0D] border-0">
                <CardContent className="p-4">
                  <ScrollArea className="h-[300px] mb-4">
                    <AnimatePresence>
                      {chatMessages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                          <span
                            className={`inline-block p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                            {message.content}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-grow bg-[#1A1A1A] border-0" />
                    <Button onClick={handleSendMessage}>Send</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </ScrollArea>
        </div>
      </div>
    </div>)
  );
}

function NavItem({
  icon,
  label,
  rightIcon
}) {
  return (
    (<TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-gray-200 hover:bg-[#0D0D0D] rounded-lg group transition-colors">
            {icon}
            {label}
            {rightIcon}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>)
  );
}

function PromptCard({
  text
}) {
  return (
    (<Card
      className="bg-[#0D0D0D] border-0 hover:bg-[#1A1A1A] cursor-pointer transition-colors group">
      <CardContent className="p-4">
        <p className="text-gray-200 text-center">{text}</p>
        <motion.div
          className="mt-2 text-center"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}>
          <Button variant="ghost" size="sm">
            Use Prompt
          </Button>
        </motion.div>
      </CardContent>
    </Card>)
  );
}

