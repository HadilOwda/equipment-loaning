import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export default function listenForSignIn(
    onSignedIn: () => void,
    onError: (error: unknown) => void
): () => void {
    let active = true;
    let completed = false;

    const complete = () => {
        if (active && !completed) {
            completed = true;
            onSignedIn();
        }
    };

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
        if (payload.event === 'signInWithRedirect') {
            complete();
        } else if (active && !completed && payload.event === 'signInWithRedirect_failure') {
            completed = true;
            onError(payload);
        }
    });

    // OAuth may finish before React mounts this listener. The SDK waits for any
    // in-flight OAuth exchange here, so an existing session also completes login.
    void fetchAuthSession().then(({ tokens }) => {
        if (tokens?.accessToken && tokens.idToken) {
            complete();
        }
    }).catch(error => {
        if (active && !completed) {
            completed = true;
            onError(error);
        }
    });

    return () => {
        active = false;
        unsubscribe();
    };
}
