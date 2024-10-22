import * as assert from 'assert';
import { ggshieldAuthStatus } from '../../lib/ggshield-api';
import { ExtensionContext, extensions, Memento } from 'vscode';
import { getBinaryAbsolutePath } from '../../lib/ggshield-resolver-utils';
import * as os from 'os';


suite('Authentication Tests', function () {
    let isAuthenticated: boolean;
    let mockGlobalState: Memento & { setKeysForSync(keys: readonly string[]): void; };
    let mockContext: Partial<ExtensionContext>;

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
            asAbsolutePath: () => {
                const extension = extensions.getExtension('gitguardian-secret-security.gitguardian')!;
                const extensionPath = extension.extensionPath;
                return extensionPath;
            },
        };
    });

    test('Invalid authentication value', async function () {
        const mockConfiguration = {
            apiKey: 'mockApiKey',
            ggshieldPath: getBinaryAbsolutePath(os.platform(), os.arch(), mockContext as ExtensionContext),
            apiUrl: 'https://api.gitguardian.com/',
        };

        await ggshieldAuthStatus(mockConfiguration, mockContext as ExtensionContext);     
        assert.strictEqual(isAuthenticated, false);
    });
});
