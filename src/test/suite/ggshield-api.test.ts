import * as assert from 'assert';
import * as simple from 'simple-mock';
import { ExtensionContext, Memento } from 'vscode';
import { ggshieldAuthStatus } from '../../lib/ggshield-api';
import * as runGGShield from '../../lib/run-ggshield';
import { GGShieldConfiguration } from '../../lib/ggshield-configuration';

suite('ggshieldAuthStatus', function () {
    let isAuthenticated: boolean;
    let mockGlobalState: Memento & { setKeysForSync(keys: readonly string[]): void; };
    let mockContext: Partial<ExtensionContext>;
    let runGGShieldMock: simple.Stub<Function>;

    setup(function () {
        isAuthenticated = false;

        mockGlobalState = {
            get: (key: string) => (key === 'isAuthenticated' ? isAuthenticated : undefined),
            update: (key: string, value: any) => {
                if (key === 'isAuthenticated') {
                    isAuthenticated = value;
                }
                return Promise.resolve();
            },
            keys: () => [],
            setKeysForSync: (keys: readonly string[]) => {},
        };

        mockContext = {
            globalState: mockGlobalState,
        };
        runGGShieldMock = simple.mock(runGGShield, "runGGShieldCommand");
    });
    teardown(function () {
        simple.restore();
    });

    test('Valid authentication should update isAuthenticated to true', async function () {
        runGGShieldMock.returnWith({
            status: 0,
            stdout: '{"detail": "Valid API key.", "status_code": 200}',
            stderr: ''
        });

        await ggshieldAuthStatus({} as GGShieldConfiguration, mockContext as ExtensionContext);
        assert.strictEqual(isAuthenticated, true);
    });

    test('Invalid authentication should keep isAuthenticated to false', async function () {
        runGGShieldMock.returnWith({
            status: 0,
            stdout: '{"detail": "Invalid API key.", "status_code": 401}',
            stderr: ''
        });

        await ggshieldAuthStatus({} as GGShieldConfiguration, mockContext as ExtensionContext);
        assert.strictEqual(isAuthenticated, false);
    });
});
