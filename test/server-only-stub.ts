// `server-only` throws when imported into a client bundle. The tests import the
// grocery components, which reach the server actions and through them `@/db`.
// The server actions themselves are always mocked, so an empty stub is enough.
export {};
