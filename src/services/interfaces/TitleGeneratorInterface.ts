   import { MessageInterface, ModelConfig } from '@type/chat';
   
   export interface TitleGeneratorInterface {
     generateChatTitle: (messages: MessageInterface[], config: ModelConfig) => Promise<string>;
   }