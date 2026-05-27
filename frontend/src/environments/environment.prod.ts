export const environment = {
  production: true,
  apiUrl: ''
  // apiUrl stays empty — CloudFront routes /api/* to EC2 on the same domain.
  // If you later split to a dedicated API subdomain (e.g. api.yourdomain.com),
  // change this to 'https://api.yourdomain.com' and update the CloudFront behavior.
};
