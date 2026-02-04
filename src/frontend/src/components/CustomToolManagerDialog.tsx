import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, X, Save, Trash2, ChevronUp, ChevronDown, Edit2, ArrowLeft } from 'lucide-react';
import { useGetAllCustomTools, useCreateCustomTool, useUpdateCustomTool, useDeleteCustomTool } from '../hooks/useQueries';
import type { CustomToolDefinition, CustomProperty, PropertyType } from '../backend';

interface CustomToolManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

type EditMode = 'list' | 'create' | 'edit';

export default function CustomToolManagerDialog({ open, onClose }: CustomToolManagerDialogProps) {
  const [mode, setMode] = useState<EditMode>('list');
  const [editingTool, setEditingTool] = useState<CustomToolDefinition | null>(null);
  
  // Form state
  const [toolName, setToolName] = useState('');
  const [properties, setProperties] = useState<CustomProperty[]>([]);

  const { data: customTools = [], isLoading } = useGetAllCustomTools();
  const createCustomTool = useCreateCustomTool();
  const updateCustomTool = useUpdateCustomTool();
  const deleteCustomTool = useDeleteCustomTool();

  useEffect(() => {
    if (mode === 'create') {
      setToolName('');
      setProperties([]);
      setEditingTool(null);
    } else if (mode === 'edit' && editingTool) {
      setToolName(editingTool.name);
      setProperties([...editingTool.properties]);
    }
  }, [mode, editingTool]);

  const handleAddProperty = () => {
    const newProperty: CustomProperty = {
      id: crypto.randomUUID(),
      propertyLabel: '',
      type: 'text' as PropertyType,
      default_value: '',
      options: [],
    };
    setProperties([...properties, newProperty]);
  };

  const handleRemoveProperty = (id: string) => {
    setProperties(properties.filter(p => p.id !== id));
  };

  const handleMovePropertyUp = (index: number) => {
    if (index === 0) return;
    const newProperties = [...properties];
    [newProperties[index - 1], newProperties[index]] = [newProperties[index], newProperties[index - 1]];
    setProperties(newProperties);
  };

  const handleMovePropertyDown = (index: number) => {
    if (index === properties.length - 1) return;
    const newProperties = [...properties];
    [newProperties[index], newProperties[index + 1]] = [newProperties[index + 1], newProperties[index]];
    setProperties(newProperties);
  };

  const handleUpdateProperty = (id: string, updates: Partial<CustomProperty>) => {
    setProperties(properties.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const validateForm = (): string | null => {
    if (!toolName.trim()) {
      return 'Tool name is required';
    }

    if (properties.length === 0) {
      return 'At least one property is required';
    }

    for (const prop of properties) {
      if (!prop.propertyLabel.trim()) {
        return 'All properties must have a label';
      }

      if (prop.type === 'select' && prop.options.length === 0) {
        return `Select property "${prop.propertyLabel}" must have at least one option`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      if (mode === 'create') {
        await createCustomTool.mutateAsync({
          id: crypto.randomUUID(),
          name: toolName.trim(),
          properties,
        });
        toast.success('Custom tool created successfully!');
      } else if (mode === 'edit' && editingTool) {
        await updateCustomTool.mutateAsync({
          ...editingTool,
          name: toolName.trim(),
          properties,
        });
        toast.success('Custom tool updated successfully!');
      }
      setMode('list');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save custom tool');
      console.error(error);
    }
  };

  const handleDelete = async (tool: CustomToolDefinition) => {
    if (!confirm(`Are you sure you want to delete "${tool.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCustomTool.mutateAsync(tool.id);
      toast.success('Custom tool deleted successfully!');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete custom tool');
      console.error(error);
    }
  };

  const handleEdit = (tool: CustomToolDefinition) => {
    setEditingTool(tool);
    setMode('edit');
  };

  const renderPropertyEditor = (property: CustomProperty, index: number) => {
    return (
      <div key={property.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Property {index + 1}</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleMovePropertyUp(index)}
              disabled={index === 0}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleMovePropertyDown(index)}
              disabled={index === properties.length - 1}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => handleRemoveProperty(property.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`label-${property.id}`}>Property Label *</Label>
          <Input
            id={`label-${property.id}`}
            value={property.propertyLabel}
            onChange={(e) => handleUpdateProperty(property.id, { propertyLabel: e.target.value })}
            placeholder="e.g., Direction, Timeframe, Level Type"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`type-${property.id}`}>Input Type *</Label>
          <Select
            value={property.type}
            onValueChange={(value) => handleUpdateProperty(property.id, { type: value as PropertyType })}
          >
            <SelectTrigger id={`type-${property.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="number">Number Input</SelectItem>
              <SelectItem value="select">Dropdown Selection</SelectItem>
              <SelectItem value="toggle">On/Off Toggle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {property.type === 'select' && (
          <div className="space-y-2">
            <Label>Options (comma-separated) *</Label>
            <Input
              value={property.options.join(', ')}
              onChange={(e) => {
                const options = e.target.value.split(',').map(o => o.trim()).filter(o => o);
                handleUpdateProperty(property.id, { options });
              }}
              placeholder="e.g., Bullish, Bearish, Neutral"
            />
            <p className="text-xs text-muted-foreground">
              {property.options.length} option(s)
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`default-${property.id}`}>Default Value</Label>
          {property.type === 'select' ? (
            <Select
              value={property.default_value}
              onValueChange={(value) => handleUpdateProperty(property.id, { default_value: value })}
            >
              <SelectTrigger id={`default-${property.id}`}>
                <SelectValue placeholder="Select default..." />
              </SelectTrigger>
              <SelectContent>
                {property.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : property.type === 'toggle' ? (
            <Select
              value={property.default_value}
              onValueChange={(value) => handleUpdateProperty(property.id, { default_value: value })}
            >
              <SelectTrigger id={`default-${property.id}`}>
                <SelectValue placeholder="Select default..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">On</SelectItem>
                <SelectItem value="false">Off</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`default-${property.id}`}
              type={property.type === 'number' ? 'number' : 'text'}
              value={property.default_value}
              onChange={(e) => handleUpdateProperty(property.id, { default_value: e.target.value })}
              placeholder={property.type === 'number' ? 'e.g., 1' : 'e.g., Default value'}
            />
          )}
        </div>
      </div>
    );
  };

  if (mode === 'list') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Custom Tools</DialogTitle>
            <DialogDescription>
              Create and manage your own custom tools for the Model Builder
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-4">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Loading custom tools...</p>
                </div>
              ) : customTools.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">No custom tools yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first custom tool to get started
                  </p>
                </div>
              ) : (
                customTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{tool.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tool.properties.length} propert{tool.properties.length === 1 ? 'y' : 'ies'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(tool)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tool)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => setMode('create')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Custom Tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMode('list')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <DialogTitle>
                {mode === 'create' ? 'Create Custom Tool' : 'Edit Custom Tool'}
              </DialogTitle>
              <DialogDescription>
                Define properties for your custom tool
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="tool-name">Tool Name *</Label>
              <Input
                id="tool-name"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                placeholder="e.g., Custom Indicator, My Setup"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Properties</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddProperty}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Property
                </Button>
              </div>

              {properties.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">No properties yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add at least one property to configure your tool
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {properties.map((property, index) => renderPropertyEditor(property, index))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setMode('list')}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createCustomTool.isPending || updateCustomTool.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {createCustomTool.isPending || updateCustomTool.isPending ? 'Saving...' : 'Save Tool'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
