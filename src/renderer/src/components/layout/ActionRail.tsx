import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Crop,
  Sparkles,
  TextSelect,
  ScrollText,
  Languages,
  FileSearch,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';
import { useEditorCommandsStore } from '@/stores/editor-commands';

interface ActionRailProps {
  onStartSnip?: () => void;
}

/**
 * Vertical action rail at the reader/editor seam. Hosts actions that
 * conceptually bridge the two panes: snipping a region from the reader
 * into the editor, and AI transformations that take selection / document
 * content and propose a replacement.
 *
 * Centered vertically so the buttons are near the cursor's natural
 * resting position while reading the left pane. Extensible — appending
 * a button just adds another row.
 */
export function ActionRail({ onStartSnip }: ActionRailProps): JSX.Element {
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const requestCmd = useEditorCommandsStore((s) => s.request);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full w-10 shrink-0 flex-col items-center justify-center gap-1 border-r border-border bg-muted/20">
        {onStartSnip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onStartSnip}>
                <Crop className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Snip region from reader (⇧⌘S)</TooltipContent>
          </Tooltip>
        )}

        {aiEnabled && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="AI">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">AI</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-72">
              <DropdownMenuLabel>AI</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Polish
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-56">
                    <DropdownMenuItem
                      onClick={() => requestCmd({ kind: 'polish', target: 'selection' })}
                    >
                      <TextSelect className="mr-2 h-4 w-4" /> Selection
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => requestCmd({ kind: 'polish', target: 'document' })}
                    >
                      <ScrollText className="mr-2 h-4 w-4" /> Whole document
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" />
                  Translate
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-64">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Selection →
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() =>
                        requestCmd({ kind: 'translate', target: 'selection', lang: 'en' })
                      }
                    >
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        requestCmd({ kind: 'translate', target: 'selection', lang: 'zh' })
                      }
                    >
                      中文
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Whole document →
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() =>
                        requestCmd({ kind: 'translate', target: 'document', lang: 'en' })
                      }
                    >
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        requestCmd({ kind: 'translate', target: 'document', lang: 'zh' })
                      }
                    >
                      中文
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem onClick={() => requestCmd({ kind: 'summarize' })}>
                <FileSearch className="mr-2 h-4 w-4" />
                Summarize document
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => requestCmd({ kind: 'explain' })}>
                <BookOpen className="mr-2 h-4 w-4" />
                Explain selection
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => requestCmd({ kind: 'interpret' })}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Interpret with prompt…</span>
                  <span className="text-[10px] text-muted-foreground">
                    Custom prompt, review response, then insert
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
}
