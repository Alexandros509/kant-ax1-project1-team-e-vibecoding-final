import { loadEnvConfig } from '@next/env';
import { tossConfiguration } from '../src/lib/toss-config';
loadEnvConfig(process.cwd());
const result = tossConfiguration();
console.log('ONEPIECE / Toss Payments TEST configuration');
console.log('File: ' + process.cwd() + '/.env.local');
console.log('APP_ORIGIN: ' + result.origin);
if (!result.configured) {
    for (const issue of result.issues) console.log('NEEDS SETUP: ' + issue);
    process.exitCode = 1;
} else {
    console.log(
        'Key format: OK (test_ck_ / test_sk_). Key values are never printed.',
    );
    console.log(
        'This checks local configuration only, not key validity or matching merchant IDs.',
    );
    console.log(
        'Restart the server; complete one test payment and check Toss test payment history.',
    );
}
console.log('Success URL: ' + result.origin + '/checkout/success');
console.log('Failure URL: ' + result.origin + '/checkout/fail');
