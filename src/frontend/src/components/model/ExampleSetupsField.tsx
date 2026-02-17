import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Upload } from 'lucide-react';
import { ExternalBlob } from '../../backend';
import type { ExampleImage } from '../../backend';

interface ExampleSetupsFieldProps {
  examples: ExampleImage[];
  onChange: (examples: ExampleImage[]) => void;
}

export default function ExampleSetupsField({ examples, onChange }: ExampleSetupsFieldProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleAdd = () => {
    const newExample: ExampleImage = {
      id: `example_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blob: ExternalBlob.fromBytes(new Uint8Array()),
      description: '',
      created_at: BigInt(Date.now() * 1000000),
    };
    onChange([...examples, newExample]);
  };

  const handleRemove = (index: number) => {
    onChange(examples.filter((_, i) => i !== index));
  };

  const handleDescriptionChange = (index: number, description: string) => {
    const updated = [...examples];
    updated[index] = { ...updated[index], description };
    onChange(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array);
      
      const updated = [...examples];
      updated[index] = { ...updated[index], blob };
      onChange(updated);
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Example Setups</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Example
        </Button>
      </div>

      {examples.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No example setups yet. Add images with descriptions to help identify this model's criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {examples.map((example, index) => (
            <Card key={example.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={`example-image-${index}`} className="text-sm">
                        Image
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          id={`example-image-${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(index, file);
                          }}
                          disabled={uploadingIndex === index}
                          className="flex-1"
                        />
                        {uploadingIndex === index && (
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </div>

                    {example.blob && example.blob.getDirectURL() && (
                      <div className="relative w-full h-32 bg-muted rounded border overflow-hidden">
                        <img
                          src={example.blob.getDirectURL()}
                          alt={example.description || 'Example setup'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor={`example-desc-${index}`} className="text-sm">
                        Description
                      </Label>
                      <Input
                        id={`example-desc-${index}`}
                        value={example.description}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        placeholder="Describe what this example shows..."
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
