import { Stack, CfnOutput, Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class ApiStack extends Stack {
    apiUrl;
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create Lambda function for Hello endpoint
        const helloLambda = new lambda.Function(this, 'HelloFunction', {
            functionName: `social-media-app-hello-${props.environment}`,
            runtime: lambda.Runtime.NODEJS_20_X, // Node 22 not yet available in CDK
            handler: 'hello.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../packages/backend/dist/handlers')),
            timeout: Duration.seconds(30),
            memorySize: 512,
            environment: {
                NODE_ENV: props.environment,
                LOG_LEVEL: props.environment === 'prod' ? 'warn' : 'debug'
            }
        });
        // Create HTTP API Gateway
        const httpApi = new apigateway.HttpApi(this, 'HttpApi', {
            apiName: `social-media-app-api-${props.environment}`,
            corsPreflight: {
                allowOrigins: ['*'],
                allowMethods: [
                    apigateway.CorsHttpMethod.GET,
                    apigateway.CorsHttpMethod.POST,
                    apigateway.CorsHttpMethod.PUT,
                    apigateway.CorsHttpMethod.DELETE,
                    apigateway.CorsHttpMethod.OPTIONS
                ],
                allowHeaders: ['Content-Type', 'Authorization']
            }
        });
        // Add Hello route
        httpApi.addRoutes({
            path: '/hello',
            methods: [apigateway.HttpMethod.POST],
            integration: new apigatewayIntegrations.HttpLambdaIntegration('HelloIntegration', helloLambda)
        });
        // Output the API URL
        this.apiUrl = httpApi.url;
        new CfnOutput(this, 'ApiUrl', {
            value: this.apiUrl,
            description: 'HTTP API Gateway URL'
        });
    }
}
//# sourceMappingURL=api-stack.js.map