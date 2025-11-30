
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { toolsMap, functionDeclarations, systemInstruction } from '../services/geminiService';
import { SpeakerWaveIcon, SpeakerXMarkIcon, MicrophoneIcon } from './Icons';

interface VoiceChatProps {
    onClose: () => void;
    onMessage: (text: string, sender: 'user' | 'ai') => void;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ onClose, onMessage }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    
    // Audio Refs
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputNodeRef = useRef<GainNode | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sessionRef = useRef<any>(null);
    const isMutedRef = useRef(false);

    // Transcription accumulation
    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        let mounted = true;

        const startSession = async () => {
            try {
                if (!process.env.API_KEY) {
                    throw new Error("API Key missing");
                }
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                // Setup Audio
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                
                inputNodeRef.current = inputAudioContextRef.current.createGain();
                outputNodeRef.current = outputAudioContextRef.current.createGain();
                outputNodeRef.current.connect(outputAudioContextRef.current.destination);

                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

                const sessionPromise = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                            if (!mounted) return;
                            setStatus('connected');
                            
                            // Input Stream Setup
                            if (inputAudioContextRef.current && streamRef.current) {
                                const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                                const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                    if (!mounted || isMutedRef.current) return;
                                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                    const pcmBlob = createBlob(inputData);
                                    sessionPromise.then((session) => {
                                        session.sendRealtimeInput({ media: pcmBlob });
                                    });
                                };
                                source.connect(scriptProcessor);
                                scriptProcessor.connect(inputAudioContextRef.current.destination);
                            }
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            if (!mounted) return;

                            // Handle Input Transcription (User)
                            const inputTranscript = (message.serverContent as any)?.inputTranscription?.text;
                            if (inputTranscript) {
                                currentInputTranscription.current += inputTranscript;
                            }
                            
                            // Handle Output Transcription (Model)
                            const outputTranscript = (message.serverContent as any)?.outputTranscription?.text;
                            if (outputTranscript) {
                                currentOutputTranscription.current += outputTranscript;
                            }

                            // Commit Turn to Chat
                            if (message.serverContent?.turnComplete) {
                                if (currentInputTranscription.current.trim()) {
                                    onMessage(currentInputTranscription.current.trim(), 'user');
                                    currentInputTranscription.current = '';
                                }
                                if (currentOutputTranscription.current.trim()) {
                                    onMessage(currentOutputTranscription.current.trim(), 'ai');
                                    currentOutputTranscription.current = '';
                                }
                            }

                            // Handle Audio
                            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
                                setIsSpeaking(true);
                                const ctx = outputAudioContextRef.current;
                                const audioBuffer = await decodeAudioData(
                                    decode(base64Audio),
                                    ctx,
                                    24000,
                                    1
                                );
                                
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputNodeRef.current);
                                source.addEventListener('ended', () => {
                                    sourcesRef.current.delete(source);
                                    if (sourcesRef.current.size === 0) {
                                        setIsSpeaking(false);
                                    }
                                });
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                sourcesRef.current.add(source);
                            }

                            // Handle Interruption
                            if (message.serverContent?.interrupted) {
                                for (const source of sourcesRef.current.values()) {
                                    source.stop();
                                }
                                sourcesRef.current.clear();
                                nextStartTimeRef.current = 0;
                                setIsSpeaking(false);
                                
                                // Flush whatever transcription we have
                                if (currentOutputTranscription.current.trim()) {
                                    onMessage(currentOutputTranscription.current.trim(), 'ai');
                                    currentOutputTranscription.current = '';
                                }
                            }

                            // Handle Tool Calls
                            if (message.toolCall) {
                                for (const fc of message.toolCall.functionCalls) {
                                    const functionName = fc.name as keyof typeof toolsMap;
                                    let result;
                                    if (toolsMap[functionName]) {
                                        const args = fc.args as any;
                                        try {
                                             switch (functionName) {
                                                case 'getOrderStatus':
                                                    result = toolsMap.getOrderStatus(args.orderId);
                                                    break;
                                                case 'listUserOrders':
                                                    result = toolsMap.listUserOrders(args.userId);
                                                    break;
                                                case 'findProducts':
                                                    result = toolsMap.findProducts(args.query);
                                                    break;
                                                case 'submitFeedback':
                                                    result = toolsMap.submitFeedback(args.userId, args.rating, args.description);
                                                    break;
                                                case 'listUserTransactions':
                                                    result = toolsMap.listUserTransactions(args.userId);
                                                    break;
                                                case 'contactHumanSupport':
                                                    result = toolsMap.contactHumanSupport(args.name);
                                                    break;
                                                default:
                                                    result = { error: `Unknown function: ${functionName}` };
                                            }
                                        } catch (e: any) {
                                            result = { error: e.message };
                                        }
                                    } else {
                                        result = { error: `Function ${fc.name} not found` };
                                    }

                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: [{
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result }
                                            }]
                                        });
                                    });
                                }
                            }
                        },
                        onclose: () => {
                            if (mounted) setStatus('error');
                        },
                        onerror: (err) => {
                            console.error(err);
                            if (mounted) setStatus('error');
                        }
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                        },
                        inputAudioTranscription: {},
                        outputAudioTranscription: {}, // Enabled to capture AI response text
                        systemInstruction: `${systemInstruction}\n\nCurrent User: ${user?.fullName} (ID: ${user?.id})`,
                        tools: [{ functionDeclarations }]
                    }
                });
                
                sessionRef.current = sessionPromise;

            } catch (err) {
                console.error("Failed to connect to Live API", err);
                setStatus('error');
            }
        };

        startSession();

        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (inputAudioContextRef.current) inputAudioContextRef.current.close();
            if (outputAudioContextRef.current) outputAudioContextRef.current.close();
        };
    }, [user, onMessage]);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-light-bg dark:bg-dark-bg p-8 text-center relative overflow-hidden">
            <h2 className="text-2xl font-bold mb-8 text-light-text dark:text-dark-text z-10">Voice Mode</h2>
            
            <div className="relative w-64 h-64 flex items-center justify-center z-10">
                {/* Visualizer Rings */}
                {/* Ring 1 - Outer slow */}
                <div className={`absolute inset-0 rounded-full border border-light-accent dark:border-dark-accent opacity-20 transition-all duration-[2000ms] ease-out ${isSpeaking ? 'scale-150 border-2' : 'scale-75'}`}></div>
                
                {/* Ring 2 - Mid pulsing */}
                <div className={`absolute inset-4 rounded-full border border-light-accent dark:border-dark-accent opacity-40 transition-all duration-[1500ms] ease-in-out ${isSpeaking ? 'scale-125 border-2 animate-pulse' : 'scale-90'}`}></div>
                
                {/* Ring 3 - Inner fast */}
                <div className={`absolute inset-8 rounded-full border-2 border-light-accent dark:border-dark-accent opacity-60 transition-all duration-300 ${isSpeaking ? 'scale-110' : 'scale-95'}`}></div>
                
                {/* Active Wave Animation when Speaking */}
                 {isSpeaking && (
                    <>
                        <div className="absolute inset-0 rounded-full border-4 border-light-accent dark:border-dark-accent animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-light-accent dark:border-dark-accent animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] opacity-20"></div>
                    </>
                )}

                <div className={`z-10 w-32 h-32 rounded-full flex items-center justify-center bg-light-accent dark:bg-dark-accent text-white shadow-lg transition-transform duration-200 ${isSpeaking ? 'scale-110 shadow-light-accent/50 dark:shadow-dark-accent/50 shadow-2xl' : 'scale-100'}`}>
                    <MicrophoneIcon className="w-16 h-16" />
                </div>
            </div>

            <div className="mt-12 h-8 text-lg font-medium text-light-text/80 dark:text-dark-text/80 z-10 animate-fade-in">
                {status === 'connecting' && <span className="animate-pulse">Connecting to Gemini...</span>}
                {status === 'connected' && (
                    isSpeaking 
                        ? <span className="text-light-accent dark:text-dark-accent font-bold">Gemini is speaking...</span> 
                        : (isMuted ? "Microphone is muted" : "Listening...")
                )}
                {status === 'error' && <span className="text-red-500">Connection failed. Please try again.</span>}
            </div>

            <div className="mt-12 flex gap-6 z-10">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`px-8 py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-md flex items-center gap-3
                        ${isMuted 
                            ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                            : 'bg-white dark:bg-gray-800 text-light-text dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700 border border-light-border dark:border-dark-border'
                        }`}
                >
                    {isMuted ? <SpeakerXMarkIcon className="w-6 h-6"/> : <SpeakerWaveIcon className="w-6 h-6"/>}
                    {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button 
                    onClick={onClose}
                    className="px-8 py-4 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold transition-all transform hover:scale-105 shadow-md flex items-center gap-2"
                >
                    <span className="text-xl">×</span> End Session
                </button>
            </div>
        </div>
    );
};

// --- Helper Functions for Audio Processing ---

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export default VoiceChat;
