"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BinaryBuffer {
    constructor(size = 1024) {
        this.offset = 0;
        this.len = 0;
        this.numberArrayBuf = new ArrayBuffer(8);
        this.arrayBuf = new ArrayBuffer(size);
        this.buf = new Uint8Array(this.arrayBuf);
        this.numberBuf = new Uint8Array(this.numberArrayBuf);
        this.numberUint8 = new Uint8Array(this.numberArrayBuf);
        this.numberUint16 = new Uint16Array(this.numberArrayBuf);
        this.numberUint32 = new Uint32Array(this.numberArrayBuf);
        this.numberInt8 = new Int8Array(this.numberArrayBuf);
        this.numberInt16 = new Int16Array(this.numberArrayBuf);
        this.numberInt32 = new Int32Array(this.numberArrayBuf);
        this.numberFloat32 = new Float32Array(this.numberArrayBuf);
        this.numberFloat64 = new Float64Array(this.numberArrayBuf);
    }
    get data() {
        return new Uint8Array(this.arrayBuf, 0, this.len);
    }
    get arrayBuffer() {
        return this.arrayBuf;
    }
    get length() {
        return this.len;
    }
    fill(length) {
        if (this.buf.byteLength < this.offset + length) {
            this.resize(Math.max(this.buf.byteLength * 2, this.buf.byteLength + length));
        }
        for (let i = 0; i < length; i++) {
            this.buf[this.offset + i] = 0;
        }
        this.offset += length;
        this.len = Math.max(this.len, this.offset);
    }
    appendUint8(n) {
        this.buf[this.offset] = n;
        this.offset++;
        this.len = Math.max(this.len, this.offset);
    }
    appendInt8(n) {
        this.numberInt8[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.offset++;
        this.len = Math.max(this.len, this.offset);
    }
    appendUint16(n) {
        this.numberUint16[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.buf[this.offset + 1] = this.numberBuf[1];
        this.offset += 2;
        this.len = Math.max(this.len, this.offset);
    }
    appendInt16(n) {
        this.numberInt16[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.buf[this.offset + 1] = this.numberBuf[1];
        this.offset += 2;
        this.len = Math.max(this.len, this.offset);
    }
    appendUint32(n) {
        this.numberUint32[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.buf[this.offset + 1] = this.numberBuf[1];
        this.buf[this.offset + 2] = this.numberBuf[2];
        this.buf[this.offset + 3] = this.numberBuf[3];
        this.offset += 4;
        this.len = Math.max(this.len, this.offset);
    }
    appendInt32(n) {
        this.numberInt32[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.buf[this.offset + 1] = this.numberBuf[1];
        this.buf[this.offset + 2] = this.numberBuf[2];
        this.buf[this.offset + 3] = this.numberBuf[3];
        this.offset += 4;
        this.len = Math.max(this.len, this.offset);
    }
    // TODO: Big numbers
    appendUint64(n) {
        this.numberUint32[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.buf[this.offset + 1] = this.numberBuf[1];
        this.buf[this.offset + 2] = this.numberBuf[2];
        this.buf[this.offset + 3] = this.numberBuf[3];
        this.buf[this.offset + 4] = 0;
        this.buf[this.offset + 5] = 0;
        this.buf[this.offset + 6] = 0;
        this.buf[this.offset + 7] = 0;
        this.offset += 8;
        this.len = Math.max(this.len, this.offset);
    }
    // TODO: Big numbers
    appendInt64(n) {
        this.numberInt32[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.buf[this.offset + 1] = this.numberBuf[1];
        this.buf[this.offset + 2] = this.numberBuf[2];
        this.buf[this.offset + 3] = this.numberBuf[3];
        this.buf[this.offset + 4] = n < 0 ? 255 : 0;
        this.buf[this.offset + 5] = n < 0 ? 255 : 0;
        this.buf[this.offset + 6] = n < 0 ? 255 : 0;
        this.buf[this.offset + 7] = n < 0 ? 255 : 0;
        this.offset += 8;
        this.len = Math.max(this.len, this.offset);
    }
    appendFloat32(n) {
        this.numberFloat32[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.buf[this.offset + 1] = this.numberBuf[1];
        this.buf[this.offset + 2] = this.numberBuf[2];
        this.buf[this.offset + 3] = this.numberBuf[3];
        this.offset += 4;
        this.len = Math.max(this.len, this.offset);
    }
    appendFloat64(n) {
        this.numberFloat64[0] = n;
        this.buf[this.offset] = this.numberBuf[0];
        this.buf[this.offset + 1] = this.numberBuf[1];
        this.buf[this.offset + 2] = this.numberBuf[2];
        this.buf[this.offset + 3] = this.numberBuf[3];
        this.buf[this.offset + 4] = this.numberBuf[4];
        this.buf[this.offset + 5] = this.numberBuf[5];
        this.buf[this.offset + 6] = this.numberBuf[6];
        this.buf[this.offset + 7] = this.numberBuf[7];
        this.offset += 8;
        this.len = Math.max(this.len, this.offset);
    }
    // TODO: 64bit pointer support
    appendPointer(n) {
        this.appendUint32(n);
    }
    resize(size) {
        this.arrayBuf = transferArrayBuffer(this.buf.buffer, size);
        this.buf = new Uint8Array(this.arrayBuf);
    }
}
exports.BinaryBuffer = BinaryBuffer;
function transferArrayBuffer(source, length) {
    source = Object(source);
    var dest = new ArrayBuffer(length);
    if (!(source instanceof ArrayBuffer) || !(dest instanceof ArrayBuffer)) {
        throw new TypeError('Source and destination must be ArrayBuffer instances');
    }
    if (dest.byteLength >= source.byteLength) {
        var nextOffset = 0;
        var leftBytes = source.byteLength;
        var wordSizes = [8, 4, 2, 1];
        wordSizes.forEach(function (_wordSize_) {
            if (leftBytes >= _wordSize_) {
                var done = transferWith(_wordSize_, source, dest, nextOffset, leftBytes);
                nextOffset = done.nextOffset;
                leftBytes = done.leftBytes;
            }
        });
    }
    return dest;
    function transferWith(wordSize, source, dest, nextOffset, leftBytes) {
        var ViewClass = Uint8Array;
        switch (wordSize) {
            case 8:
                ViewClass = Float64Array;
                break;
            case 4:
                ViewClass = Float32Array;
                break;
            case 2:
                ViewClass = Uint16Array;
                break;
            case 1:
                ViewClass = Uint8Array;
                break;
            default:
                ViewClass = Uint8Array;
                break;
        }
        var view_source = new ViewClass(source, nextOffset, Math.trunc(leftBytes / wordSize));
        var view_dest = new ViewClass(dest, nextOffset, Math.trunc(leftBytes / wordSize));
        for (var i = 0; i < view_dest.length; i++) {
            view_dest[i] = view_source[i];
        }
        return {
            nextOffset: view_source.byteOffset + view_source.byteLength,
            leftBytes: source.byteLength - (view_source.byteOffset + view_source.byteLength)
        };
    }
}
//# sourceMappingURL=binarybuffer.js.map