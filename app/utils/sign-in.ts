import { signInWithRedirect, signOut } from 'aws-amplify/auth';
import { toast } from 'sonner';
import handleError from './handle-error';

export default async function signIn(): Promise<void> {
    try {
        await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
        if (error instanceof Error && error.name === 'UserAlreadyAuthenticatedException') {
            toast.error('Your browser already has a sign-in session. Sign out to reset it, then try again.', {
                duration: Infinity,
                action: {
                    label: 'Sign out and retry',
                    onClick: async () => {
                        try {
                            await signOut();
                        } catch (signOutError) {
                            handleError(signOutError);
                        }
                    }
                }
            });
        } else {
            handleError(error);
        }
    }
}
