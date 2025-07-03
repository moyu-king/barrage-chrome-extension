import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace barrage. */
export namespace barrage {

    /** Properties of a BarrageSegMobi1eReply. */
    interface IBarrageSegMobi1eReply {

        /** BarrageSegMobi1eReply elems */
        elems?: (barrage.IBarrageElem[]|null);
    }

    /** Represents a BarrageSegMobi1eReply. */
    class BarrageSegMobi1eReply implements IBarrageSegMobi1eReply {

        /**
         * Constructs a new BarrageSegMobi1eReply.
         * @param [properties] Properties to set
         */
        constructor(properties?: barrage.IBarrageSegMobi1eReply);

        /** BarrageSegMobi1eReply elems. */
        public elems: barrage.IBarrageElem[];

        /**
         * Creates a new BarrageSegMobi1eReply instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BarrageSegMobi1eReply instance
         */
        public static create(properties?: barrage.IBarrageSegMobi1eReply): barrage.BarrageSegMobi1eReply;

        /**
         * Encodes the specified BarrageSegMobi1eReply message. Does not implicitly {@link barrage.BarrageSegMobi1eReply.verify|verify} messages.
         * @param message BarrageSegMobi1eReply message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: barrage.IBarrageSegMobi1eReply, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BarrageSegMobi1eReply message, length delimited. Does not implicitly {@link barrage.BarrageSegMobi1eReply.verify|verify} messages.
         * @param message BarrageSegMobi1eReply message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: barrage.IBarrageSegMobi1eReply, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BarrageSegMobi1eReply message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BarrageSegMobi1eReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): barrage.BarrageSegMobi1eReply;

        /**
         * Decodes a BarrageSegMobi1eReply message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BarrageSegMobi1eReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): barrage.BarrageSegMobi1eReply;

        /**
         * Verifies a BarrageSegMobi1eReply message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BarrageSegMobi1eReply message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BarrageSegMobi1eReply
         */
        public static fromObject(object: { [k: string]: any }): barrage.BarrageSegMobi1eReply;

        /**
         * Creates a plain object from a BarrageSegMobi1eReply message. Also converts values to other types if specified.
         * @param message BarrageSegMobi1eReply
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: barrage.BarrageSegMobi1eReply, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BarrageSegMobi1eReply to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BarrageSegMobi1eReply
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BarrageElem. */
    interface IBarrageElem {

        /** BarrageElem id */
        id?: (number|Long|null);

        /** BarrageElem progress */
        progress?: (number|null);

        /** BarrageElem mode */
        mode?: (number|null);

        /** BarrageElem fontsize */
        fontsize?: (number|null);

        /** BarrageElem color */
        color?: (number|null);

        /** BarrageElem midHash */
        midHash?: (string|null);

        /** BarrageElem content */
        content?: (string|null);

        /** BarrageElem ctime */
        ctime?: (number|Long|null);

        /** BarrageElem weight */
        weight?: (number|null);

        /** BarrageElem action */
        action?: (string|null);

        /** BarrageElem pool */
        pool?: (number|null);

        /** BarrageElem idStr */
        idStr?: (string|null);
    }

    /** Represents a BarrageElem. */
    class BarrageElem implements IBarrageElem {

        /**
         * Constructs a new BarrageElem.
         * @param [properties] Properties to set
         */
        constructor(properties?: barrage.IBarrageElem);

        /** BarrageElem id. */
        public id: (number|Long);

        /** BarrageElem progress. */
        public progress: number;

        /** BarrageElem mode. */
        public mode: number;

        /** BarrageElem fontsize. */
        public fontsize: number;

        /** BarrageElem color. */
        public color: number;

        /** BarrageElem midHash. */
        public midHash: string;

        /** BarrageElem content. */
        public content: string;

        /** BarrageElem ctime. */
        public ctime: (number|Long);

        /** BarrageElem weight. */
        public weight: number;

        /** BarrageElem action. */
        public action: string;

        /** BarrageElem pool. */
        public pool: number;

        /** BarrageElem idStr. */
        public idStr: string;

        /**
         * Creates a new BarrageElem instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BarrageElem instance
         */
        public static create(properties?: barrage.IBarrageElem): barrage.BarrageElem;

        /**
         * Encodes the specified BarrageElem message. Does not implicitly {@link barrage.BarrageElem.verify|verify} messages.
         * @param message BarrageElem message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: barrage.IBarrageElem, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BarrageElem message, length delimited. Does not implicitly {@link barrage.BarrageElem.verify|verify} messages.
         * @param message BarrageElem message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: barrage.IBarrageElem, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BarrageElem message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BarrageElem
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): barrage.BarrageElem;

        /**
         * Decodes a BarrageElem message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BarrageElem
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): barrage.BarrageElem;

        /**
         * Verifies a BarrageElem message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BarrageElem message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BarrageElem
         */
        public static fromObject(object: { [k: string]: any }): barrage.BarrageElem;

        /**
         * Creates a plain object from a BarrageElem message. Also converts values to other types if specified.
         * @param message BarrageElem
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: barrage.BarrageElem, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BarrageElem to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BarrageElem
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
