1. Conceptual View - High-level components and their relationships
2. Logical View - Classes, interfaces, and their interactions
3. Process View - Runtime behavior and communication
4. Physical View - Deployment and infrastructure
5. Development View - Code organization and module structure

Provider Component:
- AIProviderInterface
- AIProviderBase
- AnthropicProvider
- OpenAIProvider
- ProviderRegistry
- ProviderFactory

Submission Component:
- ChatSubmissionServiceInterface
- ChatSubmissionService
- StreamingSubmissionService

Storage Component:
- StorageServiceInterface
- StorageService


```mermaid

graph TD
subgraph "Provider Layer"
PC[Provider Components]
PC --> PI[Provider Interfaces]
PC --> PR[Provider Registry]
PC --> PF[Provider Factory]
end

    subgraph "Service Layer"
        SC[Service Components]
        SC --> SI[Service Interfaces]
        SC --> SS[Submission Services]
        SC --> ST[Storage Services]
    end
    
    subgraph "UI Layer"
        UI[UI Components]
        UI --> HC[Hook Components]
        UI --> RC[React Components]
    end
    
    UI --> SC
    SC --> PC
```
