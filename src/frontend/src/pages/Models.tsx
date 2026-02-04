import { useState } from 'react';
import { useGetAllModels, useDeleteModel } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, FileText, Layers } from 'lucide-react';
import ModelBuilder from '../components/ModelBuilder';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Model } from '../backend';

export default function Models() {
  const { data: models = [], isLoading } = useGetAllModels();
  const deleteModel = useDeleteModel();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deletingModel, setDeletingModel] = useState<Model | null>(null);

  const handleDelete = async () => {
    if (!deletingModel) return;

    try {
      await deleteModel.mutateAsync(deletingModel.id);
      toast.success('Model deleted successfully');
      setDeletingModel(null);
    } catch (error) {
      toast.error('Failed to delete model');
      console.error(error);
    }
  };

  const getToolCount = (model: Model) => {
    return model.narrative.length + model.framework.length + model.execution.length;
  };

  if (isLoading) {
    return (
      <div className="container py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading models...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Models</h1>
          <p className="text-muted-foreground">Create and manage your ICT trading model templates</p>
        </div>
        <Button onClick={() => setShowBuilder(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Model
        </Button>
      </div>

      {models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No models yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Create your first trading model using the builder with ICT tools
            </p>
            <Button onClick={() => setShowBuilder(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Model
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => {
            const toolCount = getToolCount(model);
            return (
              <Card key={model.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {model.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {toolCount} tool{toolCount !== 1 ? 's' : ''} configured
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {model.narrative.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Narrative</div>
                      </div>
                      <div className="text-center p-2 bg-purple-500/10 rounded border border-purple-500/20">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {model.framework.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Framework</div>
                      </div>
                      <div className="text-center p-2 bg-green-500/10 rounded border border-green-500/20">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {model.execution.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Execution</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => {
                        setEditingModel(model);
                        setShowBuilder(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => setDeletingModel(model)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showBuilder && (
        <ModelBuilder
          model={editingModel}
          onClose={() => {
            setShowBuilder(false);
            setEditingModel(null);
          }}
        />
      )}

      <AlertDialog open={!!deletingModel} onOpenChange={() => setDeletingModel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingModel?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteModel.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
