// AWS Configuration for knowyou-production
// This replaces the Supabase configuration

export const awsConfig = {
  // Cognito Configuration
  cognito: {
    userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID || 'us-east-1_aD2DjAj9l',
    clientId: import.meta.env.VITE_AWS_CLIENT_ID || '2ookqtrm3ib5hs17ra3jtfoanv',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  },

  // RDS/PostgREST Configuration
  database: {
    // PostgREST running on EC2 instance
    endpoint: import.meta.env.VITE_AWS_DB_ENDPOINT || 'http://54.167.120.179:3000',
  },

  // S3 Configuration
  storage: {
    bucket: import.meta.env.VITE_AWS_S3_BUCKET || 'knowyou-storage-1768358037',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  }
};

// RDS Direct Connection (for server-side only)
export const rdsConfig = {
  host: 'knowyou-db.ce56ccwgkc7o.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'knowyou',
  user: 'postgres',
  // Password should be in environment variable
};
