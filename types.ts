
export interface User {
  id: number;
  fullName: string;
  email: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

export interface Chat {
  id: string;
  name: string;
  messages: Message[];
}
