import { Construct } from "constructs";
import * as path from "node:path";
import { RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";

export interface SiteConstructProps {
  /** [apex, www] custom domain names, or omit to use only the CloudFront-issued domain. */
  domainNames?: [string, string];
  certificate?: acm.ICertificate;
  hostedZone?: route53.IHostedZone;
}

/**
 * The static SPA shell (dist/client) behind CloudFront. The /api/* behavior
 * is added later by ApiConstruct.addBehavior on this same distribution.
 */
export class SiteConstruct extends Construct {
  readonly bucket: s3.Bucket;
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SiteConstructProps = {}) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "Bucket", {
      versioned: true, // lets a bad deploy's prior static assets be recovered
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // ponytail: no edge-level auth gate here. A CloudFront Function that
    // blocked unauthenticated requests to /assets/* was tried and removed —
    // it also blocked the JS bundle that runs the Cognito sign-in redirect,
    // so a first-time visitor could never reach login at all (confirmed
    // live: a fresh browser got a 403 on the JS/CSS and an unstyled, inert
    // page with no way forward). There's no way to serve "the code that
    // starts login" separately from "the app bundle" without splitting the
    // build, which isn't worth it here. The real security boundary is the
    // API's JWT check (server/auth.ts) — unaffected by this. Anyone can
    // still curl the static JS bundle directly; it contains only this app's
    // sample catalog/customer data (shared/edge-data.ts), already accepted
    // as a known, low-stakes exposure for an internal planning tool.
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      domainNames: props.domainNames,
      certificate: props.certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new s3deploy.BucketDeployment(this, "Deploy", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../../dist/client")),
      ],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"], // auto-invalidates on every deploy
    });

    if (props.domainNames && props.hostedZone) {
      const target = route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution),
      );
      // ALIAS (not CNAME): the only way Route 53 can point the bare apex
      // domain directly at CloudFront — a plain CNAME isn't legal on an
      // apex/zone-root record.
      new route53.ARecord(this, "ApexAliasA", {
        zone: props.hostedZone,
        recordName: props.domainNames[0],
        target,
      });
      new route53.AaaaRecord(this, "ApexAliasAAAA", {
        zone: props.hostedZone,
        recordName: props.domainNames[0],
        target,
      });
      new route53.ARecord(this, "WwwAliasA", {
        zone: props.hostedZone,
        recordName: props.domainNames[1],
        target,
      });
      new route53.AaaaRecord(this, "WwwAliasAAAA", {
        zone: props.hostedZone,
        recordName: props.domainNames[1],
        target,
      });
    }
  }
}
