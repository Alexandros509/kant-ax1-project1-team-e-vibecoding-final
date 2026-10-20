import type { NextConfig } from 'next';
const nextConfig:NextConfig={
 serverExternalPackages:['@electric-sql/pglite'],

 turbopack:{rules:{'*.css':{condition:{not:{path:'*.module.css'}},loaders:['@tailwindcss/turbopack'],as:'*.css'}}},
};
export default nextConfig;
