import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

export class BaseStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
  }

  users: Record<string, iam.User> = {};
  roles: Record<string, iam.Role> = {};

  addAdmin(name: string) {
    const user = new iam.User(
      this, 'user', {
        userName: name,
      });
    user.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('job-function/ViewOnlyAccess'));
    this.users[user.userName] = user;
    this.makeAdmin(user);
  }

  makeAdmin(name: string | iam.User) {
    const user = typeof name === 'string'
      ? iam.User.fromUserName(this, 'user', name)
      : name;

    const role = new iam.Role(
      this, 'sudoer', {
        roleName: `sudo-${name}`,
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
}
