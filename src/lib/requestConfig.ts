import { ModelConfig } from '@type/chat';

export interface RequestConfig extends ModelConfig {
  stream?: boolean;
  thinking?: {
    type: string;
    enabled: boolean;
  };
}