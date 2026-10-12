import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles, AlertCircle, Database, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useBackend } from '../../context/BackendContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    provider?: string;
}

interface InspectionAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeInspectionId?: string;
}

export const InspectionAssistantModal: React.FC<InspectionAssistantModalProps> = ({
    isOpen,
    onClose,
    activeInspectionId,
}) => {
    const { inspections, health } = useBackend();
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content:
                'Hello! I am the **VisionInspect AI Quality Assistant**. I can analyze your PatchCore anomaly scores, explain spatial heatmaps, summarize QC inspection histories, and review model benchmark metrics.',
            provider: 'System',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of conversation
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    if (!isOpen) return null;

    const handleSend = async (messageText?: string) => {
        const textToSend = messageText || input;
        if (!textToSend.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: textToSend };
        setMessages((prev) => [...prev, userMsg]);
        if (!messageText) setInput('');
        setIsLoading(true);

        try {
            const history = messages
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .slice(-4)
                .map((m) => ({ role: m.role, content: m.content }));

            const res = await api.chatWithAssistant(textToSend, activeInspectionId, history);

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: res.reply,
                    sources: res.sources,
                    provider: res.provider,
                },
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `Unable to contact assistant service: ${(err as Error).message || 'Backend connection error.'}`,
                    provider: 'Error',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const samplePrompts = [
        'Explain the latest inspection result.',
        'Summarize the inspections that were flagged.',
        'What does this anomaly heatmap indicate?',
        'What are the model evaluation benchmark metrics?',
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#10131B] border border-[#292E3B] rounded-xl w-full max-w-2xl h-[620px] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-[#292E3B] flex items-center justify-between bg-[#161A24]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#28223D] border border-[#3D325C] flex items-center justify-center text-[#A78BFA]">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-[#F1F2F6] flex items-center gap-2">
                                Quality Control Assistant
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#A78BFA] bg-[#28223D] border border-[#3D325C]">
                                    Grounded QC
                                </span>
                            </h3>
                            <p className="text-xs text-[#969EAF]">
                                {activeInspectionId
                                    ? `Active Specimen: ${activeInspectionId}`
                                    : `Evaluating ${inspections.length} recorded inspections`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#1C2130] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${msg.role === 'user'
                                        ? 'bg-[#5B3BC4] text-[#F1F2F6] rounded-br-none'
                                        : 'bg-[#161A24] text-[#D3D8E2] border border-[#292E3B] rounded-bl-none'
                                    }`}
                            >
                                <div className="whitespace-pre-wrap">{msg.content}</div>

                                {/* Grounded Sources Pill */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-2.5 pt-2 border-t border-[#292E3B] flex flex-wrap items-center gap-1.5 text-[10px] text-[#969EAF]">
                                        <Database className="w-3 h-3 text-[#A78BFA]" />
                                        <span>Sources:</span>
                                        {msg.sources.map((src, sIdx) => (
                                            <span
                                                key={sIdx}
                                                className="px-1.5 py-0.5 rounded bg-[#1C2130] text-[#B9A4FF] border border-[#292E3B]"
                                            >
                                                {src}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-[#737D90] mt-1 px-1">
                                {msg.role === 'user' ? 'Operator' : `Assistant (${msg.provider || 'AI Engine'})`}
                            </span>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-[#A78BFA] p-3 bg-[#161A24] border border-[#292E3B] rounded-lg max-w-[200px]">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Analyzing QC records...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Quick Queries */}
                <div className="px-4 py-2 border-t border-[#292E3B] bg-[#12151D] flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {samplePrompts.map((prompt, pIdx) => (
                        <button
                            key={pIdx}
                            onClick={() => handleSend(prompt)}
                            disabled={isLoading}
                            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded bg-[#1C2130] hover:bg-[#28223D] hover:text-[#A78BFA] text-[#969EAF] border border-[#292E3B] transition-colors"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-[#161A24] border-t border-[#292E3B]">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about anomaly heatmaps, inspection history, or evaluation metrics..."
                            className="flex-1 bg-[#10131B] border border-[#292E3B] rounded-lg px-3 py-2 text-xs text-[#F1F2F6] placeholder-[#737D90] focus:outline-none focus:border-[#A78BFA]"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="px-3 py-2 bg-[#5B3BC4] hover:bg-[#4C31A5] disabled:opacity-50 text-[#F1F2F6] rounded-lg transition-colors flex items-center justify-center"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
