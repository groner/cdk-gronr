import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';

export class GronrStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const zoneStack = new GronrOrgZoneStack(this, 'gronr-org-zone-stack', props);
    this.addDependency(zoneStack);

    const dnsUpdateUser = this.addDNSUpdateUser();
    dnsUpdateUser.addToPolicy(
      zoneStack.getUpdatePolicyStatement());
  }

  users: Record<string, iam.User> = {};
  roles: Record<string, iam.Role> = {};

  addAdmin(name: string) {
    const user = new iam.User(
      this, `user=${name}`, {
        userName: name,
      });
    user.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('job-function/ViewOnlyAccess'));
    this.users[user.userName] = user;
    this.makeAdmin(user);
  }

  makeAdmin(user_or_name: string | iam.User) {
    const user = typeof user_or_name === 'string'
      ? iam.User.fromUserName(this, `user=${user_or_name}`, user_or_name)
      : user_or_name;

    const role = new iam.Role(
      this, `role=sudo-${user.userName}`, {
        roleName: `sudo-${user.userName}`,
        assumedBy: new iam.ArnPrincipal(user.userArn)
          .withConditions({
            "Bool": {
              "aws:MultiFactorAuthPresent": "true"
            }
          }),
      });
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    this.roles[role.roleName] = role;
  }

  addDNSUpdateUser() {
    const user = new iam.User(this, 'dns-update-user', {
      path: '/robots/',
    });

    const access_key = new iam.CfnAccessKey(this, 'dns-update-user-accesskey', {
      userName: user.userName,
    });

    new cdk.CfnOutput(this, 'output=accesskeyid', {
      exportName: 'DNSUpdateAccessKeyId',
      value: access_key.ref,
    });
    new cdk.CfnOutput(this, 'output=accesskey', {
      exportName: 'DNSUpdateAccessKey',
      value: access_key.attrSecretAccessKey,
    });

    return user;
  }
}

export class GronrOrgZoneStack extends cdk.Stack {
  zone: route53.IHostedZone;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = 'gronr.org';

    // The code that defines your stack goes here
    this.zone = route53.HostedZone.fromLookup(this, 'zone', {
      domainName,
      privateZone: false,
    });

    new route53.MxRecord(this, 'mx', {
      zone: this.zone,
      ttl: cdk.Duration.days(1),
      values: [
        {priority: 1, hostName: 'aspmx.l.google.com.'},
        {priority: 5, hostName: 'alt1.aspmx.l.google.com.'},
        {priority: 5, hostName: 'alt2.aspmx.l.google.com.'},
        {priority: 10, hostName: 'aspmx2.googlemail.com.'},
        {priority: 10, hostName: 'aspmx3.googlemail.com.'},
      ]});

    // TODO: how to expose txt RRset for other purposes?
    new route53.TxtRecord(this, 'txt', {
      zone: this.zone,
      ttl: cdk.Duration.days(1),
      values: [
        'v=spf1 include:_spf.google.com ~all',
      ]});
  }

  addDomainKey(selector: string, rrValue: string, subdomain: string='') {
    const name = `${selector}._domainkey.${subdomain}`;

    new route53.TxtRecord(this, 'dkim=${name}', {
      zone: this.zone,
      recordName: name,
      ttl: cdk.Duration.days(1),
      values: [
        rrValue,
      ]});
  }

  getUpdatePolicyStatement() {
    return iam.PolicyStatement.fromJson({
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": `arn:aws:route53:::hostedzone/${this.zone.hostedZoneId}`
    });
  }
}
