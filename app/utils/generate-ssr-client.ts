import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import amplifyConfig from './amplify-config';
import { type Schema } from '@/amplify/data/resource'
import { cookies } from 'next/headers';

export default function generateSSRClient() {
    return generateServerClientUsingCookies<Schema>({
        config: amplifyConfig,
        cookies
    });
}
