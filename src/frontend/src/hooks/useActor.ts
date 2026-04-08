import { useActor as useActorLib } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { BackendActor } from "../types";

export function useActor() {
  const result = useActorLib(createActor as Parameters<typeof useActorLib>[0]);
  return {
    actor: result.actor as BackendActor | null,
    isFetching: result.isFetching,
  };
}
