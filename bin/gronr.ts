#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { GronrStack } from '../lib/gronr-stack';

const app = new cdk.App();
const gronr = new GronrStack(app, 'GronrStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const adminUser = gronr.node.tryGetContext('gronr/admin');
if (adminUser)
  gronr.makeAdmin(adminUser);
