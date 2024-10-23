import * as simple from 'simple-mock';
import * as assert from 'assert';
import { GGShieldConfiguration } from '../../../lib/ggshield-configuration';
import * as runGGShield from '../../../lib/run-ggshield';
import { ggshieldScanFile } from '../../../lib/ggshield-api';
import { window } from 'vscode';
import { GGShieldScanResults } from "../../../lib/api-types";

suite("ggshieldScanFile", () => {
    let runGGShieldMock: simple.Stub<Function>;
    let errorMessageMock: simple.Stub<Function>;

    setup(() => {
        runGGShieldMock = simple.mock(runGGShield, "runGGShieldCommand");
        errorMessageMock = simple.mock(window, "showErrorMessage");
    });

    teardown(() => {
        simple.restore();
    });

    test("returns an empty result when ggshield returns no secrets found", () => {
        runGGShieldMock.returnWith({
            status: 0,
            stdout: '{}',
            stderr: ''
        });

        const result = ggshieldScanFile('test', new GGShieldConfiguration(
            '',
            '',
            '',
        ));

        assert.deepStrictEqual(result, {});
    });

    test("displays an error message when ggshield returns an error", () => {
        runGGShieldMock.returnWith({
            status: 2,
            stdout: '',
            stderr: 'Invalid API key.'
        });

        ggshieldScanFile('test', new GGShieldConfiguration(
            '',
            '',
            '',
        ));

          assert.strictEqual(errorMessageMock.callCount, 1);
          assert.strictEqual(errorMessageMock.lastCall.args[0], "ggshield: Invalid API key.\n");
    });

    test("ignores the ignored file cannot be scanned error", () => {
        runGGShieldMock.returnWith({
            status: 2,
            stdout: '',
            stderr: 'Error: An ignored file or directory cannot be scanned.'
        });

        ggshieldScanFile('test', new GGShieldConfiguration(
            '',
            '',
            '',
        ));

        assert.strictEqual(errorMessageMock.callCount, 0);
    });
});