import type { FsOutput } from './filesystem';
import type { IncomingMessage, ServerResponse } from 'http';
import type { NextConfigComplete } from '../../config-shared';
import type { RenderServer, initialize } from '../router-server';
import type { UnwrapPromise } from '../../../lib/coalesced-function';
import type { NextUrlWithParsedQuery } from '../../request-meta';
import '../../node-polyfill-web-streams';
export declare function getResolveRoutes(fsChecker: UnwrapPromise<ReturnType<typeof import('./filesystem').setupFsCheck>>, config: NextConfigComplete, opts: Parameters<typeof initialize>[0], renderServer: RenderServer, renderServerOpts: Parameters<RenderServer['initialize']>[0], ensureMiddleware?: () => Promise<void>): ({ req, res, isUpgradeReq, invokedOutputs, }: {
    req: IncomingMessage;
    res: ServerResponse;
    isUpgradeReq: boolean;
    signal: AbortSignal;
    invokedOutputs?: Set<string> | undefined;
}) => Promise<{
    finished: boolean;
    statusCode?: number | undefined;
    bodyStream?: ReadableStream<any> | null | undefined;
    resHeaders: Record<string, string | string[]>;
    parsedUrl: NextUrlWithParsedQuery;
    matchedOutput?: FsOutput | null | undefined;
}>;
