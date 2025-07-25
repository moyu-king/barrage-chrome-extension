/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const barrage = $root.barrage = (() => {

    /**
     * Namespace barrage.
     * @exports barrage
     * @namespace
     */
    const barrage = {};

    barrage.BarrageReply = (function() {

        /**
         * Properties of a BarrageReply.
         * @memberof barrage
         * @interface IBarrageReply
         * @property {Array.<barrage.IBarrageElem>|null} [elems] BarrageReply elems
         */

        /**
         * Constructs a new BarrageReply.
         * @memberof barrage
         * @classdesc Represents a BarrageReply.
         * @implements IBarrageReply
         * @constructor
         * @param {barrage.IBarrageReply=} [properties] Properties to set
         */
        function BarrageReply(properties) {
            this.elems = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BarrageReply elems.
         * @member {Array.<barrage.IBarrageElem>} elems
         * @memberof barrage.BarrageReply
         * @instance
         */
        BarrageReply.prototype.elems = $util.emptyArray;

        /**
         * Creates a new BarrageReply instance using the specified properties.
         * @function create
         * @memberof barrage.BarrageReply
         * @static
         * @param {barrage.IBarrageReply=} [properties] Properties to set
         * @returns {barrage.BarrageReply} BarrageReply instance
         */
        BarrageReply.create = function create(properties) {
            return new BarrageReply(properties);
        };

        /**
         * Encodes the specified BarrageReply message. Does not implicitly {@link barrage.BarrageReply.verify|verify} messages.
         * @function encode
         * @memberof barrage.BarrageReply
         * @static
         * @param {barrage.IBarrageReply} message BarrageReply message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BarrageReply.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.elems != null && message.elems.length)
                for (let i = 0; i < message.elems.length; ++i)
                    $root.barrage.BarrageElem.encode(message.elems[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified BarrageReply message, length delimited. Does not implicitly {@link barrage.BarrageReply.verify|verify} messages.
         * @function encodeDelimited
         * @memberof barrage.BarrageReply
         * @static
         * @param {barrage.IBarrageReply} message BarrageReply message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BarrageReply.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BarrageReply message from the specified reader or buffer.
         * @function decode
         * @memberof barrage.BarrageReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {barrage.BarrageReply} BarrageReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BarrageReply.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.barrage.BarrageReply();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.elems && message.elems.length))
                            message.elems = [];
                        message.elems.push($root.barrage.BarrageElem.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BarrageReply message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof barrage.BarrageReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {barrage.BarrageReply} BarrageReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BarrageReply.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BarrageReply message.
         * @function verify
         * @memberof barrage.BarrageReply
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BarrageReply.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.elems != null && message.hasOwnProperty("elems")) {
                if (!Array.isArray(message.elems))
                    return "elems: array expected";
                for (let i = 0; i < message.elems.length; ++i) {
                    let error = $root.barrage.BarrageElem.verify(message.elems[i]);
                    if (error)
                        return "elems." + error;
                }
            }
            return null;
        };

        /**
         * Creates a BarrageReply message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof barrage.BarrageReply
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {barrage.BarrageReply} BarrageReply
         */
        BarrageReply.fromObject = function fromObject(object) {
            if (object instanceof $root.barrage.BarrageReply)
                return object;
            let message = new $root.barrage.BarrageReply();
            if (object.elems) {
                if (!Array.isArray(object.elems))
                    throw TypeError(".barrage.BarrageReply.elems: array expected");
                message.elems = [];
                for (let i = 0; i < object.elems.length; ++i) {
                    if (typeof object.elems[i] !== "object")
                        throw TypeError(".barrage.BarrageReply.elems: object expected");
                    message.elems[i] = $root.barrage.BarrageElem.fromObject(object.elems[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a BarrageReply message. Also converts values to other types if specified.
         * @function toObject
         * @memberof barrage.BarrageReply
         * @static
         * @param {barrage.BarrageReply} message BarrageReply
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BarrageReply.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.elems = [];
            if (message.elems && message.elems.length) {
                object.elems = [];
                for (let j = 0; j < message.elems.length; ++j)
                    object.elems[j] = $root.barrage.BarrageElem.toObject(message.elems[j], options);
            }
            return object;
        };

        /**
         * Converts this BarrageReply to JSON.
         * @function toJSON
         * @memberof barrage.BarrageReply
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BarrageReply.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BarrageReply
         * @function getTypeUrl
         * @memberof barrage.BarrageReply
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BarrageReply.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/barrage.BarrageReply";
        };

        return BarrageReply;
    })();

    barrage.BarrageElem = (function() {

        /**
         * Properties of a BarrageElem.
         * @memberof barrage
         * @interface IBarrageElem
         * @property {number|Long|null} [id] BarrageElem id
         * @property {number|null} [progress] BarrageElem progress
         * @property {number|null} [mode] BarrageElem mode
         * @property {number|null} [fontsize] BarrageElem fontsize
         * @property {number|null} [color] BarrageElem color
         * @property {string|null} [midHash] BarrageElem midHash
         * @property {string|null} [content] BarrageElem content
         * @property {number|Long|null} [ctime] BarrageElem ctime
         * @property {number|null} [weight] BarrageElem weight
         * @property {string|null} [action] BarrageElem action
         * @property {number|null} [pool] BarrageElem pool
         * @property {string|null} [idStr] BarrageElem idStr
         * @property {number|null} [attr] BarrageElem attr
         * @property {string|null} [animation] BarrageElem animation
         */

        /**
         * Constructs a new BarrageElem.
         * @memberof barrage
         * @classdesc Represents a BarrageElem.
         * @implements IBarrageElem
         * @constructor
         * @param {barrage.IBarrageElem=} [properties] Properties to set
         */
        function BarrageElem(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BarrageElem id.
         * @member {number|Long} id
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.id = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BarrageElem progress.
         * @member {number} progress
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.progress = 0;

        /**
         * BarrageElem mode.
         * @member {number} mode
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.mode = 0;

        /**
         * BarrageElem fontsize.
         * @member {number} fontsize
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.fontsize = 0;

        /**
         * BarrageElem color.
         * @member {number} color
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.color = 0;

        /**
         * BarrageElem midHash.
         * @member {string} midHash
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.midHash = "";

        /**
         * BarrageElem content.
         * @member {string} content
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.content = "";

        /**
         * BarrageElem ctime.
         * @member {number|Long} ctime
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.ctime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BarrageElem weight.
         * @member {number} weight
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.weight = 0;

        /**
         * BarrageElem action.
         * @member {string} action
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.action = "";

        /**
         * BarrageElem pool.
         * @member {number} pool
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.pool = 0;

        /**
         * BarrageElem idStr.
         * @member {string} idStr
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.idStr = "";

        /**
         * BarrageElem attr.
         * @member {number} attr
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.attr = 0;

        /**
         * BarrageElem animation.
         * @member {string} animation
         * @memberof barrage.BarrageElem
         * @instance
         */
        BarrageElem.prototype.animation = "";

        /**
         * Creates a new BarrageElem instance using the specified properties.
         * @function create
         * @memberof barrage.BarrageElem
         * @static
         * @param {barrage.IBarrageElem=} [properties] Properties to set
         * @returns {barrage.BarrageElem} BarrageElem instance
         */
        BarrageElem.create = function create(properties) {
            return new BarrageElem(properties);
        };

        /**
         * Encodes the specified BarrageElem message. Does not implicitly {@link barrage.BarrageElem.verify|verify} messages.
         * @function encode
         * @memberof barrage.BarrageElem
         * @static
         * @param {barrage.IBarrageElem} message BarrageElem message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BarrageElem.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.id);
            if (message.progress != null && Object.hasOwnProperty.call(message, "progress"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.progress);
            if (message.mode != null && Object.hasOwnProperty.call(message, "mode"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.mode);
            if (message.fontsize != null && Object.hasOwnProperty.call(message, "fontsize"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.fontsize);
            if (message.color != null && Object.hasOwnProperty.call(message, "color"))
                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.color);
            if (message.midHash != null && Object.hasOwnProperty.call(message, "midHash"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.midHash);
            if (message.content != null && Object.hasOwnProperty.call(message, "content"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.content);
            if (message.ctime != null && Object.hasOwnProperty.call(message, "ctime"))
                writer.uint32(/* id 8, wireType 0 =*/64).int64(message.ctime);
            if (message.weight != null && Object.hasOwnProperty.call(message, "weight"))
                writer.uint32(/* id 9, wireType 0 =*/72).int32(message.weight);
            if (message.action != null && Object.hasOwnProperty.call(message, "action"))
                writer.uint32(/* id 10, wireType 2 =*/82).string(message.action);
            if (message.pool != null && Object.hasOwnProperty.call(message, "pool"))
                writer.uint32(/* id 11, wireType 0 =*/88).int32(message.pool);
            if (message.idStr != null && Object.hasOwnProperty.call(message, "idStr"))
                writer.uint32(/* id 12, wireType 2 =*/98).string(message.idStr);
            if (message.attr != null && Object.hasOwnProperty.call(message, "attr"))
                writer.uint32(/* id 13, wireType 0 =*/104).int32(message.attr);
            if (message.animation != null && Object.hasOwnProperty.call(message, "animation"))
                writer.uint32(/* id 14, wireType 2 =*/114).string(message.animation);
            return writer;
        };

        /**
         * Encodes the specified BarrageElem message, length delimited. Does not implicitly {@link barrage.BarrageElem.verify|verify} messages.
         * @function encodeDelimited
         * @memberof barrage.BarrageElem
         * @static
         * @param {barrage.IBarrageElem} message BarrageElem message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BarrageElem.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BarrageElem message from the specified reader or buffer.
         * @function decode
         * @memberof barrage.BarrageElem
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {barrage.BarrageElem} BarrageElem
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BarrageElem.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.barrage.BarrageElem();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.int64();
                        break;
                    }
                case 2: {
                        message.progress = reader.int32();
                        break;
                    }
                case 3: {
                        message.mode = reader.int32();
                        break;
                    }
                case 4: {
                        message.fontsize = reader.int32();
                        break;
                    }
                case 5: {
                        message.color = reader.uint32();
                        break;
                    }
                case 6: {
                        message.midHash = reader.string();
                        break;
                    }
                case 7: {
                        message.content = reader.string();
                        break;
                    }
                case 8: {
                        message.ctime = reader.int64();
                        break;
                    }
                case 9: {
                        message.weight = reader.int32();
                        break;
                    }
                case 10: {
                        message.action = reader.string();
                        break;
                    }
                case 11: {
                        message.pool = reader.int32();
                        break;
                    }
                case 12: {
                        message.idStr = reader.string();
                        break;
                    }
                case 13: {
                        message.attr = reader.int32();
                        break;
                    }
                case 14: {
                        message.animation = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BarrageElem message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof barrage.BarrageElem
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {barrage.BarrageElem} BarrageElem
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BarrageElem.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BarrageElem message.
         * @function verify
         * @memberof barrage.BarrageElem
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BarrageElem.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isInteger(message.id) && !(message.id && $util.isInteger(message.id.low) && $util.isInteger(message.id.high)))
                    return "id: integer|Long expected";
            if (message.progress != null && message.hasOwnProperty("progress"))
                if (!$util.isInteger(message.progress))
                    return "progress: integer expected";
            if (message.mode != null && message.hasOwnProperty("mode"))
                if (!$util.isInteger(message.mode))
                    return "mode: integer expected";
            if (message.fontsize != null && message.hasOwnProperty("fontsize"))
                if (!$util.isInteger(message.fontsize))
                    return "fontsize: integer expected";
            if (message.color != null && message.hasOwnProperty("color"))
                if (!$util.isInteger(message.color))
                    return "color: integer expected";
            if (message.midHash != null && message.hasOwnProperty("midHash"))
                if (!$util.isString(message.midHash))
                    return "midHash: string expected";
            if (message.content != null && message.hasOwnProperty("content"))
                if (!$util.isString(message.content))
                    return "content: string expected";
            if (message.ctime != null && message.hasOwnProperty("ctime"))
                if (!$util.isInteger(message.ctime) && !(message.ctime && $util.isInteger(message.ctime.low) && $util.isInteger(message.ctime.high)))
                    return "ctime: integer|Long expected";
            if (message.weight != null && message.hasOwnProperty("weight"))
                if (!$util.isInteger(message.weight))
                    return "weight: integer expected";
            if (message.action != null && message.hasOwnProperty("action"))
                if (!$util.isString(message.action))
                    return "action: string expected";
            if (message.pool != null && message.hasOwnProperty("pool"))
                if (!$util.isInteger(message.pool))
                    return "pool: integer expected";
            if (message.idStr != null && message.hasOwnProperty("idStr"))
                if (!$util.isString(message.idStr))
                    return "idStr: string expected";
            if (message.attr != null && message.hasOwnProperty("attr"))
                if (!$util.isInteger(message.attr))
                    return "attr: integer expected";
            if (message.animation != null && message.hasOwnProperty("animation"))
                if (!$util.isString(message.animation))
                    return "animation: string expected";
            return null;
        };

        /**
         * Creates a BarrageElem message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof barrage.BarrageElem
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {barrage.BarrageElem} BarrageElem
         */
        BarrageElem.fromObject = function fromObject(object) {
            if (object instanceof $root.barrage.BarrageElem)
                return object;
            let message = new $root.barrage.BarrageElem();
            if (object.id != null)
                if ($util.Long)
                    (message.id = $util.Long.fromValue(object.id)).unsigned = false;
                else if (typeof object.id === "string")
                    message.id = parseInt(object.id, 10);
                else if (typeof object.id === "number")
                    message.id = object.id;
                else if (typeof object.id === "object")
                    message.id = new $util.LongBits(object.id.low >>> 0, object.id.high >>> 0).toNumber();
            if (object.progress != null)
                message.progress = object.progress | 0;
            if (object.mode != null)
                message.mode = object.mode | 0;
            if (object.fontsize != null)
                message.fontsize = object.fontsize | 0;
            if (object.color != null)
                message.color = object.color >>> 0;
            if (object.midHash != null)
                message.midHash = String(object.midHash);
            if (object.content != null)
                message.content = String(object.content);
            if (object.ctime != null)
                if ($util.Long)
                    (message.ctime = $util.Long.fromValue(object.ctime)).unsigned = false;
                else if (typeof object.ctime === "string")
                    message.ctime = parseInt(object.ctime, 10);
                else if (typeof object.ctime === "number")
                    message.ctime = object.ctime;
                else if (typeof object.ctime === "object")
                    message.ctime = new $util.LongBits(object.ctime.low >>> 0, object.ctime.high >>> 0).toNumber();
            if (object.weight != null)
                message.weight = object.weight | 0;
            if (object.action != null)
                message.action = String(object.action);
            if (object.pool != null)
                message.pool = object.pool | 0;
            if (object.idStr != null)
                message.idStr = String(object.idStr);
            if (object.attr != null)
                message.attr = object.attr | 0;
            if (object.animation != null)
                message.animation = String(object.animation);
            return message;
        };

        /**
         * Creates a plain object from a BarrageElem message. Also converts values to other types if specified.
         * @function toObject
         * @memberof barrage.BarrageElem
         * @static
         * @param {barrage.BarrageElem} message BarrageElem
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BarrageElem.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.id = options.longs === String ? "0" : 0;
                object.progress = 0;
                object.mode = 0;
                object.fontsize = 0;
                object.color = 0;
                object.midHash = "";
                object.content = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.ctime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.ctime = options.longs === String ? "0" : 0;
                object.weight = 0;
                object.action = "";
                object.pool = 0;
                object.idStr = "";
                object.attr = 0;
                object.animation = "";
            }
            if (message.id != null && message.hasOwnProperty("id"))
                if (typeof message.id === "number")
                    object.id = options.longs === String ? String(message.id) : message.id;
                else
                    object.id = options.longs === String ? $util.Long.prototype.toString.call(message.id) : options.longs === Number ? new $util.LongBits(message.id.low >>> 0, message.id.high >>> 0).toNumber() : message.id;
            if (message.progress != null && message.hasOwnProperty("progress"))
                object.progress = message.progress;
            if (message.mode != null && message.hasOwnProperty("mode"))
                object.mode = message.mode;
            if (message.fontsize != null && message.hasOwnProperty("fontsize"))
                object.fontsize = message.fontsize;
            if (message.color != null && message.hasOwnProperty("color"))
                object.color = message.color;
            if (message.midHash != null && message.hasOwnProperty("midHash"))
                object.midHash = message.midHash;
            if (message.content != null && message.hasOwnProperty("content"))
                object.content = message.content;
            if (message.ctime != null && message.hasOwnProperty("ctime"))
                if (typeof message.ctime === "number")
                    object.ctime = options.longs === String ? String(message.ctime) : message.ctime;
                else
                    object.ctime = options.longs === String ? $util.Long.prototype.toString.call(message.ctime) : options.longs === Number ? new $util.LongBits(message.ctime.low >>> 0, message.ctime.high >>> 0).toNumber() : message.ctime;
            if (message.weight != null && message.hasOwnProperty("weight"))
                object.weight = message.weight;
            if (message.action != null && message.hasOwnProperty("action"))
                object.action = message.action;
            if (message.pool != null && message.hasOwnProperty("pool"))
                object.pool = message.pool;
            if (message.idStr != null && message.hasOwnProperty("idStr"))
                object.idStr = message.idStr;
            if (message.attr != null && message.hasOwnProperty("attr"))
                object.attr = message.attr;
            if (message.animation != null && message.hasOwnProperty("animation"))
                object.animation = message.animation;
            return object;
        };

        /**
         * Converts this BarrageElem to JSON.
         * @function toJSON
         * @memberof barrage.BarrageElem
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BarrageElem.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BarrageElem
         * @function getTypeUrl
         * @memberof barrage.BarrageElem
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BarrageElem.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/barrage.BarrageElem";
        };

        return BarrageElem;
    })();

    return barrage;
})();

export { $root as default };
