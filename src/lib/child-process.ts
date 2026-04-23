import * as cp from "child_process";

// Plain object wrapper so tests can stub these with Sinon.
// Node.js 22+ makes built-in module properties non-configurable,
// which prevents sinon.stub(childProcess, "spawnSync") from working.
export const childProcess = {
  spawnSync: cp.spawnSync.bind(cp),
  spawn: cp.spawn.bind(cp),
};

export type {
  ChildProcessWithoutNullStreams,
  SpawnOptionsWithoutStdio,
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
} from "child_process";
