
require("require.async")(require);


exports.makeLib = function () {
    return {
        path: require("path"),
        fs: require("fs"),
        Promise: require("bluebird"),
        _: require("lodash")
    }    
}

exports.forLib = function (LIB) {

    return LIB.Promise.try(function () {

        const CLARINET = require("clarinet");
        const EVENTS = require("events");


        function parseFile (path) {
            
//console.log("\n\n---------------------------------------------------");
//console.log("PARSE CJSON FILE:", path);
//console.log("---------------------------------------------------");

            return new LIB.Promise(function (resolve, reject) {
                
                try {

                    var config = new Config(path);

                    var stream = CLARINET.createStream({});
    
                    stream.on("error", function (e) {
                        // unhandled errors will throw, since this is a proper node
                        // event emitter.
                        console.error("error!", e)
                        // clear the error
                        this._parser.error = null
//                        this._parser.resume()
                    });
                    
                    
                    var state = {
                        objectPath: [],
                        onObjectClose: {},

                        activeEntityImplementation: false,

                        activeInheritedImplementations: false,

                        activeEntityMapping: false,
                        activeEntityMappingHasImplementation: false,

                        activeEntityAlias: null,
                        activeInstanceAlias: null,
                        activeEntityInstance: false
                    };
                    
                    
                    var current = {
                        section: null,
                        drain: null,
                        drainCount: 0,
                        drained: false,
                        entityAlias: null,
                        captureImplementation: false
                    };

                    function nextToken (type, value) {

                        if (current.drain) {
//console.log("  ... draining token", type, value);


                            // 02-EntityMapping
                            if (
                                current.drainCount === 0 &&
                                type === "openobject" &&
                                typeof current.drain.onImplementation === "function" &&
                                value === "$"
                            ) {
                                current.captureImplementation = true
                            } else
                            if (
                                current.drainCount === 0 &&
                                type === "value" &&
                                typeof current.drain.onImplementation === "function" &&
                                current.captureImplementation === true
                            ) {
                                current.drain.onImplementation(
                                    LIB.path.join(path, "..", value)
                                );
                                current.captureImplementation = false;
                            } else

                            {
                                current.drainCount += 1;
                                current.drain.drain.emit(type, value);
                            }
                            return ;
                        }

//console.log("NEXT TOKEN", type, value);

                        if (current.drained) {
                            current.drained = false;

                            // 02-EntityMapping
                            if (
                                current.section === "mapping" &&
                                type === "closeobject"
                            ) {
                                current.section = null;
                                return;
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
                            }
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
                            current.drain = config.registerEntityImplementation(
                                LIB.path.join(path, "..", value)
                            );
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
                            current.drain = config.registerEntityMappingDeclaration(value);
                            current.section = "mapping";
                        } else

                        // 03-EntityInstance
                        if (
                            current.section === null &&
                            type === "key" &&
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
                            current.drain = config.registerEntityInstanceDeclaration(
                                current.entityAlias,
                                value.substring(1)
                            );
//                            current.drain.drain.activeEntityInstance.emit("key", key);
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
                            // Ignore
                        } else
                        if (
                            current.section === "inherit" &&
                            type === "value"
                        ) {
                            config.registerInheritedEntityImplementation(
                                LIB.path.join(path, "..", value)
                            );
                        } else
                        if (
                            current.section === "inherit" &&
                            type === "closearray"
                        ) {
                            current.section = "config";
                        } else
                        if (
                            current.section === "config" &&
                            type === "key"
                        ) {
                            current.drain = config.registerEntityMappingDeclaration(value);
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
                        if (current.drain) {
                            current.drain.drain.once("end", function () {
                                // Is set for the next token only so we can cleanup
                                current.drained = true;
                                current.drain = null;
                                current.drainCount = 0;
                            });
                        }
                    }

                    stream.on("openobject", function (key) {
                        nextToken("openobject", key);
                    });
                    stream.on("key", function (key) {
                        nextToken("key", key);
                    });
                    stream.on("value", function (value) {
                        nextToken("value", value);
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
        }

        
        var exports = {};

        var ConfigObjectAssembler = function () {
            var self = this;
            
            var config = {};

            var pointerHistory = [];
            var currentPointer = config;
            var currentKey = null;

            self.on("key", function (key) {
                currentKey = key;
            });
            
            self.on("value", function (value) {
                if (currentKey) {
                    currentPointer[currentKey] = value;
                } else
                if (Array.isArray(currentPointer)) {
                    currentPointer.push(value);
                } else {
                    throw new Error("Don't know how to attach value '" + value + "'");
                }
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
//                    currentPointer = currentPointer[key] = {};


//                    console.error("currentKey", currentKey);
//                    console.error("currentPointer", currentPointer);
//                    throw new Error("Don't know how to attach object '" + key + "'");
                }
            });
            self.on("closeobject", function () {
                if (pointerHistory.length === 0) {
                    self.emit("end");
                    return;
                }
                currentPointer = pointerHistory.pop();
            });
            
            self.on("openarray", function () {
                pointerHistory.push(currentPointer);
                currentPointer = currentPointer[currentKey] = [];
                currentKey = null;
            });
            self.on("closearray", function () {
                if (pointerHistory.length === 0) {
                    self.emit("end");
                    return;
                }
                currentPointer = pointerHistory.pop();
            });
            


            self.assemble = function (overrides) {
                overrides = overrides || [];
                var mergedConfig = {};
                mergedConfig = LIB._.merge(mergedConfig, config);
                return LIB.Promise.all(overrides.map(function (override) {
                    return override.assemble().then(function (config) {
                        // TODO: Implement merging that respects promises.
                        mergedConfig = LIB._.merge(config, mergedConfig);
                    });
                })).then(function () {
                    return mergedConfig;
                });
            };
        }
        ConfigObjectAssembler.prototype = Object.create(EVENTS.EventEmitter.prototype);

        
        var Config = function (path) {
            var self = this;

            var entity = {
                implementation: null,
                inheritedImplementations: [],
                mappings: {},
                instances: {}
            }

            self.registerEntityImplementation = function (path) {
                entity.implementation = {
                    _type: "entity-implementation",
                    assembler: new ConfigObjectAssembler(),
                    impl: new LIB.Promise(function (resolve, reject) {
                        // We load code right away but don't instanciate until later
                        return require.async(path, resolve, reject);
                    })
                };
                return {
                    drain: entity.implementation.assembler
                };
            }

            self.registerInheritedEntityImplementation = function (path) {
                entity.inheritedImplementations.push({
                    impl: parseFile(path)
                });
            }

            self.registerEntityMappingDeclaration = function (alias, path) {
                entity.mappings[alias] = {
                    _type: "entity-mapping",
                    assembler: new ConfigObjectAssembler(),
                    impl: null,
                    overrides: []
                };
                return {
                    onImplementation: function (path) {
                        entity.mappings[alias].impl = parseFile(path);
                    },
                    drain: entity.mappings[alias].assembler
                };
            }

            self.registerEntityInstanceDeclaration = function (entityAlias, instanceAlias) {
                entity.instances[instanceAlias] = {
                    _type: "entity-instance",
                    assembler: new ConfigObjectAssembler(),
                    entityAlias: entityAlias,
                    overrides: []
                };
                return {
                    drain: entity.instances[instanceAlias].assembler
                };
            }

            self.flattenExtends = function (layers) {
                var firstNode = !layers;
                if (firstNode) {
                    layers = [];
                }
                return LIB.Promise.all(entity.inheritedImplementations.map(function (config) {
                    return config.impl.then(function (config) {
                        return config.flattenExtends(layers);
                    });
                })).then(function () {
                    if (!firstNode) {
                        layers.push(entity);
                        return;
                    }

                    return LIB.Promise.all(layers.map(function (layer) {
                        
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
                        
                        return mergeMappings().then(function () {
                            return mergeInstances();
                        });
                    })).then(function  () {
                        return entity;
                    });
                });
            }

            self.assemble = function (requestingEntity, overrides) {
                var config = {};

//console.log("ASSEMBLE ("+ path +") overrides", overrides);
//console.log("ASSEMBLE ("+ path +") entity", entity);

                function instanciateEntityImplementation () {
                    if (!entity.implementation) {
                        var Entity = function (instanceConfig) {
                        }
                        return LIB.Promise.resolve(Entity);
                    }
                    return entity.implementation.assembler.assemble().then(function (config) {

                        return entity.implementation.impl.then(function (factory) {
                            
                            return factory.forLib(LIB).then(function (exports) {

                                LIB._.assign(config, overrides || {});

                                return exports.forConfig(config);
                            });
                        });
                    });
                }

                function instanciateEntityMappings () {
                    var mappings = {};

                    return LIB.Promise.all(Object.keys(entity.mappings).map(function (alias) {

                        return entity.mappings[alias].assembler.assemble(
                            entity.mappings[alias].overrides.map(function (override) {
                                return override.assembler;
                            })
                        ).then(function (configOverrides) {

                            function getImpl () {
                                var impl = entity.mappings[alias].impl;
                                entity.mappings[alias].overrides.forEach(function (override) {
                                    if (override.impl) {
                                        if (impl) {
                                            // TODO: Implement object inheritance if there are more
                                            //       than one implementation.
                                            throw new Error("NYI: Multiple entity implementations");
                                        }
                                        impl = override.impl;
                                    }
                                });
                                return impl;
                            }
                            
                            
                            var impl = getImpl();
                            if (impl) {
                                return impl.then(function (config) {

                                    return config.assemble(entity, configOverrides).then(function (config) {
                                        mappings[alias] = config;
                                    });
                                });
                            } else {
                                mappings[alias] = configOverrides;
                            }
                        });
                    })).then(function () {

                        return mappings;
                    });
                }
                
                function instanciateEntityInstances (mappings) {
                    var instances = {};

                    return LIB.Promise.all(Object.keys(entity.instances).map(function (alias) {

                        return entity.instances[alias].assembler.assemble(
                            entity.instances[alias].overrides.map(function (override) {
                                return override.assembler;
                            })
                        ).then(function (configOverrides) {

                            var entityClass = mappings[entity.instances[alias].entityAlias];
                            if (!entityClass) {
                                throw new Error("Entity '" + entity.instances[alias].entityAlias + "' used for instance '" + alias + "' not mapped!");
                            }

/*
                            var instance = Object.create({
                                "$impl": impl
                            });
                            LIB._.assign(instance, entityConfig)
                            instances[instanceAlias] = instance;
*/

                            instances[alias] = new entityClass(configOverrides);
                        });
                    })).then(function () {
                        return instances;
                    });
                }

                return instanciateEntityImplementation().then(function (impl) {

                    return instanciateEntityMappings().then(function (mappings) {

//console.log("GOT MAPPINGS", mappings);

                        if (Object.keys(mappings).length) {
                            impl.prototype["@entities"] = mappings;
                        }
                        return instanciateEntityInstances(impl.prototype["@entities"] || {}).then(function (instances) {
                            if (Object.keys(instances).length > 0) {
                                impl.prototype["@instances"] = instances;
                            }

//console.log("FINAL IMPL", impl.prototype);

                            return impl;
                        });
                    });
                });
            }
        }


        exports.parseFile = function (path) {

            return parseFile(path).then(function (config) {

                return config.flattenExtends().then(function () {

                    return config.assemble();
                });
            });
        }
    
        return exports;
    });
}
