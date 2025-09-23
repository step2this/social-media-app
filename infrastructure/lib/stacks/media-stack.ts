import { Stack, type StackProps, CfnOutput, RemovalPolicy, Duration } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';

interface MediaStackProps extends StackProps {
  environment: string;
}

export class MediaStack extends Stack {
  public readonly mediaBucket: s3.Bucket;
  public readonly mediaDistribution: cloudfront.Distribution;
  public readonly bucketName: string;
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: MediaStackProps) {
    super(scope, id, props);

    // Create S3 bucket for media storage
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `social-media-app-media-${props.environment}-${this.account}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.environment === 'prod'
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== 'prod',
      cors: [
        {
          allowedOrigins: props.environment === 'prod'
            ? ['https://yourdomain.com'] // Replace with actual domain
            : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000
        }
      ],
      lifecycleRules: [
        {
          id: 'delete-incomplete-uploads',
          abortIncompleteMultipartUploadAfter: Duration.days(1),
          enabled: true
        },
        {
          id: 'transition-old-media',
          enabled: true,
          transitions: [
            {
              transitionAfter: Duration.days(90),
              storageClass: s3.StorageClass.INFREQUENT_ACCESS
            }
          ]
        }
      ]
    });

    // Create CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'MediaOAI',
      {
        comment: `OAI for ${props.environment} media bucket`
      }
    );

    // Grant CloudFront read access to the bucket
    this.mediaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.mediaBucket.arnForObjects('*')],
        principals: [originAccessIdentity.grantPrincipal]
      })
    );

    // Create CloudFront distribution for media delivery
    this.mediaDistribution = new cloudfront.Distribution(this, 'MediaDistribution', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(this.mediaBucket, {
          originAccessIdentity
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new cloudfront.CachePolicy(this, 'MediaCachePolicy', {
          cachePolicyName: `social-media-media-cache-${props.environment}`,
          defaultTtl: Duration.days(7),
          maxTtl: Duration.days(365),
          minTtl: Duration.seconds(0),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList('v', 'w', 'h')
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          ttl: Duration.minutes(5)
        },
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          ttl: Duration.minutes(5)
        }
      ],
      comment: `Media CDN for ${props.environment} environment`
    });

    // Store important values
    this.bucketName = this.mediaBucket.bucketName;
    this.distributionDomainName = this.mediaDistribution.distributionDomainName;

    // Output values
    new CfnOutput(this, 'MediaBucketName', {
      value: this.bucketName,
      description: 'Name of the media S3 bucket'
    });

    new CfnOutput(this, 'MediaDistributionDomain', {
      value: this.distributionDomainName,
      description: 'CloudFront distribution domain for media'
    });

    new CfnOutput(this, 'MediaDistributionId', {
      value: this.mediaDistribution.distributionId,
      description: 'CloudFront distribution ID'
    });
  }
}