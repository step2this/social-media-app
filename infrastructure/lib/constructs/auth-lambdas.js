import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
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
            JWT_SECRET: process.env.JWT_SECRET || 'development-secret-change-in-production',
            JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-in-production',
            JWT_EXPIRES_IN: '900', // 15 minutes in seconds
            REFRESH_TOKEN_EXPIRES_IN: '2592000' // 30 days in seconds
        };
        // Common NodejsFunction configuration for proper bundling
        const commonConfig = {
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            memorySize: 512,
            environment: commonEnv,
            // Point to project root for workspace dependency resolution
            projectRoot: path.join(__dirname, '../../../'),
            depsLockFilePath: path.join(__dirname, '../../../pnpm-lock.yaml'),
            bundling: {
                format: OutputFormat.ESM,
                target: 'es2022',
                platform: 'node',
                mainFields: ['module', 'main']
            }
        };
        // Register Lambda
        this.registerFunction = new NodejsFunction(this, 'RegisterFunction', {
            ...commonConfig,
            functionName: `social-media-app-register-${props.environment}`,
            entry: path.join(__dirname, '../../../packages/backend/src/handlers/auth/register.ts'),
            handler: 'handler',
            description: 'User registration handler'
        });
        // Login Lambda
        this.loginFunction = new NodejsFunction(this, 'LoginFunction', {
            ...commonConfig,
            functionName: `social-media-app-login-${props.environment}`,
            entry: path.join(__dirname, '../../../packages/backend/src/handlers/auth/login.ts'),
            handler: 'handler',
            description: 'User login handler'
        });
        // Logout Lambda
        this.logoutFunction = new NodejsFunction(this, 'LogoutFunction', {
            ...commonConfig,
            functionName: `social-media-app-logout-${props.environment}`,
            entry: path.join(__dirname, '../../../packages/backend/src/handlers/auth/logout.ts'),
            handler: 'handler',
            description: 'User logout handler'
        });
        // Refresh Token Lambda
        this.refreshFunction = new NodejsFunction(this, 'RefreshFunction', {
            ...commonConfig,
            functionName: `social-media-app-refresh-${props.environment}`,
            entry: path.join(__dirname, '../../../packages/backend/src/handlers/auth/refresh.ts'),
            handler: 'handler',
            description: 'Token refresh handler'
        });
        // Profile Lambda
        this.profileFunction = new NodejsFunction(this, 'ProfileFunction', {
            ...commonConfig,
            functionName: `social-media-app-profile-${props.environment}`,
            entry: path.join(__dirname, '../../../packages/backend/src/handlers/auth/profile.ts'),
            handler: 'handler',
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