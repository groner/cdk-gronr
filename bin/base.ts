#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';

const app = new cdk.App();
const gronr = new BaseStack(app, 'GronrStack');

const adminUser = gronr.node.tryGetContext('gronr/admin');
if (adminUser)
  gronr.makeAdmin(adminUser);
