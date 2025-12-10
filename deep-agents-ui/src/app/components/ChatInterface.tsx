"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  FormEvent,
  Fragment,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Square,
  ArrowUp,
  CheckCircle,
  Clock,
  Circle,
  PanelRightOpen,
  PanelRightClose
} from "lucide-react";
import { ChatMessage } from "@/app/components/ChatMessage";
import type {
  TodoItem,
  ToolCall,
  ActionRequest,
  ReviewConfig,
} from "@/app/types/types";
import { Assistant, Message } from "@langchain/langgraph-sdk";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { useStickToBottom } from "use-stick-to-bottom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { WorkspacePanel } from "@/app/components/WorkspacePanel";
import { ContextPanel } from "@/app/components/ContextPanel";
import { RAGPanel } from "@/app/components/RAGPanel";

interface ChatInterfaceProps {
  assistant: Assistant | null;
}

const getStatusIcon = (status: TodoItem["status"], className?: string) => {
  switch (status) {
    case "completed":
      return (
        <CheckCircle
          size={16}
          className={cn("text-success/80", className)}
        />
      );
    case "in_progress":
      return (
        <Clock
          size={16}
          className={cn("text-warning/80", className)}
        />
      );
    default:
      return (
        <Circle
          size={16}
          className={cn("text-tertiary/70", className)}
        />
      );
  }
};

