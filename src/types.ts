/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

interface IInput {
  type: 'input';
  contentType: 'text';
  content: string;
  context?: {
    appId?: string;
  };
}
interface IOutput {
  type: 'output';
  traceId?: string; // used for tracing agent calls
  toolsUsed?: string[];
  contentType: 'error' | 'markdown' | 'visualization' | 'ppl_visualization';
  content: string;
  suggestedActions?: ISuggestedAction[];
}
export type IMessage = IInput | IOutput;

interface ISuggestedActionBase {
  actionType: string;
  message: string;
}
type ISuggestedAction = ISuggestedActionBase &
  (
    | { actionType: 'send_as_input' | 'copy' | 'view_in_dashboards' }
    | {
        actionType: 'view_ppl_visualization';
        metadata: { query: string; question: string };
      }
  );
