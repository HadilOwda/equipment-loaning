import outputs from '../../amplify_outputs.json';

// This app authenticates GraphQL requests with user-pool tokens. An identity
// pool would also exchange those tokens for AWS credentials on every server
// session check, making sign-in depend on an unrelated credential exchange.
const amplifyConfig = {
    ...outputs,
    auth: {
        ...outputs.auth,
        identity_pool_id: undefined
    }
};

export default amplifyConfig;
