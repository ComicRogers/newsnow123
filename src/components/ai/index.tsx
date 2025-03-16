import { useTitle } from "react-use"
import { useEffect, useRef, useState } from "react"
import { metadata } from "@shared/metadata"
import type { ChangeEvent, KeyboardEvent } from "react"

// 定义消息类型
type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// 阿露 AI 聊天机器人组件
export function AI() {
  useTitle(`${metadata.hi.name} - NewsDaily`)
  
  // 从 localStorage 加载聊天记录，如果没有则使用默认欢迎消息
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('aiChatMessages')
    return savedMessages 
      ? JSON.parse(savedMessages) 
      : [{ role: 'assistant' as const, content: '你好，我是阿露，瑾宝的专属小机器人，有什么我可以帮助你的吗？' }]
  })
  
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const apiKey = import.meta.env.ARK_API_KEY || 'c3dd33c1-e8d7-4ebf-9143-535fe4f43772'
  
  // 当消息更新时，保存到 localStorage
  useEffect(() => {
    localStorage.setItem('aiChatMessages', JSON.stringify(messages))
  }, [messages])
  
  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages, currentStreamingMessage])
  
  // 自动调整输入框高度
  const adjustTextareaHeight = () => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }
  
  useEffect(() => {
    adjustTextareaHeight()
  }, [input])
  
  // 清除聊天记录
  const clearChat = () => {
    const initialMessage = { 
      role: 'assistant' as const, 
      content: '你好，我是阿露，瑾宝的专属小机器人，有什么我可以帮助你的吗？' 
    }
    setMessages([initialMessage])
    localStorage.setItem('aiChatMessages', JSON.stringify([initialMessage]))
  }
  
  // 发送消息到 AI 模型
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsStreaming(true)
    setCurrentStreamingMessage('')
    
    // 重置输入框高度
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    
    try {
      // 构建请求消息数组
      const requestMessages = [
        { role: 'system' as const, content: '你是人工智能助手阿露，瑾宝的专属小机器人。' },
        ...messages.slice(-10), // 只发送最近的10条消息以保持上下文
        userMessage
      ]
      
      // 使用流式响应
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'doubao-1.5-pro-32k-250115',
          messages: requestMessages,
          stream: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`)
      }
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法获取响应流')
      
      let accumulatedMessage = ''
      
      // 处理流式响应
      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          // 将 Uint8Array 转换为字符串
          const chunk = new TextDecoder().decode(value)
          
          // 处理 SSE 格式的响应
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0]?.delta?.content || ''
                if (content) {
                  accumulatedMessage += content
                  setCurrentStreamingMessage(accumulatedMessage)
                }
              } catch (e) {
                console.error('解析流响应时出错:', e)
              }
            }
          }
        }
        
        // 流处理完成后，添加完整的助手消息
        setMessages(prev => [...prev, { role: 'assistant' as const, content: accumulatedMessage }])
        setIsStreaming(false)
        setCurrentStreamingMessage('')
      }
      
      await processStream()
    } catch (error) {
      console.error('发送消息时出错:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant' as const, 
        content: '抱歉，我遇到了一些问题，无法回应你的消息。请稍后再试。' 
      }])
      setIsStreaming(false)
      setCurrentStreamingMessage('')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 处理输入变化
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }
  
  // 处理按键事件
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  // 格式化消息内容，支持换行
  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ))
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <div className="i-ph:robot w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">小机器人阿露</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI 聊天助手</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={clearChat}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
            title="清除聊天记录"
          >
            <div className="i-ph:trash w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50 dark:bg-gray-800">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role !== 'user' && (
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2 mt-1">
                <img 
                  src="/avatars/robot.png" 
                  alt="AI" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.classList.add('bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary');
                    const icon = document.createElement('div');
                    icon.className = 'i-ph:robot w-5 h-5';
                    e.currentTarget.parentElement!.appendChild(icon);
                  }} 
                />
              </div>
            )}
            <div 
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.role === 'user' 
                  ? 'bg-primary text-white ml-2' 
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm'
              }`}
            >
              {formatMessage(message.content)}
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full overflow-hidden ml-2 mt-1">
                <img 
                  src="/avatars/user.png" 
                  alt="User" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.classList.add('bg-gray-300', 'dark:bg-gray-600', 'flex', 'items-center', 'justify-center', 'text-gray-600', 'dark:text-gray-300');
                    const icon = document.createElement('div');
                    icon.className = 'i-ph:user w-5 h-5';
                    e.currentTarget.parentElement!.appendChild(icon);
                  }} 
                />
              </div>
            )}
          </div>
        ))}
        {isStreaming && currentStreamingMessage && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 mt-1">
              <img 
                src="/avatars/robot.png" 
                alt="AI" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.classList.add('bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary');
                  const icon = document.createElement('div');
                  icon.className = 'i-ph:robot w-5 h-5';
                  e.currentTarget.parentElement!.appendChild(icon);
                }} 
              />
            </div>
            <div className="max-w-[80%] p-3 rounded-2xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm">
              {formatMessage(currentStreamingMessage)}
            </div>
          </div>
        )}
        {isLoading && !currentStreamingMessage && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 mt-1">
              <img 
                src="/avatars/robot.png" 
                alt="AI" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.classList.add('bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary');
                  const icon = document.createElement('div');
                  icon.className = 'i-ph:robot w-5 h-5';
                  e.currentTarget.parentElement!.appendChild(icon);
                }} 
              />
            </div>
            <div className="max-w-[80%] p-4 rounded-2xl bg-white dark:bg-gray-700 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="relative flex items-end bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 focus-within:border-primary dark:focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 p-3 pt-4 max-h-32 bg-transparent outline-none text-gray-800 dark:text-gray-200 resize-none"
            disabled={isLoading}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className={`p-3 m-1 rounded-lg ${
              isLoading || !input.trim() 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                : 'bg-primary text-white hover:bg-primary/90 transition-colors'
            }`}
          >
            <div className="i-ph:paper-plane-right-fill w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    </div>
  )
}