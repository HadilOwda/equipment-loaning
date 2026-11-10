import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { generateKeyPairSync, sign } from 'node:crypto';
import { Amplify } from 'aws-amplify';
import { decodeJWT, fetchAuthSession } from 'aws-amplify/auth';
import { fetchAuthSession as fetchServerAuthSession } from 'aws-amplify/auth/server';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { generateClient } from 'aws-amplify/api';
import { parseAmplifyConfig, sharedInMemoryStorage } from 'aws-amplify/utils';
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { SimpleJwksCache } from 'aws-jwt-verify/jwk';
import { NextRequest, NextResponse } from 'next/server';
import outputs from '../../amplify_outputs.json';
import amplifyConfig from './amplify-config';

jest.mock('../../amplify_outputs.json', () => ({
    version: '1.3',
    auth: {
        aws_region: 'us-west-1',
        user_pool_id: 'us-west-1_TestPool',
        user_pool_client_id: 'test-client',
        identity_pool_id: 'us-west-1:00000000-0000-0000-0000-000000000000',
        unauthenticated_identities_enabled: true,
        oauth: {
            domain: 'test.auth.us-west-1.amazoncognito.com',
            identity_providers: ['GOOGLE'],
            redirect_sign_in_uri: ['http://localhost:3000/login/redirect'],
            redirect_sign_out_uri: ['http://localhost:3000'],
            response_type: 'code',
            scopes: ['openid', 'email', 'profile']
        }
    },
    data: {
        url: 'https://test.appsync-api.us-west-1.amazonaws.com/graphql',
        aws_region: 'us-west-1',
        default_authorization_type: 'AMAZON_COGNITO_USER_POOLS',
        authorization_types: ['AWS_IAM']
    }
}), { virtual: true });

