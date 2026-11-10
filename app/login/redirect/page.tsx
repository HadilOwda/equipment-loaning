'use client'

import useAmplify from '@/app/hooks/use-amplify'
import 'aws-amplify/auth/enable-oauth-listener';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useEffect } from 'react';
import handleError from '@/app/utils/handle-error';
import listenForSignIn from '@/app/utils/listen-for-sign-in';

export default function LoginRedirect() {
    useAmplify();

    useEffect(() => listenForSignIn(() => {
        // Start a fresh server request with the new cookies and clear logged-out
        // route state. Replace also keeps the OAuth callback out of Back history.
        window.location.replace('/');
    }, handleError), []);

    return (
        <div className='flex items-center justify-center h-full'>
            <Card className='w-full max-w-md'>
                <CardContent>
                    <div className='flex justify-center items-center gap-2'>
                        <Spinner />
                        <div>Logging in...</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
