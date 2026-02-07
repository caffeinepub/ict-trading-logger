import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { 
  Model, 
  Trade, 
  CustomToolDefinition, 
  UserProfile, 
  BracketOrderOutcome,
  ModelCondition
} from '../backend';

export function useGetAllModels() {
  const { actor, isFetching } = useActor();

  return useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllModels();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetModel(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Model | null>({
    queryKey: ['model', id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getModel(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreateModel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (model: Model) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createModel(model);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useUpdateModel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (model: Model) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateModel(model);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useDeleteModel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteModel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useGetAllTrades() {
  const { actor, isFetching } = useActor();

  return useQuery<Trade[]>({
    queryKey: ['trades'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTrades();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTrade(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Trade | null>({
    queryKey: ['trade', id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getTrade(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreateTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trade: Trade) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createTrade(trade);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

export function useUpdateTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trade: Trade) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateTrade(trade);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

export function useDeleteTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteTrade(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

export function useSaveBracketOrderOutcome() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tradeId, outcome }: { tradeId: string; outcome: BracketOrderOutcome }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveBracketOrderOutcome(tradeId, outcome);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

export function useGetCurrentTime() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['currentTime'],
    queryFn: async () => {
      if (!actor) return BigInt(Date.now() * 1000000);
      return actor.getCurrentTime();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetAllCustomTools() {
  const { actor, isFetching } = useActor();

  return useQuery<CustomToolDefinition[]>({
    queryKey: ['customTools'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCustomTools();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCustomTool() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tool: CustomToolDefinition) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCustomTool(tool);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTools'] });
    },
  });
}

export function useUpdateCustomTool() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tool: CustomToolDefinition) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateCustomTool(tool);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTools'] });
    },
  });
}

export function useDeleteCustomTool() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCustomTool(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTools'] });
    },
  });
}

export function useGetModelConditions(modelId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<ModelCondition[]>({
    queryKey: ['modelConditions', modelId],
    queryFn: async () => {
      if (!actor || !modelId) return [];
      return actor.getModelConditions(modelId);
    },
    enabled: !!actor && !isFetching && !!modelId,
  });
}

export function useCalculateAdherenceScore() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (conditions: ModelCondition[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.calculateAdherenceScore(conditions);
    },
  });
}
