import { Construct } from "constructs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export interface DomainConstructProps {
  /** The apex domain, e.g. "edgebeaconai.com". www is added automatically. */
  domainName: string;
}

/**
 * Route 53 hosted zone + ACM certificate for the custom domain. The zone is
 * created here (not imported) — the domain is registered at GoDaddy, not
 * Route 53, so there's no existing zone to import. After first deploy, point
 * the domain's nameservers at this zone's NS records (see the stack output).
 */
export class DomainConstruct extends Construct {
  readonly hostedZone: route53.HostedZone;
  readonly certificate: acm.Certificate;
  /** [apex, www] — both covered by the certificate and served by CloudFront. */
  readonly domainNames: [string, string];

  constructor(scope: Construct, id: string, props: DomainConstructProps) {
    super(scope, id);

    this.hostedZone = new route53.HostedZone(this, "Zone", {
      zoneName: props.domainName,
    });

    this.domainNames = [props.domainName, `www.${props.domainName}`];

    // us-east-1 is mandatory here regardless of the stack's own region:
    // CloudFront only accepts certificates from us-east-1's ACM.
    this.certificate = new acm.Certificate(this, "Certificate", {
      domainName: props.domainName,
      subjectAlternativeNames: [this.domainNames[1]],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });
  }
}
