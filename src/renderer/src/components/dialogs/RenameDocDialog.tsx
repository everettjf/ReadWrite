import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNativeViewMute } from '@/lib/native-view-mute';

interface RenameDocDialogProps {
  open: boolean;
  initialName: string;
  onCancel: () => void;
  onConfirm: (newName: string) => Promise<void> | void;
}

export function RenameDocDialog({
  open,
  initialName,
  onCancel,
  onConfirm,
}: RenameDocDialogProps): JSX.Element {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useNativeViewMute(open);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
      setBusy(false);
    }
  }, [open, initialName]);

  const submit = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return;
    }
    setBusy(true);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rename document</DialogTitle>
          <DialogDescription>
            Renames the document folder and the markdown file inside it. Image links keep working
            because they&apos;re stored as relative paths.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="docName">New name</Label>
          <Input
            id="docName"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) submit();
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Renaming…' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
