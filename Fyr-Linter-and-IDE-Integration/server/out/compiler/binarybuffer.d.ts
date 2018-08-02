export declare class BinaryBuffer {
    constructor(size?: number);
    readonly data: Uint8Array;
    readonly arrayBuffer: ArrayBuffer;
    readonly length: number;
    fill(length: number): void;
    appendUint8(n: number): void;
    appendInt8(n: number): void;
    appendUint16(n: number): void;
    appendInt16(n: number): void;
    appendUint32(n: number): void;
    appendInt32(n: number): void;
    appendUint64(n: number): void;
    appendInt64(n: number): void;
    appendFloat32(n: number): void;
    appendFloat64(n: number): void;
    appendPointer(n: number): void;
    private resize;
    private arrayBuf;
    private buf;
    private offset;
    private len;
    private numberArrayBuf;
    private numberBuf;
    private numberUint8;
    private numberUint16;
    private numberUint32;
    private numberInt8;
    private numberInt16;
    private numberInt32;
    private numberFloat32;
    private numberFloat64;
}