"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  User, 
  Bot, 
  Minimize2, 
  Maximize2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { chatWithAI, smartSearchEmployees } from "@/services/ai.services";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function HRChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");

  // Check Ollama Status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const baseURL = api.defaults.baseURL || '';
        const res = await fetch(`${baseURL}/api/ai/smart-search?query=test`, {
          credentials: 'include'
        });
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    if (isOpen) checkStatus();
  }, [isOpen]);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([
    { role: "bot", content: "Hello! I'm your HR AI Assistant. How can I help you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Map frontend roles to backend roles (bot -> assistant)
      const history = messages.map(m => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content
      }));

      // Add a placeholder for the bot response
      setMessages(prev => [...prev, { role: "bot", content: "" }]);
      
      let fullResponse = "";
      
      // Call with streaming callback
      await chatWithAI(userMessage, history, (token) => {
        fullResponse += token;
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.role === "bot") {
            return [...prev.slice(0, -1), { role: "bot", content: fullResponse }];
          }
          return prev;
        });
      });
    } catch (error: any) {
      console.error("[Chatbot UI] Error:", error);
      const errorMessage = error.message || "AI is currently unavailable. Please try again later.";
      toast.error(errorMessage);
      
      // Remove the empty bot message if it failed
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === "bot" && lastMsg.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 animate-bounce"
      >
        <MessageCircle className="size-6 text-white" />
      </Button>
    );
  }

  return (
    <Card 
      className={cn(
        "fixed right-6 bottom-6 w-96 shadow-2xl border-white/20 transition-all duration-300 z-50 overflow-hidden",
        isMinimized ? "h-14" : "h-[500px]"
      )}
    >
      <CardHeader className="p-4 bg-primary text-white flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Bot className="size-5" /> HR AI Assistant
          </CardTitle>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={cn(
              "size-2 rounded-full",
              isOnline === true ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : 
              isOnline === false ? "bg-rose-400" : "bg-zinc-400"
            )} />
            <span className="text-[10px] font-medium opacity-80 uppercase tracking-tighter">
              {isOnline === true ? "System Online" : isOnline === false ? "System Offline" : "Checking..."}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setIsOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent 
            ref={scrollRef}
            className="p-4 h-[380px] overflow-y-auto space-y-4 bg-zinc-50/50"
          >
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex items-start gap-2",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  msg.role === "bot" ? "bg-white border shadow-sm" : "bg-primary text-white"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground italic">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-xs">AI is thinking...</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-3 border-t bg-white">
            <form onSubmit={handleSend} className="flex w-full items-center gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 h-10 rounded-xl"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !message.trim()}
                className="h-10 w-10 rounded-xl"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
