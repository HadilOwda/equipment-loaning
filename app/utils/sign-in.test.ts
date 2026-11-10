import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { signInWithRedirect, signOut } from 'aws-amplify/auth';
import { toast } from 'sonner';
import handleError from './handle-error';
import signIn from './sign-in';

jest.mock('aws-amplify/auth', () => ({ signInWithRedirect: jest.fn(), signOut: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('./handle-error', () => ({ __esModule: true, default: jest.fn() }));

describe('signIn', () => {
    const redirect = jest.mocked(signInWithRedirect);
    const logout = jest.mocked(signOut);
    const toastError = jest.mocked(toast.error);
    const reportError = jest.mocked(handleError);
    const alreadySignedIn = new Error('There is already a signed in user.');
    alreadySignedIn.name = 'UserAlreadyAuthenticatedException';

    const recover = async () => {
        const action = toastError.mock.calls[0][1]?.action;
        if (!action || typeof action !== 'object' || !('onClick' in action)) {
            throw new Error('Expected a sign-out recovery action');
        }
        await Reflect.apply(action.onClick, undefined, []);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        redirect.mockResolvedValue(undefined);
        logout.mockResolvedValue(undefined);
    });

    test('starts Google sign-in', async () => {
        await signIn();
        expect(redirect).toHaveBeenCalledWith({ provider: 'Google' });
        expect(logout).not.toHaveBeenCalled();
        expect(toastError).not.toHaveBeenCalled();
    });

    test('offers recovery for an existing browser session without signing out automatically', async () => {
        redirect.mockRejectedValue(alreadySignedIn);
        await signIn();
        expect(toastError).toHaveBeenCalledWith(expect.stringContaining('already has a sign-in session'), {
            duration: Infinity,
            action: { label: 'Sign out and retry', onClick: expect.any(Function) }
        });
        expect(logout).not.toHaveBeenCalled();
        expect(reportError).not.toHaveBeenCalled();
    });

    test('recovery signs out the current session when selected', async () => {
        redirect.mockRejectedValue(alreadySignedIn);
        await signIn();
        await recover();
        expect(logout).toHaveBeenCalledWith();
        expect(reportError).not.toHaveBeenCalled();
    });

    test('reports sign-out failures', async () => {
        const error = new Error('Sign-out failed');
        redirect.mockRejectedValue(alreadySignedIn);
        logout.mockRejectedValue(error);
        await signIn();
        await recover();
        expect(reportError).toHaveBeenCalledWith(error);
    });

    test('reports other sign-in errors', async () => {
        const error = new Error('OAuth unavailable');
        redirect.mockRejectedValue(error);
        await signIn();
        expect(reportError).toHaveBeenCalledWith(error);
        expect(logout).not.toHaveBeenCalled();
        expect(toastError).not.toHaveBeenCalled();
    });
});
