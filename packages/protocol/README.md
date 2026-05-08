# @aaw/protocol

The AAW protocol contract: schema types and the `Backend` interface.

This package is **transport-neutral** — pure types and interface definitions, no I/O. Concrete backends (local-fs, cloud, GitHub) live elsewhere and depend on this package.

## What's here

```
src/
├── schema.ts      # Initiative, WorkItem, Activity, Task, Claim, Event, ...
├── protocol.ts    # Backend interface + error types + operation parameters
└── index.ts       # public API
```

## The Backend interface

Six operations cover every state mutation AAW skills need:

| Operation | Purpose |
|---|---|
| `listPoolWork` | Discover work items available to the caller's pool |
| `claimActivity` | Atomically take ownership of an activity |
| `updateTask` | Mutate a single task (version-checked) |
| `updateActivity` | Mutate an activity (version-checked) |
| `releaseActivity` | Surrender ownership after writeback |
| `appendEvent` | Append to the audit log |

Plus `getState` for read-only queries and an optional `subscribe` for push notifications.

## Versioning

The protocol follows semver:

- **Additive** changes (new optional fields, new operations) → minor bump.
- **Breaking** changes (renames, semantics changes) → major bump.

Every consumer (CLI, coordinator, future GitHub backend) pins an exact version. At runtime, distributed backends echo their `PROTOCOL_VERSION` so peers can detect mismatch and surface a clean error.

## Why TypeScript first, not Protobuf?

Until there's a non-Node consumer (the planned GCP coordinator built in another language, or a third-party client), TypeScript types are the most ergonomic source of truth. When the second consumer arrives, the schema migrates to Protobuf and TypeScript types are generated from `.proto` files.

## Format on the wire

The protocol does not specify a wire format. Each backend chooses:

- **Local-fs**: YAML for `progress.yaml`, JSON Lines for `changelog.log`, JSON for lock files.
- **Cloud (future)**: Protobuf over gRPC, or JSON over REST.
- **GitHub (future)**: Issues + Projects + custom fields, mapped via the Backend interface.
