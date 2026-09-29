#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { EdgeBeaconStack } from "../lib/edge-beacon-stack";

const app = new App();
new EdgeBeaconStack(app, "EdgeBeaconStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
