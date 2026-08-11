import { cookies } from 'next/headers';
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import outputs from '@/amplify_outputs.json';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { ADMIN_GROUP } from '@/amplify/auth/constants';

interface GetAuthStateReturnValue {
    isUserAuthenticated: boolean;
    isUserAdmin: boolean;  // false if isUserAuthenticated is false
}

export default async function getAuthState(): Promise<GetAuthStateReturnValue> {
    const { runWithAmplifyServerContext } = createServerRunner({
        config: outputs
    });

    let session = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: async (contextSpec) => {
            // Use `fetchAuthSession` imported from `aws-amplify/auth/server`
            return await fetchAuthSession(contextSpec);
        }
    });

    const accessToken = session.tokens?.accessToken;
    const idToken = session.tokens?.idToken;

    const isUserAuthenticated = (
        accessToken !== undefined &&
        idToken !== undefined
    );

    // Cognito omits `cognito:groups` entirely when the user belongs to no groups,
    // so this cannot be cast to string[] and indexed directly.
    const groups = accessToken?.payload['cognito:groups'];

    const isUserAdmin = (
        isUserAuthenticated &&
        Array.isArray(groups) &&
        groups.includes(ADMIN_GROUP)
    )

    return {
        isUserAuthenticated,
        isUserAdmin
    };
}