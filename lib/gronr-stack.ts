import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
export class GronrStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
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
}
