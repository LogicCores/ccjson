
exports.forLib = function (LIB) {

    const CLARINET = require("clarinet");
    const ESCAPE_REGEXP = require("escape-regexp-component");


    const VERBOSE = false;


    var Parser = function (path, options, callingArgs, depth) {
        var self = this;

        options = options || {};
        callingArgs = callingArgs || {};

        depth = depth || 0;
        var indent = "";
        for (var i=0;i<depth;i++) indent += "  ";


        function ensurePath (path) {

            // TODO: We need a '!' safe path join that moves the '!' to the front if a segment contains it.
            var optional = /!/.test(path);
            if (optional) {
                path = LIB.path.join(path.replace(/!/, ""));
            }

            return new LIB.Promise(function (resolve, reject) {

                return LIB.fs.exists(path, function (exists) {
                    if (exists) {
                        return resolve(path);
                    }
                    if (
                        options.on &&
                        typeof options.on.fileNotFound === "function"
                    ) {
                        return LIB.Promise.try(function () {
                            return options.on.fileNotFound(path, optional);
                        }).then(resolve, reject);
                    }
                    if (optional) {
                        return resolve(null);
                    }
                    return reject(new Error("File not found '" + path + "'!"));
                });
            }).then(function (path) {
                if (!path) return null;

                return LIB.fs.statAsync(path).then(function (stat) {

                    if (!stat.isFile(path)) {
                        if (optional) {
                            return null;
                        }
                        throw new Error("File not found '" + path + "'!");
                    }

                    return path;
                });
            });
        }


        self.parse = function () {

            if (VERBOSE) {
                console.log("\n\n---------------------------------------------------");
                console.log("PARSE CJSON FILE:", path);
                console.log("---------------------------------------------------");
            }

            return ensurePath(path).then(function (path) {

                if (!path) return null;

                self.path = path;

                return new LIB.Promise(function (resolve, reject) {

//console.log("parseFile ("+ path +")");

                    try {

                        var stream = CLARINET.createStream({});

                        stream.on("error", function (err) {
                            // unhandled errors will throw, since this is a proper node
                            // event emitter.
                            console.error("error!", err);
                            // clear the error
    //                        this._parser.error = null
    //                        this._parser.resume()
                            return reject(err);
                        });


                        var Buffer = function () {
                            var self = this;

                            var config = self.config = {};

                            var pointerHistory = [];
                            var currentPointer = config;
                            var currentKey = null;
                            var currentPath = [];

                            self.isEmpty = function () {
                                return (
                                    pointerHistory.length === 0 &&
                                    currentPath.length === 0 &&
                                    Object.keys(config).length === 0
                                );
                            }

                            self.hasEnded = function () {
                                return (
                                    pointerHistory.length === 0 &&
                                    currentPath.length === 0
                                );
                            }

                            self.onKey = function (key) {
                                currentKey = key;
                                currentPath.push(key);
                            };

                            self.onValue = function (value, valueMeta) {
                                if (valueMeta.length > 0) {
                                    var rawValue = value;
                                    var ourPath = [].concat(currentPath);
                                    value = function () {
                                        return {
                                            path: ourPath,
                                            meta: valueMeta,
                                            value: rawValue
                                        };
                                    }
                                }
                                if (currentKey) {
                                    currentPointer[currentKey] = value;
                                } else
                                if (Array.isArray(currentPointer)) {
                                    currentPointer.push(value);
                                } else {
                                    // TODO: Attach these to the Error object.
                                    console.error("value", value);
                                    console.error("valueMeta", valueMeta);
                                    console.error("currentKey", currentKey);
                                    console.error("currentPointer", currentPointer);
                                    throw new Error("Don't know how to attach value '" + value + "'");
                                }
                                currentPath.pop();
                            };

                            self.onOpenobject = function (key) {
                                if (currentKey) {
                                    pointerHistory.push(currentPointer);
                                    currentPointer = currentPointer[currentKey] = {};
                                    currentKey = key;
                                } else
                                if (Array.isArray(currentPointer)) {
                                    pointerHistory.push(currentPointer);
                                    var newPointer = {};
                                    currentPointer.push(newPointer);
                                    currentPointer = newPointer;
                                    currentKey = key;
                                } else {
                                    currentKey = key;
                                }
                                currentPath.push(key);
                            };

                            self.onCloseobject = function () {
                                currentPath.pop();
                                currentPointer = pointerHistory.pop();
                            };

                            self.onOpenarray = function () {
                                if (currentKey) {
                                    pointerHistory.push(currentPointer);
                                    currentPointer = currentPointer[currentKey] = [];
                                    currentKey = null;
                                } else {
                                    currentPointer = config = [];
                                }
                            };

                            self.onClosearray = function () {
                                currentPointer = pointerHistory.pop();
                            };
                        }


                        var current = {
                            depth: 0,
                            section: null,
                            entityAlias: null,
                            instanceAlias: null,
                            aspectPointer: null,
                            inheritUri: null,
                            buffer: null,
                            bufferStartDepth: null
                        };

                        function getBuffer () {
                            if (!current.buffer) {
                                current.buffer = new Buffer();
                                current.buffer.destroy = function () {
                                    current.buffer = null;
                                    current.bufferStartDepth = null;
                                }
                                current.bufferStartDepth = current.depth;
                            }
                            return current.buffer;
                        }

                        function nextToken (type, value, valueMeta) {

                            try {

                                if (VERBOSE) {
                                    console.log("\n\n** " + LIB.path.basename(path) + " (" + depth + ") DRAIN TOKEN type:", type, "  value:", value, "  section:", current.section, "  depth:", current.depth, "  entityAlias:", current.entityAlias);
                                }

                                function passToBuffer () {
//console.log("PASS TO BUFFER");
                                    if (type === "key") {
                                        getBuffer().onKey(value);
                                    } else
                                    if (type === "value") {
                                        getBuffer().onValue(value, valueMeta);
                                    } else
                                    if (type === "openobject") {
                                        current.depth += 1;
                                        getBuffer().onOpenobject(value);
                                    } else
                                    if (type === "openarray") {
                                        current.depth += 1;
                                        getBuffer().onOpenarray();
                                    } else
                                    if (type === "closeobject") {
                                        current.depth -= 1;
                                        getBuffer().onCloseobject();
                                    } else
                                    if (type === "closearray") {
                                        current.depth -= 1;
                                        getBuffer().onClosearray();
                                    }
                                    return getBuffer();
                                }

                                if (current.section === null) {

                                    if (
                                        type === "openobject" &&
                                        value === "$"
                                    ) {
                                        current.depth += 1;
                                        current.section = "implementation";
                                        return;
                                    } else
                                    if (
                                        type === "openobject" &&
                                        value === "@"
                                    ) {
                                        current.depth += 1;
                                        current.section = "@";
                                        return;
                                    } else
                                    if (
                                        (
                                            type === "key" ||
                                            type === "openobject"
                                        ) &&
                                        /^@/.test(value)
                                    ) {
                                        current.entityAlias = value.replace(/^@/, "");
                                        current.section = "instances";
                                        return;
                                    } else {
                                        passToBuffer();
                                        return;
                                    }

                                } else
                                if (current.section === "codeblock") {

                                    var buffer = passToBuffer();
                                    if (
                                        buffer.hasEnded() &&
                                        type === "closeobject"
                                    ) {
                                        if (current.codeblockSection === "implementation") {
                                            self.emit("EntityImplementation", {
                                                codeblock: buffer.config
                                            });
                                            current.section = null;
                                        } else
                                        if (current.codeblockSection === "mapping-entity-pointer") {
                                            self.emit("MappedEntityPointer", {
                                                entityAlias: current.entityAlias,
                                                codeblock: buffer.config
                                            });
                                            current.section = "mapping";
                                        } else {
                                            throw new Error("Codeblock section '" + current.codeblockSection + "' not implemented!");
                                        }
                                        current.codeblockSection = null;
                                        buffer.destroy();
                                    }
                                    return;

                                } else
                                if (current.section === "implementation") {
                                    // TODO: Make '.@' key configurable.
                                    if (value === ".@") {
                                        // We have an inline codeblock implementation.
                                        current.section = "codeblock";
                                        current.codeblockSection = "implementation";
                                        passToBuffer();
                                    } else {
                                        self.emit("EntityImplementation", {
                                            path: value
                                        });
                                        current.section = null;
                                    }
                                    return;
                                } else
                                if (current.section === "@") {
                                    if (
                                        type === "openobject" &&
                                        value === "$"
                                    ) {
                                        current.depth += 1;
                                        current.section = "inherits";
                                        return;
                                    } else
                                    if (
                                        type === "openobject" ||
                                        type === "key"
                                    ) {
                                        current.depth += 1;
                                        current.entityAlias = value;
                                        current.section = "mapping";
                                        return;
                                    } else
                                    if (type === "closeobject") {
                                        current.depth -= 1;
                                        current.entityAlias = null;
                                        current.section = null;
                                        return;
                                    }
                                } else
                                if (current.section === "mapping") {

                                    if (
                                        type === "key" &&
                                        current.entityAlias === null
                                    ) {
                                        current.entityAlias = value;
                                        return;
                                    } else
/*
                                    if (
                                        type === "openarray" &&
                                        passToBuffer().isEmpty()
                                    ) {
                                        current.depth += 1;
                                        current.entityAlias = null;
                                        current.section = "inherit";
                                        return;
                                    } else
*/
                                    if (
                                        type === "openobject" &&
                                        value === "$"
                                    ) {
                                        current.depth += 1;
                                        current.section = "mapping-entity-pointer"
                                        return;
                                    } else
                                    if (
                                        type === "closeobject" &&
                                        current.entityAlias === null
                                    ) {
                                        current.depth -= 1;
                                        current.section = "@";
                                        return;
                                    } else {
                                        var buffer = passToBuffer();
                                        if (type === "closeobject") {
                                            if (
                                                buffer.hasEnded() &&
                                                (
                                                    // Multiple entities without custom config.
                                                    (buffer.isEmpty() && current.bufferStartDepth === current.depth) ||
                                                    // Single entity or multiple entities with custom config.
                                                    (current.bufferStartDepth === current.depth + 1)
                                                )
                                            ) {
                                                self.emit("MappedEntityConfig", {
                                                    entityAlias: current.entityAlias,
                                                    config: buffer.config
                                                });
                                                current.entityAlias = null;
                                                current.section = "@";
                                                buffer.destroy();
                                            }
                                        }
                                        return;
                                    }

                                } else
                                if (current.section === "mapping-entity-pointer") {
                                    if (type === "value") {
                                        self.emit("MappedEntityPointer", {
                                            entityAlias: current.entityAlias,
                                            path: value
                                        });
                                        current.section = "mapping";
                                        return;
                                    } else
                                    if (
                                        type === "openobject" &&
                                        value === ".@"
                                    ) {
                                        // We have an inline codeblock implementation.
                                        current.section = "codeblock";
                                        current.codeblockSection = "mapping-entity-pointer";
                                        passToBuffer();
                                        return;
                                    }
                                } else
                                if (current.section === "inherits") {

                                    if (type === "openarray") {
                                        current.depth += 1;
                                        current.section = "inherit";
                                        getBuffer().destroy();
                                        return;
                                    } else
                                    if (type === "closearray") {
                                        current.depth -= 1;
                                        getBuffer().destroy();
/*
                                        if (current.depth === 2) {
                                            current.section = "@";
                                        } else {
                                            current.section = "mapping";
                                        }
                                        return;
*/
                                    }

                                } else
                                if (current.section === "inherit") {

                                    if (type === "openarray") {
                                        current.depth += 1;
                                        current.section = "inherit-args";
                                        getBuffer().destroy();
                                        return;
                                    } else
                                    if (type === "value") {
                                        self.emit("InheritEntity", {
                                            path: value
                                        });
                                        return;
                                    } else
                                    if (type === "closearray") {
                                        current.depth -= 1;
                                        getBuffer().destroy();

                                        if (current.depth === 2) {
                                            current.section = "@";
                                        } else {
                                            current.section = "inherits";
                                        }
                                        return;
                                    }
                                } else
                                if (current.section === "inherit-args") {

                                    if (current.depth === 4) {
                                        if (
                                            type === "value" &&
                                            current.inheritUri === null
                                        ) {
                                            current.inheritUri = value;
                                            return;
                                        } else
                                        if (
                                            type === "closearray" &&
                                            current.inheritUri !== null
                                        ) {
                                            current.depth -= 1;
                                            current.inheritUri = null;
                                            current.section = "inherit";
                                            return;
                                        }
                                    }

                                    var buffer = passToBuffer();
                                    if (
                                        buffer.hasEnded() &&
                                        current.bufferStartDepth === current.depth + 1
                                    ) {
                                        self.emit("InheritEntity", {
                                            path: current.inheritUri,
                                            config: buffer.config
                                        });
                                        buffer.destroy();
                                    }
                                    return;

                                } else
                                if (current.section === "instances") {
                                    if (
                                        (
                                            type === "openobject" ||
                                            type === "key"
                                        ) &&
                                        /^\$/.test(value)
                                    ) {
                                        current.depth += 1;
                                        current.instanceAlias = value.replace(/^\$/, "");
                                        current.section = "instance";
                                        return;
                                    } else
                                    if (type === "closeobject") {
                                        current.depth -= 1;
                                        current.entityAlias = null;
                                        current.instanceAlias = null;
                                        current.section = null;
                                        return;
                                    }
                                } else
                                if (current.section === "instance") {

                                    if (
                                        (
                                            type === "openobject" ||
                                            type === "key"
                                        ) &&
                                        /^\$/.test(value) &&
                                        (
                                            current.bufferStartDepth === null ||
                                            current.bufferStartDepth === current.depth
                                        )
                                    ) {
                                        current.depth += 1;
                                        var buffer = getBuffer();
                                        self.emit("MappedEntityInstance", {
                                            entityAlias: current.entityAlias,
                                            instanceAlias: current.instanceAlias,
                                            config: buffer.config
                                        });
                                        current.section = "aspect";
                                        current.aspectPointer = value;
                                        buffer.destroy();
                                        return;
                                    }

                                    if (
                                        type === "closeobject" &&
                                        current.bufferStartDepth === null
                                    ) {
                                        current.depth -= 1;
                                        current.section = "instances";
                                        current.instanceAlias = null;
                                        return;
                                    }

                                    var buffer = passToBuffer();

                                    if (type === "closeobject") {
                                        if (
                                            buffer.hasEnded() &&
                                            current.bufferStartDepth === current.depth + 1
                                        ) {
                                            self.emit("MappedEntityInstance", {
                                                entityAlias: current.entityAlias,
                                                instanceAlias: current.instanceAlias,
                                                config: buffer.config
                                            });
                                            current.section = "instances";
                                            current.instanceAlias = null;
                                            buffer.destroy();
                                        }
                                    }
                                    return;
                                } else
                                if (current.section === "aspect") {

                                    var buffer = passToBuffer();

                                    if (type === "closeobject") {
                                        if (
                                            buffer.hasEnded() &&
                                            current.bufferStartDepth === current.depth + 1
                                        ) {
                                            self.emit("MappedEntityInstanceAspect", {
                                                entityAlias: current.entityAlias,
                                                instanceAlias: current.instanceAlias,
                                                aspectPointer: current.aspectPointer,
                                                config: buffer.config
                                            });
                                            current.section = "instance";
                                            current.aspectPointer = null;
                                            buffer.destroy();
                                        }
                                    }
                                    return;
                                }

                                throw new Error("Unsupported token sequence in file '" + path + "'!");

                            } catch (err) {
                                console.error(err.stack);
                                throw err;
                            }
                        }

                        function replaceAnywhereVariables (value) {

                            if (typeof value !== "string") {
                                return value;
                            }

                            // TODO: Optionally don't replace variables

                            value = value.replace(/\{\{__DIRNAME__\}\}/g, LIB.path.dirname(path));
                            var m = null;

                            var re = /\{\{(!)?(?:env|ENV)\.([^\}]+)\}\}/g;
                            while (m = re.exec(value)) {
                                value = value.replace(
                                    new RegExp(ESCAPE_REGEXP(m[0]), "g"),
                                    options.env(m[2])
                                );
                            }

                            var re = /\{\{(!)?(?:arg|ARG)\.([^\}]+)\}\}/g;
                            while (m = re.exec(value)) {
                                if (typeof callingArgs[m[2]] === "undefined") {
                                    throw new Error("Argument '" + m[2] + "' not found in calling arguments!");
                                }
                                value = value.replace(
                                    new RegExp(ESCAPE_REGEXP(m[0]), "g"),
                                    callingArgs[m[2]]
                                );
                            }

                            return value;
                        }

                        stream.on("openobject", function (key) {
                            key = replaceAnywhereVariables(key);
                            nextToken("openobject", key);
                        });
                        stream.on("key", function (key) {
                            key = replaceAnywhereVariables(key);
                            nextToken("key", key);
                        });
                        stream.on("value", function (value) {

                            var valueMeta = [];

                            // These are set in stone after parsing.
                            // If you need dynamic variables use '{{$*}}' variables.
                            if (typeof value === "string") {

                                value = replaceAnywhereVariables(value);

                                // Check for reference to entity instance variable or local variable selector
                                var re = /\{\{\$(\.)?([^\}]+)\}\}/g;
                                while ( (m = re.exec(value)) ) {
                                    function act(m) {
                                        function replace (string, value) {
                                            return string.replace(
                                                new RegExp(ESCAPE_REGEXP(m[0]), "g"),
                                                value
                                            );
                                        }
                                        if (m[1]) {
                                            // We have a local variable selector
                                            valueMeta.push({
                                                "type": "local-variable-selector",
                                                "selector": ("." + m[2]).split("/"),
                                                "replace": replace
                                            });
                                        } else {
                                            // We have a reference to an entity instance variable
                                            // TODO: Make these rules configurable?
                                            var selectorParts = null;
                                            if (m[2].indexOf(":") === -1) {
                                                console.log("warning: Instance variables are now of the format: <instance>:<selector>");
                                                selectorParts = m[2].split("/");
                                            } else {
                                                var pointerParts = m[2].split(":");
                                                selectorParts = pointerParts[1].split("/");
                                                selectorParts.unshift(pointerParts[0]);
                                            }
                                            valueMeta.push({
                                                "type": "instance-variable-selector",
                                                "instanceAlias": selectorParts.shift(),
                                                "selector": selectorParts,
                                                "replace": replace
                                            });
                                        }
                                    }
                                    act(m);
                                }
                            }

                            nextToken("value", value, valueMeta);
                        });
                        stream.on("closeobject", function () {
                            nextToken("closeobject");
                        });
                        stream.on("openarray", function () {
                            nextToken("openarray");
                        });
                        stream.on("closearray", function () {
                            nextToken("closearray");
                        });
                        stream.on("end", function () {

                            self.emit("EntityConfig", {
                                config: getBuffer().config
                            });

                            return resolve();
                        });


                        function feedStreamFromPath (path) {
                            LIB.fs.createReadStream(path).pipe(stream);
                        }

                        if (
                            options.enabled &&
                            options.enabled.codeblock
                        ) {
                            // If codeblocks are enabled we first parse the file,
                            // freeze all codeblocks to JSON and write it to a frozen path.
                            // We then parse the frozen JSON and where frozen codeblocks
                            // are encountered they are thawed and compiled, then executed.
                            // If codeblocks are encountered to implement entities instead
                            // of a URI to an entity module, they are executed and then
                            // instaciated as if they were external entity modules.

                            const CODEBLOCK = require("codeblock");

                            var purified = CODEBLOCK.purifySync(path, {
                                freezeToJSON: true
                            });

                            return feedStreamFromPath(
                                purified.purifiedPath ||
                                purified.sourcePath
                            );
                        }

                        return feedStreamFromPath(path);

                    } catch (err) {
                        return reject(err);
                    }
                });
            });
        }
    }
    Parser.prototype = Object.create(LIB.EventEmitter.prototype);

    return Parser;
}
