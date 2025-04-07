import { getEnvVar } from '@utils/env';

export const officialAPIEndpoint = 'https://api.openai.com/v1/chat/completions';
export const defaultAPIEndpoint = getEnvVar('VITE_DEFAULT_API_ENDPOINT', officialAPIEndpoint);

export const availableEndpoints = [officialAPIEndpoint];
