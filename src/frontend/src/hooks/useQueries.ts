import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { Model, Trade, UserProfile, ModelCondition, BracketOrderOutcome, CustomToolDefinition } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.getCallerUserProfile();
      } catch (error: any) {
        if (error?.message?.includes('Unauthorized') || error?.message?.includes('Anonymous')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to prevent unnecessary refetches
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Return proper loading state that accounts for actor initialization
  return {
    ...query,
    isLoading: (actorFetching || query.isLoading) && !!identity,
    isFetched: !!actor && !actorFetching && query.isFetched,
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

export function useGetAllModels() {
  const { actor, isFetching } = useActor();

  return useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllModels();
      } catch (error: any) {
        if (error?.message?.includes('Unauthorized')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateModel() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (model: Omit<Model, 'owner'>) => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      const modelWithOwner: Model = {
        ...model,
        owner: identity.getPrincipal(),
      };
      await actor.createModel(modelWithOwner);
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
      await actor.updateModel(model);
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
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

export function useGetAllTrades() {
  const { actor, isFetching } = useActor();

  return useQuery<Trade[]>({
    queryKey: ['trades'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllTrades();
      } catch (error: any) {
        if (error?.message?.includes('Unauthorized')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTrade() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trade: Omit<Trade, 'owner'>) => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      const tradeWithOwner: Trade = {
        ...trade,
        owner: identity.getPrincipal(),
      };
      return actor.createTrade(tradeWithOwner);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['adherenceAnalytics'] });
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
      queryClient.invalidateQueries({ queryKey: ['adherenceAnalytics'] });
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
      queryClient.invalidateQueries({ queryKey: ['adherenceAnalytics'] });
    },
  });
}

export function useAddReflection() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tradeId,
      notes,
      emotions,
      images,
      bracketOutcome,
    }: {
      tradeId: string;
      notes: string;
      emotions: string[];
      images: string[];
      bracketOutcome: BracketOrderOutcome;
    }) => {
      if (!actor) throw new Error('Actor not available');
      if (!identity) throw new Error('Identity not available');

      const currentTrade = await actor.getTrade(tradeId);
      if (!currentTrade) {
        throw new Error('Trade not found');
      }

      const updatedTradeWithReflection: Trade = {
        ...currentTrade,
        notes,
        emotions,
        images,
      };

      await actor.updateTrade(updatedTradeWithReflection);

      const result = await actor.saveBracketOrderOutcome(tradeId, bracketOutcome);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['adherenceAnalytics'] });
    },
    onError: (error) => {
      console.error('Reflection save error:', error);
    },
    retry: false,
  });
}

export function useGetCurrentTime() {
  const { actor } = useActor();

  return useQuery<bigint>({
    queryKey: ['currentTime'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCurrentTime();
    },
    enabled: !!actor,
    staleTime: 0,
  });
}

export function useGetModelConditions(modelId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<ModelCondition[]>({
    queryKey: ['modelConditions', modelId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      if (!modelId) return [];
      try {
        const conditions = await actor.getModelConditions(modelId);
        return conditions;
      } catch (error: any) {
        if (error?.message?.includes('Unauthorized')) {
          return [];
        }
        console.error('Error fetching model conditions:', error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!modelId,
    retry: 2,
    staleTime: 30000,
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

export function useGetAdherenceAnalytics() {
  const { actor, isFetching } = useActor();

  return useQuery<{
    total_trades: bigint;
    avg_adherence: number;
    win_rate_high_adherence: number;
    win_rate_low_adherence: number;
  }>({
    queryKey: ['adherenceAnalytics'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.getAdherenceAnalytics();
      } catch (error: any) {
        if (error?.message?.includes('Unauthorized')) {
          return {
            total_trades: BigInt(0),
            avg_adherence: 0,
            win_rate_high_adherence: 0,
            win_rate_low_adherence: 0,
          };
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTradesByAdherenceRange(minScore: number, maxScore: number) {
  const { actor, isFetching } = useActor();

  return useQuery<Trade[]>({
    queryKey: ['tradesByAdherence', minScore, maxScore],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getTradesByAdherenceRange(minScore, maxScore);
      } catch (error: any) {
        if (error?.message?.includes('Unauthorized')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// Custom Tool Queries
export function useGetAllCustomTools() {
  const { actor, isFetching } = useActor();

  return useQuery<CustomToolDefinition[]>({
    queryKey: ['customTools'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllCustomTools();
      } catch (error: any) {
        if (error?.message?.includes('Unauthorized')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCustomTool() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tool: Omit<CustomToolDefinition, 'owner' | 'created_at' | 'updated_at'>) => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      const toolWithOwner: CustomToolDefinition = {
        ...tool,
        owner: identity.getPrincipal(),
        created_at: BigInt(Date.now() * 1000000),
        updated_at: BigInt(Date.now() * 1000000),
      };
      return await actor.createCustomTool(toolWithOwner);
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
      const updatedTool: CustomToolDefinition = {
        ...tool,
        updated_at: BigInt(Date.now() * 1000000),
      };
      return await actor.updateCustomTool(updatedTool);
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
      return await actor.deleteCustomTool(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTools'] });
    },
  });
}
