# Stratos — AWS infrastructure

## `stratos-readonly-role.json`

CloudFormation template that creates the `StratosReadOnly` IAM role in a
customer's AWS account. The onboarding wizard links to this template via:

```
https://console.aws.amazon.com/cloudformation/home#/stacks/create/review
  ?stackName=StratosReadOnly
  &templateURL=https://stratos-cfn.s3.amazonaws.com/stratos-readonly-role.json
  &param_ExternalId=<user-specific-id>
  &param_StratosPrincipal=<stratos-aws-principal-arn>
```

### To publish (one-time per release):

```bash
# Create the bucket once
aws s3api create-bucket --bucket stratos-cfn --region us-east-1

# Make template publicly readable
aws s3api put-bucket-policy --bucket stratos-cfn --policy '{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow","Principal":"*",
    "Action":"s3:GetObject",
    "Resource":"arn:aws:s3:::stratos-cfn/*"
  }]
}'

# Upload the template
aws s3 cp stratos-readonly-role.json s3://stratos-cfn/stratos-readonly-role.json
```

### Permissions granted (read-only, no writes)

| Service | Actions |
|---------|---------|
| EC2 | Describe* (instances, volumes, snapshots, reserved, savings plans) |
| CloudWatch | GetMetricStatistics, GetMetricData, ListMetrics |
| Cost Explorer | GetCostAndUsage, GetCostForecast, GetRightsizingRecommendation |
| RDS | DescribeDBInstances, DescribeDBClusters |
| S3 | ListAllMyBuckets, GetBucketLocation |
| STS | GetCallerIdentity |

No write permissions exist in the policy. The external ID condition prevents
confused-deputy attacks.