export const ChatInterface = React.memo<ChatInterfaceProps>(({ assistant }) => {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [input, setInput] = useState("");
  const { scrollRef, contentRef } = useStickToBottom();

  const {
    stream,
    messages,
    todos,
    files,
    groundingFiles,
    ui,
    setFiles,
    setGroundingFiles,
    isLoading,
    isThreadLoading,
    interrupt,
    sendMessage,
    stopStream,
    resumeInterrupt,
  } = useChatContext();

  const submitDisabled = isLoading || !assistant;

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      const messageText = input.trim();
      if (!messageText || isLoading || submitDisabled) return;
      const groundedMessage =
        groundingFiles && groundingFiles.length > 0
          ? `Grounding files: ${groundingFiles.join(
            ", "
          )}.\nUse retrieve_uploaded_context on these files before answering.\n\n${messageText}`
          : messageText;
      sendMessage(groundedMessage);
      setInput("");
    },
    [input, groundingFiles, isLoading, sendMessage, setInput, submitDisabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (submitDisabled) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, submitDisabled]
  );

  const processedMessages = useMemo(() => {
    const messageMap = new Map<
      string,
      { message: Message; toolCalls: ToolCall[] }
    >();
    messages.forEach((message: Message) => {
      if (message.type === "ai") {
        const toolCallsInMessage: Array<{
          id?: string;
          function?: { name?: string; arguments?: unknown };
          name?: string;
          type?: string;
          args?: unknown;
          input?: unknown;
        }> = [];
        if (
          message.additional_kwargs?.tool_calls &&
          Array.isArray(message.additional_kwargs.tool_calls)
        ) {
          toolCallsInMessage.push(...message.additional_kwargs.tool_calls);
        } else if (message.tool_calls && Array.isArray(message.tool_calls)) {
          toolCallsInMessage.push(
            ...message.tool_calls.filter(
              (toolCall: { name?: string }) => toolCall.name !== ""
            )
          );
        } else if (Array.isArray(message.content)) {
          const toolUseBlocks = message.content.filter(
            (block: { type?: string }) => block.type === "tool_use"
          );
          toolCallsInMessage.push(...toolUseBlocks);
        }
        const toolCallsWithStatus = toolCallsInMessage.map(
          (toolCall: {
            id?: string;
            function?: { name?: string; arguments?: unknown };
            name?: string;
            type?: string;
            args?: unknown;
            input?: unknown;
          }) => {
            const name =
              toolCall.function?.name ||
              toolCall.name ||
              toolCall.type ||
              "unknown";
            const args =
              toolCall.function?.arguments ||
              toolCall.args ||
              toolCall.input ||
              {};
            return {
              id: toolCall.id || `tool-${Math.random()}`,
              name,
              args,
              status: interrupt ? "interrupted" : ("pending" as const),
            } as ToolCall;
          }
        );
        messageMap.set(message.id!, {
          message,
          toolCalls: toolCallsWithStatus,
        });
      } else if (message.type === "tool") {
        const toolCallId = message.tool_call_id;
        if (!toolCallId) {
          return;
        }
        for (const [, data] of messageMap.entries()) {
          const toolCallIndex = data.toolCalls.findIndex(
            (tc: ToolCall) => tc.id === toolCallId
          );
          if (toolCallIndex === -1) {
            continue;
          }
          data.toolCalls[toolCallIndex] = {
            ...data.toolCalls[toolCallIndex],
            status: "completed" as const,
            result: extractStringFromMessageContent(message),
          };
          break;
        }
      } else if (message.type === "human") {
        messageMap.set(message.id!, {
          message,
          toolCalls: [],
        });
      }
    });
    const processedArray = Array.from(messageMap.values());
    return processedArray.map((data, index) => {
      const prevMessage = index > 0 ? processedArray[index - 1].message : null;
      return {
        ...data,
        showAvatar: data.message.type !== prevMessage?.type,
      };
    });
  }, [messages, interrupt]);

  const actionRequestsMap: Map<string, ActionRequest> | null = useMemo(() => {
    const actionRequests =
      interrupt?.value && (interrupt.value as any)["action_requests"];
    if (!actionRequests) return new Map<string, ActionRequest>();
    return new Map(actionRequests.map((ar: ActionRequest) => [ar.name, ar]));
  }, [interrupt]);

  const reviewConfigsMap: Map<string, ReviewConfig> | null = useMemo(() => {
    const reviewConfigs =
      interrupt?.value && (interrupt.value as any)["review_configs"];
    if (!reviewConfigs) return new Map<string, ReviewConfig>();
    return new Map(
      reviewConfigs.map((rc: ReviewConfig) => [rc.actionName, rc])
    );
  }, [interrupt]);

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      <ResizablePanel defaultSize={70} minSize={40}>
        <div className="flex flex-1 flex-col h-full overflow-hidden relative">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {rightPanelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
            </Button>
          </div>
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            ref={scrollRef}
          >
            <div
              className="mx-auto w-full max-w-[900px] px-6 pb-6 pt-4"
              ref={contentRef}
            >
              {isThreadLoading ? (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <>
                  {processedMessages.map((data, index) => {
                    const messageUi = ui?.filter(
                      (u: any) => u.metadata?.message_id === data.message.id
                    );
                    const isLastMessage = index === processedMessages.length - 1;
                    return (
                      <ChatMessage
                        key={data.message.id}
                        message={data.message}
                        toolCalls={data.toolCalls}
                        isLoading={isLoading}
                        actionRequestsMap={
                          isLastMessage ? actionRequestsMap : undefined
                        }
                        reviewConfigsMap={
                          isLastMessage ? reviewConfigsMap : undefined
                        }
                        ui={messageUi}
                        stream={stream}
                        onResumeInterrupt={resumeInterrupt}
                        graphId={assistant?.graph_id}
                      />
                    );
                  })}
                </>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 bg-background/80 backdrop-blur-sm p-4 border-t border-border">
            <form
              onSubmit={handleSubmit}
              className="mx-auto w-full max-w-[900px] relative flex items-end gap-2 p-2 bg-surface rounded-xl border border-border shadow-sm focus-within:ring-1 focus-within:ring-primary/30 transition-all"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "Running..." : "Type your message..."}
                className="w-full resize-none bg-transparent border-0 focus:ring-0 p-2 text-sm max-h-32 placeholder:text-muted-foreground/50"
                rows={1}
              />
              <Button
                type={isLoading ? "button" : "submit"}
                variant={isLoading ? "destructive" : "default"}
                onClick={isLoading ? stopStream : handleSubmit}
                size="icon"
                className={cn("mb-0.5 shrink-0 transition-all", isLoading ? "" : "bg-primary hover:bg-primary/90")}
                disabled={!isLoading && (submitDisabled || !input.trim())}
              >
                {isLoading ? <Square size={14} /> : <ArrowUp size={18} />}
              </Button>
            </form>
          </div>
        </div>
      </ResizablePanel>

      {rightPanelOpen && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50} className="bg-[#0f0f0f] border-l border-white/5 shadow-2xl z-20">
            <div className="h-full flex flex-col p-2 gap-2 bg-[url('/noise.png')]">
              <div className="flex-1 min-h-0">
                <WorkspacePanel />
              </div>
              <div className="flex-1 min-h-0">
                <ContextPanel files={files} setFiles={setFiles} />
              </div>
              <div className="flex-1 min-h-0">
                <RAGPanel groundingFiles={groundingFiles} setGroundingFiles={setGroundingFiles} />
              </div>
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
});

ChatInterface.displayName = "ChatInterface";
