var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig, devices } from '@playwright/test';
var supabaseServerUrl = 'http://127.0.0.1:4173';
// Separate dev server without Supabase configuration so the app starts in demo mode.
// Empty env vars take precedence over values from .env/.env.local.
var demoServerUrl = 'http://127.0.0.1:4174';
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    retries: 0,
    use: {
        trace: 'on-first-retry',
    },
    webServer: [
        {
            command: 'VITE_SUPABASE_URL=https://aachyijzixdeupeqcdvk.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=playwright-publishable-key npm run dev -- --host 127.0.0.1 --port 4173',
            url: supabaseServerUrl,
            reuseExistingServer: true,
            timeout: 120000,
        },
        {
            command: 'VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npm run dev -- --host 127.0.0.1 --port 4174',
            url: demoServerUrl,
            reuseExistingServer: true,
            timeout: 120000,
        },
    ],
    projects: [
        {
            name: 'chromium',
            testIgnore: /demo\.spec\.ts/,
            use: __assign(__assign({}, devices['Desktop Chrome']), { baseURL: supabaseServerUrl }),
        },
        {
            name: 'chromium-demo',
            testMatch: /demo\.spec\.ts/,
            use: __assign(__assign({}, devices['Desktop Chrome']), { baseURL: demoServerUrl }),
        },
    ],
});
