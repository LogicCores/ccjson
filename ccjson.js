
require("require.async")(require);

const TRAVERSE = require("traverse");

exports.makeLib = function () {
    var api = {
        path: require("path"),
        fs: require("fs"),
        Promise: require("bluebird"),
        _: require("lodash"),
        traverse: TRAVERSE,
        ccjson: exports,
        CJSON: {
            stringify: require("canonical-json")
        }
    };
    api.Promise.promisifyAll(api.fs);
    return api;
}


exports.forLib = function (LIB) {

    const CLARINET = require("clarinet");
    const EVENTS = require("events");
    const ESCAPE_REGEXP = require("escape-regexp-component");
    
    
    var CCJSON = function () {
        var ccjson = this;

        var detachedFunctions = {};
        var detachedFunctionIndex = 0;
        ccjson.makeDetachedFunction = function (func) {
            detachedFunctionIndex += 1;
            detachedFunctions["f:" + detachedFunctionIndex] = func;
            return "&func&f:" + detachedFunctionIndex;
        }
        ccjson.attachDetachedFunctions = function (config) {
            return TRAVERSE(config).map(function (node) {
                if (
                    typeof node === "string" &&
                    /^&func&.+/.test(node)
                ) {
                    var funcId = node.substring(6);
                    if (!detachedFunctions[funcId]) {
                        throw new Error("Detached function with id '" + funcId + "' not found! The function was likely not detached in the same runtime instance!");
                    }
                    this.update(detachedFunctions[funcId]);
                }
            });
        }

        var entityMappings = {};
        function getEntityMappingForAlias (alias) {
            if (!entityMappings[alias]) {
                entityMappings[alias] = LIB.Promise.defer();
            }
            return entityMappings[alias].promise;
        }

        var entityImplementations = {};
        function loadEntityImplementation (path) {
            if (entityImplementations[path]) {
                return entityImplementations[path];
            }
            return (entityImplementations[path] = new LIB.Promise(function (resolve, reject) {
                return require.async(path, resolve, function (err) {
                    console.error("Error loading '" + path + "'");
                    return reject(err);
                });
            }).then(function (impl) {
                return impl.forLib.call(ccjson, LIB);
            }));
        }

        ccjson.parseFile = function (path, options) {

            function parseFile (path, parseOptions, callingEntities, callingArgs, depth) {
                
                depth = depth || 0;
                var indent = "";
                for (var i=0;i<depth;i++) indent += "  ";

                callingEntities = callingEntities || [];
                callingArgs = callingArgs || {};

//console.log(indent + "PARSE FILE 1", path, "NS:", callingArgs.namespace);

        //console.log("\n\n---------------------------------------------------");
        //console.log("PARSE CJSON FILE:", path);
        //console.log("---------------------------------------------------");
        
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
                                parseOptions.on &&
                                typeof parseOptions.on.fileNotFound === "function"
                            ) {
                                return LIB.Promise.try(function () {
                                    return parseOptions.on.fileNotFound(path, optional);
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
                
                return ensurePath(path).then(function (path) {
                    
                    if (!path) return null;

                    return new LIB.Promise(function (resolve, reject) {
        
                        try {

                            var config = new Config(path, parseOptions, callingEntities, callingArgs, depth);
        
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
        
                            var current = {
                                section: null,
                                drains: [],
                                drainCount: 0,
                                drained: false,
                                entityAlias: null,
                                captureImplementation: false
                            };
        
                            function nextToken (type, value, valueMeta) {
                                
                                try {
        
                                    var drainOnStart = null;
        
        //console.log("current.drains.length", current.drains.length);    
                                    if (current.drains.length > 0) {
                                        
                                        drainOnStart = current.drains[current.drains.length-1][0];

//console.log("  ... draining token", type, value, current.section);

//console.log("drainOnStart", drainOnStart);        
                                        var m = null;
                                        // 02-EntityMapping
                                        if (
                                            current.drainCount === 0 &&
                                            type === "openobject" &&
                                            typeof drainOnStart.onImplementation === "function" &&
                                            value === "$"
                                        ) {
                                            current.captureImplementation = true
                                        } else
                                        if (
                                            current.drainCount === 0 &&
                                            type === "value" &&
                                            typeof drainOnStart.onImplementation === "function" &&
                                            current.captureImplementation === true
                                        ) {
                                            drainOnStart.onImplementation(
                                                /^\//.test(value) ? value : LIB.path.join(path, "..", value)
                                            );
                                            current.captureImplementation = false;
                                        } else
                                        // 07-InstanceAspects
                                        if (
                                            current.section === "instance" &&
                                            (type === "openobject" || type === "key") &&
                                            value && (m = value.match(/^\$(.+)\(\)->(.+)$/))
                                        ) {
                                            current.section = "instance-aspect";
                                            current.drains.push([
                                                config.registerEntityInstanceAspectDeclaration(
                                                    drainOnStart.instanceAlias,
                                                    m[1],
                                                    m[2]
                                                ),
                                                current.drainCount
                                            ]);
                                            current.drains[current.drains.length-1][0].drain.assembler.once("end", function () {
                                                current.section = "instance";
                                                current.drainCount = 0;
                                                current.drains.pop();
                                            });
                                        } else
                                        if (
                                            (
                                                current.drainCount === 0 ||
                                                (
                                                    drainOnStart.drain.assembler &&
                                                    drainOnStart.drain.assembler.hasEnded()
                                                )
                                            ) &&
                                            current.section === "instance" &&
                                            type === "closeobject"
                                        ) {
                                            current.section = "entity";
                                            current.drainCount = current.drains.pop()[1];
                                        } else
                                        if (
                                            drainOnStart.drain.assembler &&
                                            drainOnStart.drain.assembler.hasEnded() &&
                                            current.section === "instance" &&
                                            type === "closeobject"
                                        ) {
                                            current.section = "entity";
                                            current.drainCount = current.drains.pop()[1];
                                        } else

                                        {
//console.log("drain sub", current);                                            
                                            current.drainCount += 1;
                                            drainOnStart.drain.assembler.emit(type, value, valueMeta);
                                        }
                                        return;
                                    }
            
//console.log("NEXT TOKEN", type, value, current.section);
            
                                    if (current.drained) {
                                        current.drained = false;
            
//console.log(" .. DRAINED", current.section);
                                        // 02-EntityMapping
                                        if (
                                            current.section === "mapping" &&
                                            type === "closeobject"
                                        ) {
                                            current.section = null;
                                            return;
                                        } else
                                        // 05-MultipleEntityMappingsAndInstances
                                        if (
                                            current.section === "mapping" &&
                                            type === "key"
                                        ) {
                                            current.section = "mapping";
                                        } else
                                        // 03-EntityInstance
                                        if (
                                            current.section === "instance" &&
                                            type === "key"
                                        ) {
                                            current.section = "entity";
                                        } else
                                        // 04-ConfigInheritance
                                        if (
                                            current.section === "instance" &&
                                            type === "closeobject"
                                        ) {
                                            current.section = "entity";
                                            return;
                                        } else
                                        if (
                                            current.section === "inherit-record" &&
                                            type === "closearray"
                                        ) {
                                            current.section = "config";
                                            return;
                                        }
                                    } else
                                    if (
                                        current.section === "entity" &&
                                        type === "closeobject"
                                    ) {
                                        current.section = null;
                                        return;
                                    }


                                    // 01-EntityImplementation
                                    if (
                                        current.section === null &&
                                        type === "openobject" &&
                                        value === "$"
                                    ) {
                                        current.section = "impl"
                                    } else
                                    if (
                                        current.section === "impl" &&
                                        type === "value"
                                    ) {
                                        current.drains.push([config.registerEntityImplementation(
                                            /^\//.test(value) ? value : LIB.path.join(path, "..", value)
                                        ), current.drainCount]);
                                    } else
                                    
                                    // 02-EntityMapping
                                    if (
                                        current.section === null &&
                                        type === "openobject" &&
                                        value === "@"
                                    ) {
                                        current.section = "config"
                                    } else
                                    if (
                                        current.section === "config" &&
                                        type === "openobject" &&
                                        value !== "$"
                                    ) {
                                        current.drains.push([config.registerEntityMappingDeclaration(value), current.drainCount]);
                                        current.section = "mapping";
                                    } else
                                    if (
                                        current.section === "config" &&
                                        type === "closeobject"
                                    ) {
                                        current.section = null;
                                    } else
            
                                    // 03-EntityInstance
                                    if (
                                        (
                                            current.section === null ||
                                            current.section === "entity"
                                        ) &&
                                        (
                                            type === "key" ||
                                            type === "openobject"
                                        ) &&
                                        /^@/.test(value)
                                    ) {
                                        current.section = "entity";
                                        current.entityAlias = value.substring(1);
                                    } else
                                    if (
                                        current.section === "entity" &&
                                        current.entityAlias !== null &&
                                        (type === "openobject" || type === "key") &&
                                        /^\$/.test(value)
                                    ) {
                                        current.section = "instance";
                                        current.drains.push([config.registerEntityInstanceDeclaration(
                                            current.entityAlias,
                                            value.substring(1)
                                        ), current.drainCount]);
                                    } else

                                    // 04-ConfigInheritance
                                    if (
                                        current.section === "config" &&
                                        type === "openobject" &&
                                        value === "$"
                                    ) {
                                        current.section = "inherit";
                                    } else
                                    if (
                                        current.section === "inherit" &&
                                        type === "openarray"
                                    ) {
                                        current.section = "inherit-record";
                                    } else
                                    if (
                                        current.section === "inherit-record" &&
                                        type === "value"
                                    ) {
                                        config.registerInheritedEntityImplementation(path, value);
                                    } else
                                    if (
                                        current.section === "inherit-record" &&
                                        type === "closearray"
                                    ) {
                                        current.section = "config";
                                    } else
                                    if (
                                        current.section === "inherit-record" &&
                                        type === "openarray"
                                    ) {
                                        current.drains.push([config.registerInheritedEntityImplementation(path), current.drainCount]);
                                    } else
                                    if (
                                        current.section === "inherit" &&
                                        type === "closearray"
                                    ) {
                                        current.section = "config";
                                    } else
                                    if (
                                        (
                                            current.section === "config" ||
                                            current.section === "mapping"
                                        ) &&
                                        type === "key"
                                    ) {
                                        current.drains.push([config.registerEntityMappingDeclaration(value), current.drainCount]);
                                        current.section = "mapping";
                                    } else
                                    if (
                                        current.section === "entity" &&
                                        type === "closeobject"
                                    ) {
                                        current.section = "config";
                                    } else
                                    
                                    
                                    {

//console.log("  **** UNHANDLED TOKEN", type, value, current.section);
                                    }
            
                                    // A new drain was registered so we ensure it unhooks itself when done.
                                    // TODO: We should terminate drain instead of letting it do it itself?
                                    if (current.drains.length > 0) {
                                        var drain = current.drains[current.drains.length-1];
                                        if (drain !== drainOnStart) {
                                            drain[0].drain.assembler.once("end", function () {
                                                // Is set for the next token only so we can cleanup
                                                current.drained = true;
                                                // Removes ended drain and recovers drain count for previous drain
                                                current.drainCount = current.drains.pop()[1];
                                            });
                                        }
                                    }
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
                                        parseOptions.env(m[2])
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
                                                var selectorParts = m[2].split("/");
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
                                return resolve(config);
                            });
        
                            // pipe is supported, and it's readable/writable
                            // same chunks coming in also go out.
                            LIB.fs.createReadStream(path).pipe(stream);
            
                        } catch (err) {
                            return reject(err);
                        }
                    });
                });
            }
        
            
            var ConfigObjectAssembler = function () {
                var self = this;
                
                var config = {};
        
                var pointerHistory = [];
                var currentPointer = config;
                var currentKey = null;
        
                // TODO: Use 'jsondiffpatch' to ultimately merge configs
                //       so we should record all data events as individual patch records.
                
                var currentPath = [];
        
                self.on("key", function (key) {
                    currentKey = key;
                    currentPath.push(key);
                });
                
                self.on("value", function (value, valueMeta) {
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
                        throw new Error("Don't know how to attach value '" + value + "'");
                    }
                    currentPath.pop();
                });
        
                self.on("openobject", function (key) {
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
                });
                self.on("closeobject", function () {
                    currentPath.pop();
                    if (pointerHistory.length === 0) {
                        self.emit("end");
                        return;
                    }
                    currentPointer = pointerHistory.pop();
                });
                
                self.on("openarray", function () {
                    if (currentKey) {
                        pointerHistory.push(currentPointer);
                        currentPointer = currentPointer[currentKey] = [];
                        currentKey = null;
                    } else {
                        currentPointer = config = [];
                    }
                });
                self.on("closearray", function () {
                    if (pointerHistory.length === 0) {
                        self.emit("end");
                        return;
                    }
                    currentPointer = pointerHistory.pop();
                });
                
                self.hasEnded = function () {
                    return (pointerHistory.length === 0);
                }
                
        
                self.assemble = function (overrides) {
                    overrides = overrides || [];
        
                    var mergedConfig = {};
                    return LIB.Promise.all(overrides.map(function (override) {

                        return override.assembler.assemble().then(function (config) {
        
                            if (override.mountPath) {
                                throw new Error("'mountPath' not supported here! Use a merger at the entity instance level!");
                            } else {
                                LIB._.merge(
                                    mergedConfig,
                                    LIB._.cloneDeep(config)
                                );
                            }
                        });
                    })).then(function () {
                        LIB._.merge(
                            mergedConfig,
                            LIB._.cloneDeep(config)
                        );
                        return mergedConfig;
                    });
                };
            }
            ConfigObjectAssembler.prototype = Object.create(EVENTS.EventEmitter.prototype);
        
            
            var Config = function (path, parseOptions, callingEntities, callingArgs, depth) {
                var self = this;
        
                var entity = {
                    implementation: null,
                    inheritedImplementations: [],
                    mappings: {},
                    instances: {}
                };
                
                self.registerEntityImplementation = function (path) {
                    entity.implementation = {
                        _type: "entity-implementation",
                        assembler: new ConfigObjectAssembler(),
                        impl: loadEntityImplementation(path),
                        overrides: []
                    };
                    return {
                        _type: "entity-implementation",
                        drain: entity.implementation
                    };
                }
                
                function makeCallingArgsForInheritedConfigs (overrides) {
                    // Merge args from calling entities
                    var args = {};
                    LIB._.merge(args, LIB._.cloneDeep(overrides));
                    LIB._.merge(args, LIB._.cloneDeep(callingArgs));
                    return args;
                }

                self.registerInheritedEntityImplementation = function (baseConfigPath, path) {
                    
                    function normalizePath (path) {
                        return /^\//.test(path) ? path : LIB.path.join(baseConfigPath, "..", path)
                    }
                    
                    if (path) {
                        entity.inheritedImplementations.push({
                            impl: parseFile(
                                normalizePath(path),
                                parseOptions,
                                [].concat(callingEntities).concat(entity),
                                makeCallingArgsForInheritedConfigs(),
                                depth + 1
                            ),
                            args: {}
                        });
                    } else {
                        // We are defining a path with extra config so we need to collect
                        // config before we can parse the file and inject the config.
                        var info = {
                            _type: "inherited-entity-implementation",
                            assembler: new ConfigObjectAssembler(),
                            impl: null,
                            args: {},
                            overrides: []
                        };
                        info.assembler.emit("openarray", false);
                        info.assembler.on("end", function () {
                            info.impl = info.assembler.assemble().then(function (config) {
                                info.args = config[1];
                                return parseFile(
                                    normalizePath(config[0]),
                                    parseOptions,
                                    [].concat(callingEntities).concat(entity),
                                    makeCallingArgsForInheritedConfigs(info.args),
                                    depth + 1
                                );
                            });
                        });
                        entity.inheritedImplementations.push(info);
                        return {
                            _type: "inherited-entity-implementation",
                            drain: info
                        };
                    }
                }
        
                self.registerEntityMappingDeclaration = function (alias, path) {
//console.log("registerEntityMappingDeclaration", alias);
                    entity.mappings[alias] = {
                        _type: "entity-mapping",
                        assembler: new ConfigObjectAssembler(),
                        impl: null,
                        overrides: []
                    };
                    return {
                        _type: "entity-mapping",
                        onImplementation: function (path) {
                            entity.mappings[alias].impl = parseFile(
                                path,
                                parseOptions,
                                [].concat(callingEntities).concat(entity),
                                makeCallingArgsForInheritedConfigs(),
                                depth + 1
                            );
                        },
                        drain: entity.mappings[alias]
                    };
                }
        
                self.registerEntityInstanceDeclaration = function (entityAlias, instanceAlias) {
//console.log("registerEntityInstanceDeclaration", entityAlias, instanceAlias);
                    var drain = {
                        _type: "entity-instance-config",
                        _path: path,
                        assembler: new ConfigObjectAssembler()
                    };
                    entity.instances[instanceAlias] = {
                        _type: "entity-instance",
                        mergeLayers: function (getEntityInstance) {
        
                            function gatherLayers (entity) {
                                var layers = [];

                                entity.overrides.forEach(function (override) {
                                    if (override.configLayers) {
                                        layers = layers.concat(gatherLayers(override).map(function (layer) {
                                            layer._type = "override-config-layer";
                                            layer._path = override._path;
                                            return layer;
                                        }));
                                    }
                                    if (override.assembler) {
                                        layers.push({
                                            _type: "override-assembler",
                                            _path: override._path,
                                            assembler: override.assembler
                                        });
                                    }
                                });
        
                                layers = layers.concat(entity.configLayers.map(function (layer) {
                                    return {
                                        _type: "entity-config-layer",
                                        _path: layer._path,
                                        aspectInstanceAlias: layer.aspectInstanceAlias || null,
                                        mountPath: layer.mountPath || null,
                                        assembler: layer.assembler
                                    };
                                }));
        
                                return layers;
                            }
                            var layers = gatherLayers(entity.instances[instanceAlias]);
                            var mergedConfig = {};
//console.log("layers", layers);
                            var done = LIB.Promise.resolve();
                            layers.forEach(function (layer, layerIndex) {
                                done = done.then(function () {

                                    function mergeConfig (mergedConfig, config) {
        
                                        if (
                                            layer.mountPath &&
                                            layer.mountPath !== "."
                                        ) {
                                            var mountPathParts = layer.mountPath.split("/");
                                            var mountNode = mergedConfig;
                                            var parentMountNode = null;
                                            var parentMountKey = null;
                                            var key = null;
                                            while ( (key = mountPathParts.shift()) ) {
                                                if (!mountNode[key]) {
                                                    mountNode[key] = {};
                                                }
                                                parentMountNode = mountNode;
                                                parentMountKey = key;
                                                mountNode = mountNode[key];
                                            }
                                            if (typeof config === "string") {
                                                parentMountNode[parentMountKey] = config;
                                            } else {
                                                LIB._.merge(
                                                    mountNode,
                                                    LIB._.cloneDeep(config)
                                                );
                                            }
                                        } else {
                                            LIB._.merge(
                                                mergedConfig,
                                                LIB._.cloneDeep(config)
                                            );
                                        }
                                    }
        
                                    return layer.assembler.assemble().then(function (config) {

                                        function resolveVariables (lookupConfig, layerConfig) {

                                            function fetchVariable (config, info) {
                                                var targetString = info.value;
                                                return LIB.Promise.all(info.meta.map(function (meta) {
                                                    return LIB.Promise.try(function () {
                                                        if (meta.type === "instance-variable-selector") {
                                                            return getEntityInstance(meta.instanceAlias).then(function (instance) {
                                                                return instance.getAt(meta.selector);
                                                            });
                                                        } else
                                                        if (meta.type === "local-variable-selector") {
                                                            return LIB.traverse(config).get(
                                                                LIB.path.join(
                                                                    info.path.join("/"),
                                                                    "..",
                                                                    meta.selector.join("/")
                                                                ).split("/")
                                                            );
                                                        } else {
                                                            throw new Error("Variable type '" + info.type + "' not implemented!");
                                                        }
                                                    }).then(function (value) {
                                                        if (typeof value === "string") {
                                                            targetString = meta.replace(targetString, value);
                                                        } else {
                                                            targetString = value;
                                                        }
                                                    });
                                                })).then(function () {
                                                    return targetString;
                                                });
                                            }
        
                                            // We start resolving after having setup all promises.
                                            var startResolving = null;
                                            var done = new LIB.Promise(function (resolve, reject) {
                                                startResolving = resolve;
                                            });
                                            var resolvedLayerConfig = layerConfig;
                                            mergeConfig(lookupConfig, resolvedLayerConfig);
                                            LIB.traverse(layerConfig).forEach(function (node) {
                                                var self = this;
                                                if (typeof node === "function") {
                                                    var setPath = self.path;
        
                                                    done = done.then(function () {
                                                        return fetchVariable(lookupConfig, node());
                                                    }).then(function (value) {
                                                        LIB.traverse(resolvedLayerConfig).set(setPath, value);
                                                        mergeConfig(lookupConfig, resolvedLayerConfig);
                                                    });
                                                }
                                            });
                                            // We start resolving after having setup all promises.
                                            startResolving();
                                            return done.then(function () {
                                                return resolvedLayerConfig;
                                            });
                                        }
        
                                        return resolveVariables(
                                            LIB._.cloneDeep(mergedConfig),
                                            config
                                        ).then(function (config) {
        
                                            // Now that config is merged init the instance aspect if applicable
                                            // and merge the resulting config.
                                            if (layer.aspectInstanceAlias) {
                                                var instanceAliasParts = layer.aspectInstanceAlias.split(".");
                                                var instanceAspectMethod = instanceAliasParts.pop();
                                                var instanceAspectAlias = instanceAliasParts.join(".");
                                                var instance = entity.instances[instanceAspectAlias];
                                                if (!instance) {
                                                    callingEntities.forEach(function (callingEntity) {
                                                        if (instance) return;
                                                        instance = callingEntity.instances[instanceAspectAlias];
                                                    });
                                                }
                                                if (!instance) {
                                                    throw new Error("No declared instance found for aspect alias '" + instanceAspectAlias + "' while resolving aspect instance for entity '" + entityAlias + "' instance '" + instanceAlias + "'");
                                                }

                                                return getEntityInstance(instanceAspectAlias).then(function (instance) {
                                                    if (typeof instance.AspectInstance !== "function") {
                                                        console.error("instance", instance);
                                                        console.error("path", path);
                                                        console.error("entityAlias", entityAlias);
                                                        console.error("instanceAlias", instanceAlias);
                                                        throw new Error("Aspect instance for '" + instanceAspectAlias + "' cannot be instanciated as entity does not implement 'AspectInstance' factory method");
                                                    }
                                                    try {
                                                        return instance.AspectInstance(config).then(function (aspectInstance) {
                                                            if (typeof aspectInstance[instanceAspectMethod] !== "function") {
                                                                throw new Error("Aspect instance for '" + instanceAspectAlias + "' does not implement method '" + instanceAspectMethod + "'");
                                                            }
                                                            return LIB.Promise.try(function () {
                                                                return aspectInstance[instanceAspectMethod]();
                                                            }).then(function (aspectConfig) {
                                                                mergeConfig(mergedConfig, aspectConfig);
                                                                return;
                                                            });
                                                        });
                                                    } catch (err) {
                                                        console.error("Error while running AspectInstance for '" + instanceAspectAlias +"' while resolving aspect instance for entity '" + entityAlias + "' instance '" + instanceAlias + "'", err.stack);
                                                        throw err;
                                                    }
                                                });
                                            } else {
                                                mergeConfig(mergedConfig, config);
                                            }
                                        });
                                    });
                                });
                            });
        
                            return done.then(function () {
                                return mergedConfig;
                            });
                        },
                        configLayers: [
                            LIB._.clone(drain)
                        ],
                        drain: drain,
                        entityAlias: entityAlias,
                        overrides: []
                    };
                    return {
                        _type: "entity-instance",
                        instanceAlias: instanceAlias,
                        drain: drain
                    };
                }
        
                self.registerEntityInstanceAspectDeclaration = function (instanceAlias, aspectInstanceAlias, mountPath) {
                    var drain = {
                        _type: "entity-instance-aspect",
                        assembler: new ConfigObjectAssembler(),
                        aspectInstanceAlias: aspectInstanceAlias,
                        mountPath: mountPath
                    };
                    entity.instances[instanceAlias].configLayers.push(drain);
                    drain.assembler.once("end", function () {
                        entity.instances[instanceAlias].drain.assembler = new ConfigObjectAssembler();
                        entity.instances[instanceAlias].configLayers.push(
                            LIB._.clone(entity.instances[instanceAlias].drain)
                        );
                    });
                    return {
                        _type: "entity-instance-aspect",
                        drain: drain
                    };
                }
        
                self.flattenExtends = function (layers) {
                    var firstNode = !layers;
                    if (firstNode) {
                        layers = [];
                    }
                    return LIB.Promise.all(entity.inheritedImplementations.map(function (config) {
                        return config.impl.then(function (config) {
                            if (!config) return;
                            return config.flattenExtends(layers);
                        });
                    })).then(function () {
                        if (!firstNode) {
                            layers.push(entity);
                            return;
                        }
        
                        return LIB.Promise.all(layers.map(function (layer) {

                            function mergeImplementations () {
                                return LIB.Promise.try(function () {
                                    if (!entity.implementation) {
                                        entity.implementation = layer.implementation;
                                        return;
                                    }
                                    entity.implementation.overrides.push(layer.implementation);
                                });
                            }

                            function mergeMappings () {
                                return LIB.Promise.all(Object.keys(layer.mappings).map(function (mappingAlias) {
                                    if (!entity.mappings[mappingAlias]) {
                                        entity.mappings[mappingAlias] = layer.mappings[mappingAlias];
                                        return;
                                    }
                                    entity.mappings[mappingAlias].overrides.push(
                                        layer.mappings[mappingAlias]
                                    );
                                }));
                            }
                            
                            function mergeInstances () {
                                return LIB.Promise.all(Object.keys(layer.instances).map(function (instanceAlias) {
                                    if (!entity.instances[instanceAlias]) {
                                        entity.instances[instanceAlias] = layer.instances[instanceAlias];
                                        return;
                                    }
                                    entity.instances[instanceAlias].overrides.push(
                                        layer.instances[instanceAlias]
                                    );
                                }));
                            }
                            
                            return mergeImplementations().then(function () {
                                return mergeMappings().then(function () {
                                    return mergeInstances();
                                });
                            });
                        })).then(function  () {
                            
                            function flattenMappings () {
                                return LIB.Promise.all(Object.keys(entity.mappings).map(function (mappingAlias) {
                                    if (!entity.mappings[mappingAlias].impl) return;
                                    return entity.mappings[mappingAlias].impl.then(function (config) {

//console.log("flattenMappings", mappingAlias, config);

                                        return config.flattenExtends();
                                    });
                                }));
                            }

                            return flattenMappings().then(function () {

                                return entity;
                            });
                        });
                    });
                }
        
                self.assemble = function (requestingEntity, overrides, context) {
                    var config = {};

//console.log("ASSEMBLE ("+ path +") overrides", overrides);
//console.log("ASSEMBLE ("+ path +") entity", entity);

                    function instanciateEntityImplementation () {
                        if (!entity.implementation) {
                            var Entity = function (instanceConfig) {
                            }
                            Entity._noImpl = true;
                            Entity.prototype.getInstance = function (instanceAlias) {
                                if (!this["@instances"][instanceAlias]) {
                                    throw new Error("Instance with alias '" + instanceAlias + "' not registered!");
                                }
                                return this["@instances"][instanceAlias];
                            }
                            return LIB.Promise.resolve(Entity);
                        }
                        return entity.implementation.assembler.assemble().then(function (config) {
        
                            return entity.implementation.impl.then(function (exports) {
                                var defaultConfig = LIB._.cloneDeep(config);
                                LIB._.assign(defaultConfig, overrides || {});
                                return exports.forConfig(defaultConfig);
                            });
                        });
                    }
        
                    function instanciateEntityMappings () {

//console.log("instanciateEntityMappings", depth);
                        return LIB.Promise.all(Object.keys(entity.mappings).map(function (alias) {

                            return entity.mappings[alias].assembler.assemble(
                                entity.mappings[alias].overrides.map(function (override) {
                                    return {
                                        assembler: override.assembler
                                    };
                                })
                            ).then(function (configOverrides) {
        
                                function getImpls () {
                                    var impls = [];
                                    if (entity.mappings[alias].impl) {
                                        impls.push(entity.mappings[alias].impl);
                                    }
//console.log(alias, "ORIGINAL IMPL", impl);
                                    entity.mappings[alias].overrides.forEach(function (override) {
                                        if (override.impl) {
//                                            if (impl) {
                                                // TODO: Implement object inheritance if there are more
                                                //       than one implementation.
//                                                console.error("configOverrides", configOverrides);
// NOTE: We assume the implementations are the same.
// TODO: Verify that the implementations are the same.
//                                                throw new Error("NYI: Multiple entity implementations (requested for entityAlias: " + alias + ")");
//                                            }
                                            impls.push(override.impl);
//console.log(alias, "OVERRIDDEN IMPL", impl);
                                        }
                                    });
                                    return impls;
                                }
                                
                                
                                function setEntityMapping (alias, config) {
//console.log("setEntityMapping", alias, config, path, depth, configOverrides);                                        

                                    if (entityMappings[alias]) {

//console.log("entityMappings[alias]", entityMappings[alias]);                                        
                                    } else {
//console.log("entityMappings[alias]", alias, entityMappings[alias]);                                        
                                        entityMappings[alias] = LIB.Promise.defer();
                                        entityMappings[alias].resolve(config);
                                    }
                                }

                                var impls = getImpls();
                                if (impls.length > 0) {
                                    return LIB.Promise.all(impls.map(function (impl) {

                                        return impl.then(function (config) {


                                            return config.assemble(entity, configOverrides, {
                                                entityAlias: alias
                                            }).then(function (config) {

                                                if (config._noImpl) return;
//console.log("config", alias, config);

                                                setEntityMapping(alias, config);
                                            });
                                        });
                                    }));
                                } else {

                                    function makeDefaultEntity (defaultConfig) {
                                        var Entity = function (instanceConfig) {
                                            var self = this;
                                            self.toString = function () {
                                                var obj = {};
                                                LIB._.merge(obj, LIB._.cloneDeep(self.__proto__));
                                                LIB._.merge(obj, LIB._.cloneDeep({
                                                    config: instanceConfig
                                                }));
                                                return obj;
                                            }
                                        }
                                        Entity._noImpl = true;
                                        Entity.prototype.config = defaultConfig;
                                        return Entity;
                                    }

                                    setEntityMapping(alias, makeDefaultEntity(configOverrides));
//                                    setEntityMapping(alias, function () {});
                                }
                            });
                        })).then(function () {
//console.log("mappings", depth, entityMappings);
                            return entityMappings;
                        });
                    }
                    
                    function instanciateEntityInstances () {

                        var instances = {};
                        var instancesByEntity = {};

                        var instancePromises = {};
        
                        return LIB.Promise.all(Object.keys(entity.instances).map(function (alias) {
                            
                            var entityAlias = entity.instances[alias].entityAlias;

                            if (!instancesByEntity[entityAlias]) {
                                instancesByEntity[entityAlias] = {
                                    order: [],
                                    instances: {}
                                };
                            }
                            instancesByEntity[entityAlias].order.push(alias);

                            var getEntityInstance = function (instanceAlias) {
                                if (!instancePromises[instanceAlias]) {
                                    throw new Error("Instance for alias '" + instanceAlias + "' not yet registered. You must declare it before using it as an instance aspect!");
                                }
                                return instancePromises[instanceAlias];
                            }

                            return instancePromises[alias] = entity.instances[alias].mergeLayers(getEntityInstance).then(function (configOverrides) {

                                return getEntityMappingForAlias(entityAlias).timeout(1000).catch(LIB.Promise.TimeoutError, function (err) {

                                    console.error("Got timeout while getEntityMappingForAlias('" + entityAlias + "') for instance '" + alias + "'");

//console.log("path", path);

                                    throw err;
                                }).then(function (entityClass) {

//console.log("mappings", depth, entityAlias, entityClass);

                                    if (!entityClass) {
                                        throw new Error("Entity '" + entity.instances[alias].entityAlias + "' used for instance '" + alias + "' not mapped!");
                                    }
    
                                    entityClass.prototype["@instances"] = instancesByEntity[entityAlias].instances;
                                    entityClass.prototype["@instances.order"] = instancesByEntity[entityAlias].order;
    
                                    configOverrides["$alias"] = alias;
    
                                    var instance = new entityClass(configOverrides);
                                    
                                    function finalize (instance) {
                                        instances[alias] = instance;
                                        instancesByEntity[entityAlias].instances[alias] = instance;
                                        return instance;
                                    }
    
                                    if (typeof instance.then === "function") {
                                        return instance.then(function (instance) {
                                            return finalize(instance);
                                        });
                                    }
                                    return finalize(instance);
                                });
                            });
                        })).then(function () {
                            return instances;
                        });
                    }
        
                    return instanciateEntityImplementation().then(function (impl) {
        
                        return instanciateEntityMappings().then(function (mappings) {

                            if (Object.keys(mappings).length) {
                                impl.prototype["@entities"] = mappings;
                            }

//console.log("requestingEntity", requestingEntity);

                            return instanciateEntityInstances().then(function (instances) {
                                if (Object.keys(instances).length > 0) {
                                    impl.prototype["@instances"] = instances;
                                }

                                return null;
                            });
                        }).then(function () {

                            return impl;
                        });
                    });
                }
            }

            return parseFile(path, options || {}).then(function (config) {

                return config.flattenExtends().then(function () {

                    return config.assemble();
                });
            });
        }
    }
    
    return CCJSON;
}
