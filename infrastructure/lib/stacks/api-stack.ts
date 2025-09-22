import { Stack, type StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ApiStackProps extends StackProps {
  environment: string;
}

export class ApiStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create Lambda function for Hello endpoint
    const helloLambda = new lambda.Function(this, 'HelloFunction', {
      functionName: `social-media-app-hello-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X, // Node 22 not yet available in CDK
      handler: 'hello.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../packages/backend/dist/handlers')
      ),
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
        allowOrigins: props.environment === 'prod'
          ? ['https://yourdomain.com'] // Replace with actual production domain when available
          : ['http://localhost:3000', 'http://localhost:5173'], // Development origins
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
          apigateway.CorsHttpMethod.PATCH
        ],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Correlation-Id'
        ],
        exposeHeaders: ['X-Correlation-Id'],
        allowCredentials: false,
        maxAge: Duration.hours(1)
      }
    });

    // Add Hello route
    httpApi.addRoutes({
      path: '/hello',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'HelloIntegration',
        helloLambda
      )
    });

    // Add explicit OPTIONS route for CORS debugging
    // This helps with preflight request debugging and ensures proper CORS headers
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigateway.HttpMethod.OPTIONS],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'OptionsIntegration',
        helloLambda, // Temporary - will be replaced when CORS handler is created
        {
          responseParameters: {
            'overwrite:header.Access-Control-Allow-Origin': props.environment === 'prod'
              ? 'https://yourdomain.com'
              : '*',
            'overwrite:header.Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Correlation-Id',
            'overwrite:header.Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
            'overwrite:header.Access-Control-Max-Age': '3600'
          }
        }
      )
    });

    // Output the API URL
    this.apiUrl = httpApi.url!;
    new CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'HTTP API Gateway URL'
    });
  }
}