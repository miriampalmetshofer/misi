"use client";

import { useCallback, useTransition } from "react";

type ServerAction = (formData: FormData) => Promise<unknown>;

/**
 * Add an optimistic action, then run a server action inside a transition. If the
 * server action throws, `useOptimistic` discards the optimistic value once the
 * transition settles, so the UI rolls back on its own.
 */
export function useOptimisticMutation<Action>(
  addOptimistic: (action: Action) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (
      action: ServerAction,
      fields: Record<string, string>,
      optimistic?: Action,
    ) => {
      startTransition(async () => {
        if (optimistic !== undefined) {
          addOptimistic(optimistic);
        }
        await action(toFormData(fields));
      });
    },
    [addOptimistic],
  );

  return { mutate, isPending };
}

function toFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}
