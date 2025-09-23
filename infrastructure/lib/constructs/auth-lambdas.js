import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class AuthLambdas extends Construct {
    registerFunction;
    loginFunction;
    logoutFunction;
    refreshFunction;
    profileFunction;
    constructor(scope, id, props) {
        super(scope, id);
        // Common environment variables for all auth lambdas
        const commonEnv = {
            NODE_ENV: props.environment,
            LOG_LEVEL: props.environment === 'prod' ? 'warn' : 'debug',
            TABLE_NAME: props.table.tableName,
            JWT_SECRET: 'temporary-secret-replace-with-secrets-manager', // TODO: Use AWS Secrets Manager
            JWT_EXPIRES_IN: '900', // 15 minutes in seconds
            REFRESH_TOKEN_EXPIRES_IN: '2592000' // 30 days in seconds
        };
        // Common Lambda configuration
        const commonConfig = {
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            memorySize: 512,
            environment: commonEnv,
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../packages/backend/dist/handlers'))
        };
        // Register Lambda
        this.registerFunction = new lambda.Function(this, 'RegisterFunction', {
            ...commonConfig,
            functionName: `social-media-app-register-${props.environment}`,
            handler: 'auth/register.handler',
            description: 'User registration handler'
        });
        // Login Lambda
        this.loginFunction = new lambda.Function(this, 'LoginFunction', {
            ...commonConfig,
            functionName: `social-media-app-login-${props.environment}`,
            handler: 'auth/login.handler',
            description: 'User login handler'
        });
        // Logout Lambda
        this.logoutFunction = new lambda.Function(this, 'LogoutFunction', {
            ...commonConfig,
            functionName: `social-media-app-logout-${props.environment}`,
            handler: 'auth/logout.handler',
            description: 'User logout handler'
        });
        // Refresh Token Lambda
        this.refreshFunction = new lambda.Function(this, 'RefreshFunction', {
            ...commonConfig,
            functionName: `social-media-app-refresh-${props.environment}`,
            handler: 'auth/refresh.handler',
            description: 'Token refresh handler'
        });
        // Profile Lambda
        this.profileFunction = new lambda.Function(this, 'ProfileFunction', {
            ...commonConfig,
            functionName: `social-media-app-profile-${props.environment}`,
            handler: 'auth/profile.handler',
            description: 'User profile handler'
        });
        // Grant DynamoDB permissions to all auth Lambdas
        const authLambdas = [
            this.registerFunction,
            this.loginFunction,
            this.logoutFunction,
            this.refreshFunction,
            this.profileFunction
        ];
        authLambdas.forEach(fn => {
            props.table.grantReadWriteData(fn);
            // Grant permissions to query GSI indexes
            fn.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['dynamodb:Query'],
                resources: [
                    `${props.table.tableArn}/index/GSI1`,
                    `${props.table.tableArn}/index/GSI2`
                ]
            }));
        });
    }
}
//# sourceMappingURL=auth-lambdas.js.map