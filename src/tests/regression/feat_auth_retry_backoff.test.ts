import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
const mockRefreshNow = vi.fn();

// Mock GoogleAuthService constructor
vi.mock('../../services/googleAuth', () => {
    return {
        GoogleAuthService: class {
            refreshNow = mockRefreshNow;
            getToken = vi.fn();
            login = vi.fn();
            logout = vi.fn();
            getUserInfo = vi.fn();
            clearCachedToken = vi.fn();
        },
        parseTokenFromUrl: vi.fn()
    };
});

// Mock DocsSyncService
vi.mock('../../services/docsSync', () => {
    return {
        DocsSyncService: class {
            listDocs = vi.fn();
            createDoc = vi.fn();
            syncItem = vi.fn();
        }
    };
});

describe('Feature: Auth Retry Backoff (BUG-AUTH-05)', () => {
    let alarmListener: (alarm: any) => Promise<void>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.useFakeTimers();

        // Setup global chrome mock
        global.chrome = {
            runtime: {
                onInstalled: { addListener: vi.fn() },
                onStartup: { addListener: vi.fn() },
                onMessage: { addListener: vi.fn() },
                sendMessage: vi.fn().mockResolvedValue({})
            },
            alarms: {
                create: vi.fn(),
                onAlarm: {
                    addListener: vi.fn((cb) => {
                        alarmListener = cb;
                    })
                },
                clear: vi.fn()
            },
            tabs: {
                onUpdated: { addListener: vi.fn() },
                onCreated: { addListener: vi.fn() },
                query: vi.fn().mockResolvedValue([])
            },
            webNavigation: {
                onBeforeNavigate: { addListener: vi.fn() },
                onCommitted: { addListener: vi.fn() }
            },
            storage: {
                local: {
                    get: vi.fn().mockResolvedValue({}),
                    set: vi.fn().mockResolvedValue(undefined),
                    remove: vi.fn().mockResolvedValue(undefined)
                }
            }
        } as any;

        // Load background script to register listeners
        // We use require to ensure it runs
        await import('../../background');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should schedule a retry alarm if proactive refresh fails', async () => {
        // 1. Simulate Refresh Failure
        mockRefreshNow.mockRejectedValue(new Error('Network Error'));

        // 2. Trigger the main alarm
        await alarmListener({ name: 'proactive-auth-refresh' });

        // 3. Verify that a retry alarm was created
        expect(chrome.alarms.create).toHaveBeenCalledWith(
            'proactive-auth-retry',
            expect.objectContaining({ delayInMinutes: 1 })
        );
    });

    it('should implement exponential backoff on subsequent failures', async () => {
        // 1. Trigger the FIRST retry alarm (Attempt #1)
        mockRefreshNow.mockRejectedValue(new Error('Still failing'));
        await alarmListener({ name: 'proactive-auth-retry' });

        // Expect Attempt #2 (1 retry count -> 2 retry count). Backoff = 2^(2-1) = 2 mins?
        // Wait, let's check logic:
        // scheduleRetry sets count = 1.
        // handleRetryFailure increments count (now 2).
        // backoff = 2^(2-1) = 2.
        // Actually code says: 
        // refresh_retry_count++; (now 2)
        // backoff = Math.pow(2, refresh_retry_count - 1); // 2^1 = 2.

        expect(chrome.alarms.create).toHaveBeenCalledWith(
            'proactive-auth-retry',
            expect.objectContaining({ delayInMinutes: 2 })
        );

        // 2. Trigger Attempt #2
        await alarmListener({ name: 'proactive-auth-retry' });
        // count increments to 3. backoff = 2^(3-1) = 4.
        expect(chrome.alarms.create).toHaveBeenCalledWith(
            'proactive-auth-retry',
            expect.objectContaining({ delayInMinutes: 4 })
        );

        // 3. Trigger Attempt #3 (Final)
        await alarmListener({ name: 'proactive-auth-retry' });
        // count increments to 4. 4 > 3. Give up.
        // Should NOT create another alarm.
        expect(chrome.alarms.create).toHaveBeenCalledTimes(2); // 2 mins + 4 mins. Stop.
        // Wait,toHaveBeenCalledTimes counts total calls.
        // Test 1 called it once. Test 2 mocks are reset.
        // In this test:
        // call 1: verify 2 mins
        // call 2: verify 4 mins
        // call 3: verify NO call
    });

    it('should reset retry count on success', async () => {
        // 1. Simulate Success
        mockRefreshNow.mockResolvedValue('valid-token');

        // 2. Trigger retry alarm
        await alarmListener({ name: 'proactive-auth-retry' });

        // 3. Verify NO new alarm created
        expect(chrome.alarms.create).not.toHaveBeenCalled();
    });
});
