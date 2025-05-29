import { CapabilityDefinition, CapabilityContext } from '@type/capability';
import { ProviderKey } from '@type/chat';
import { FormattedRequest, ProviderResponse } from '@type/provider';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { FileUploadConfig } from '@components/ConfigMenu/FileUploadConfig';
import { capabilityRegistry } from './registry';

export const FileUploadCapability: CapabilityDefinition = {
  id: 'file_upload',
  name: 'File Upload',
  priority: 200,
  
  isSupported: (provider: ProviderKey) => 
    ProviderRegistry.getProviderCapabilities(provider)?.supportsFileUpload || false,
  
  configComponent: FileUploadConfig,
  
  formatRequestMiddleware: (request: FormattedRequest, context: CapabilityContext): FormattedRequest => {
    const { modelConfig } = context;
    
    if (!modelConfig.capabilities?.file_upload?.enabled) {
      return request;
    }
    
    return {
      ...request,
      file_upload: {
        enabled: true,
        maxFiles: modelConfig.capabilities.file_upload.maxFiles || 5,
        maxSizePerFile: modelConfig.capabilities.file_upload.maxSizePerFile || 10 * 1024 * 1024
      }
    };
  }
};

// Register the capability
capabilityRegistry.registerCapability(FileUploadCapability);