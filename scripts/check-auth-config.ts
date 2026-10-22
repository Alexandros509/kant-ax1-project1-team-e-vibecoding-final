import { loadEnvConfig } from '@next/env';
import { supabaseAuthConfig } from '../src/lib/supabase-auth';
loadEnvConfig(process.cwd());
const config = supabaseAuthConfig();
console.log(
    JSON.stringify(
        {
            configured: !!config,
            projectHost: config ? new URL(config.url).hostname : null,
            usesAdminKey: false,
            remoteAccountCheck: false,
        },
        null,
        2,
    ),
);
if (!config) process.exitCode = 1;
