   import { TitleGenerationService } from '@src/services/TitleGenerationService';
   import { AIProviderInterface } from '@type/provider';
   import { ChatInterface } from '@type/chat';
   
   export class ServiceFactory {
     static createTitleGenerationService(
       provider: AIProviderInterface,
       updateCallback: (chats: ChatInterface[]) => void
     ): TitleGenerationService {
       return new TitleGenerationService(provider, updateCallback);
     }
   }