describe('user-pool runtime configuration', () => {
    const identityError = "Invalid login token. Couldn't verify signed token.";
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const exportedJwk = publicKey.export({ format: 'jwk' });
    const publicJwk = {
        kty: 'RSA', kid: 'test-key', use: 'sig', alg: 'RS256',
        n: exportedJwk.n!, e: exportedJwk.e!
    };
    const token = (claims: Record<string, unknown>) => {
        const contents = [
            Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url'),
            Buffer.from(JSON.stringify({
                exp: Math.floor(Date.now() / 1000) + 3600,
                iss: 'https://cognito-idp.us-west-1.amazonaws.com/us-west-1_TestPool',
                ...claims
            })).toString('base64url')
        ].join('.');
        return `${contents}.${sign('RSA-SHA256', Buffer.from(contents), privateKey).toString('base64url')}`;
    };
    const accessToken = token({
        sub: 'test-user', username: 'test-user', token_use: 'access', client_id: 'test-client'
    });
    const idToken = token({
        sub: 'test-user',
        'cognito:username': 'test-user',
        iss: 'https://cognito-idp.us-west-1.amazonaws.com/us-west-1_TestPool',
        aud: 'test-client',
        token_use: 'id'
    });

    const configureSignedInUser = async (config: Parameters<typeof Amplify.configure>[0]) => {
        Amplify.configure(config);
        cognitoUserPoolsTokenProvider.setKeyValueStorage(sharedInMemoryStorage);
        await cognitoUserPoolsTokenProvider.authTokenStore.storeTokens({
            accessToken: decodeJWT(accessToken),
            idToken: decodeJWT(idToken),
            username: 'test-user',
            clockDrift: 0
        });
    };

    const readServerSession = async (access = accessToken) => {
        const prefix = `CognitoIdentityServiceProvider.${outputs.auth.user_pool_client_id}`;
        const cookie = [
            `${prefix}.LastAuthUser=test-user`,
            `${prefix}.test-user.accessToken=${access}`,
            `${prefix}.test-user.idToken=${idToken}`,
            `${prefix}.test-user.clockDrift=0`
        ].join('; ');
        const { runWithAmplifyServerContext } = createServerRunner({ config: amplifyConfig });
        return runWithAmplifyServerContext({
            nextServerContext: {
                request: new NextRequest('http://localhost:3000', { headers: { cookie } }),
                response: new NextResponse()
            },
            operation: context => fetchServerAuthSession(context)
        });
    };

    beforeEach(async () => {
        await sharedInMemoryStorage.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('preserves user-pool, OAuth, and data configuration without changing generated outputs', () => {
        const parsed = parseAmplifyConfig(amplifyConfig);
        expect(parsed.Auth?.Cognito.userPoolId).toBe(outputs.auth.user_pool_id);
        expect(parsed.Auth?.Cognito.userPoolClientId).toBe(outputs.auth.user_pool_client_id);
        expect(parsed.Auth?.Cognito.identityPoolId).toBeUndefined();
        expect(amplifyConfig.auth.oauth).toEqual(outputs.auth.oauth);
        expect(amplifyConfig.data).toEqual(outputs.data);
        expect(outputs.auth.identity_pool_id).toBeDefined();
    });

    test('reproduces the reported error when identity-pool exchange rejects a signed-in session', async () => {
        const request = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            __type: 'NotAuthorizedException',
            message: identityError
        }), { status: 400, headers: { 'content-type': 'application/x-amz-json-1.1' } }));
        await configureSignedInUser(outputs);
        await expect(fetchAuthSession()).rejects.toMatchObject({ message: identityError });
        expect(request).toHaveBeenCalled();
    });

    test('reads the signed-in session without making an identity-pool request', async () => {
        const request = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'));
        await configureSignedInUser(amplifyConfig);
        const session = await fetchAuthSession();
        expect(session.tokens?.accessToken.toString()).toBe(accessToken);
        expect(session.tokens?.idToken?.toString()).toBe(idToken);
        expect(session.credentials).toBeUndefined();
        expect(request).not.toHaveBeenCalled();
    });

    test('keeps a signed-out session unauthenticated without requesting guest credentials', async () => {
        const request = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'));
        Amplify.configure(amplifyConfig);
        cognitoUserPoolsTokenProvider.setKeyValueStorage(sharedInMemoryStorage);
        const session = await fetchAuthSession();
        expect(session.tokens).toBeUndefined();
        expect(session.credentials).toBeUndefined();
        expect(request).not.toHaveBeenCalled();
    });

    test('verifies signed session cookies on the server without an identity-pool exchange', async () => {
        jest.spyOn(SimpleJwksCache.prototype, 'getJwk').mockResolvedValue(publicJwk);
        const request = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected credential exchange'));
        const session = await readServerSession();
        expect(session.tokens?.accessToken.toString()).toBe(accessToken);
        expect(session.tokens?.idToken?.toString()).toBe(idToken);
        expect(session.credentials).toBeUndefined();
        expect(request).not.toHaveBeenCalled();
    });

    test('continues rejecting tokens with tampered signatures on the server', async () => {
        jest.spyOn(SimpleJwksCache.prototype, 'getJwk').mockResolvedValue(publicJwk);
        const request = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected credential exchange'));
        const tampered = accessToken.split('.');
        tampered[1] = Buffer.from(JSON.stringify({
            ...decodeJWT(accessToken).payload, 'cognito:groups': ['ADMINS']
        })).toString('base64url');
        const session = await readServerSession(tampered.join('.'));
        expect(session.tokens).toBeUndefined();
        expect(request).not.toHaveBeenCalled();
    });

    test('authenticates GraphQL with the access token without fetching AWS credentials', async () => {
        const request = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            data: { __typename: 'Query' }
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
        await configureSignedInUser(amplifyConfig);
        const client = generateClient();
        const result = await client.graphql({ query: 'query { __typename }', authMode: 'userPool' });
        expect(result).toEqual({ data: { __typename: 'Query' } });
        expect(request).toHaveBeenCalledTimes(1);
        const [url, init] = request.mock.calls[0];
        expect(String(url)).toBe(outputs.data.url);
        expect(new Headers(init?.headers).get('Authorization')).toBe(accessToken);
    });
});
