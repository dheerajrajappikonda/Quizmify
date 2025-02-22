/// <reference types="node" />
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import type { FetchMetrics } from './index';
import { BaseNextRequest, BaseNextResponse } from './index';
export declare class WebNextRequest extends BaseNextRequest<ReadableStream | null> {
    request: Request;
    headers: IncomingHttpHeaders;
    fetchMetrics?: FetchMetrics;
    constructor(request: Request);
    parseBody(_limit: string | number): Promise<any>;
}
export declare class WebNextResponse extends BaseNextResponse<WritableStream> {
    transformStream: TransformStream<any, any>;
    private headers;
    private textBody;
    private _sent;
    private sendPromise;
    private sendResolve?;
    private response;
    statusCode: number | undefined;
    statusMessage: string | undefined;
    get sent(): boolean;
    constructor(transformStream?: TransformStream<any, any>);
    setHeader(name: string, value: string | string[]): this;
    removeHeader(name: string): this;
    getHeaderValues(name: string): string[] | undefined;
    getHeader(name: string): string | undefined;
    getHeaders(): OutgoingHttpHeaders;
    hasHeader(name: string): boolean;
    appendHeader(name: string, value: string): this;
    body(value: string): this;
    send(): void;
    toResponse(): Promise<Response>;
}
