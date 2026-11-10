import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import listenForSignIn from './listen-for-sign-in';

jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn() }));
jest.mock('aws-amplify/utils', () => ({ Hub: { listen: jest.fn() } }));

describe('listenForSignIn', () => {
    const fetchSession = jest.mocked(fetchAuthSession);
    const listen = jest.mocked(Hub.listen);
    const unsubscribe = jest.fn();
    const onSignedIn = jest.fn();
    const onError = jest.fn();
    const signedInSession = {
        tokens: {
            accessToken: { payload: {}, toString: () => 'access-token' },
            idToken: { payload: {}, toString: () => 'id-token' }
        }
    };
    const onAuthEvent = (event: { payload: { event: string } }) => {
        listen.mock.calls[0][1]({ channel: 'auth', ...event });
    };

    beforeEach(() => {
        jest.clearAllMocks();
        fetchSession.mockResolvedValue({});
        listen.mockReturnValue(unsubscribe);
    });

    test('completes when OAuth succeeded before the listener mounted', async () => {
        fetchSession.mockResolvedValue(signedInSession);
        listenForSignIn(onSignedIn, onError);
        await Promise.resolve();
        expect(onSignedIn).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
    });

    test('waits for an auth event when no session exists yet', async () => {
        listenForSignIn(onSignedIn, onError);
        await Promise.resolve();
        expect(onSignedIn).not.toHaveBeenCalled();
        onAuthEvent({ payload: { event: 'signInWithRedirect' } });
        expect(onSignedIn).toHaveBeenCalledTimes(1);
    });

    test('only completes once when the event and session both confirm sign-in', async () => {
        fetchSession.mockResolvedValue(signedInSession);
        listenForSignIn(onSignedIn, onError);
        onAuthEvent({ payload: { event: 'signInWithRedirect' } });
        await Promise.resolve();
        expect(onSignedIn).toHaveBeenCalledTimes(1);
    });

    test('does not accept a partial session missing an ID token', async () => {
        fetchSession.mockResolvedValue({ tokens: { accessToken: signedInSession.tokens.accessToken } });
        listenForSignIn(onSignedIn, onError);
        await Promise.resolve();
        expect(onSignedIn).not.toHaveBeenCalled();
    });

    test('reports a failed OAuth exchange without navigating', async () => {
        listenForSignIn(onSignedIn, onError);
        const event = { payload: { event: 'signInWithRedirect_failure' } };
        onAuthEvent(event);
        await Promise.resolve();
        expect(onError).toHaveBeenCalledWith(event.payload);
        expect(onSignedIn).not.toHaveBeenCalled();
    });

    test('reports a session read failure without navigating', async () => {
        const error = new Error('Session unavailable');
        fetchSession.mockRejectedValue(error);
        listenForSignIn(onSignedIn, onError);
        await Promise.resolve();
        await Promise.resolve();
        expect(onError).toHaveBeenCalledWith(error);
        expect(onSignedIn).not.toHaveBeenCalled();
    });

    test('unsubscribes and ignores pending session results after unmount', async () => {
        fetchSession.mockResolvedValue(signedInSession);
        const cleanup = listenForSignIn(onSignedIn, onError);
        cleanup();
        await Promise.resolve();
        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(onSignedIn).not.toHaveBeenCalled();
    });

    test('ignores a session failure after unmount', async () => {
        fetchSession.mockRejectedValue(new Error('Session unavailable'));
        const cleanup = listenForSignIn(onSignedIn, onError);
        cleanup();
        await Promise.resolve();
        await Promise.resolve();
        expect(onError).not.toHaveBeenCalled();
    });
});
