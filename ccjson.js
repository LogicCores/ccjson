
require("require.async")(require);

const TRAVERSE = require("traverse");

exports.makeLib = function () {
    var api = {
        path: require("path"),
        fs: require("fs"),
        Promise: require("bluebird"),
        _: require("lodash"),
        traverse: TRAVERSE,
        EventEmitter: require("eventemitter2").EventEmitter2,
        ccjson: exports,
        CJSON: {
            stringify: require("canonical-json")
        }
    };
    api.Promise.promisifyAll(api.fs);
    return api;
}


exports.forLib = function (LIB) {

    const PARSER = require("./parser").forLib(LIB);

    const EVENTS = require("events");
    const ESCAPE_REGEXP = require("escape-regexp-component");
    

    const VERBOSE = false;
    

    function defer () {
        var deferred = {};
        deferred.promise = new LIB.Promise(function (resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    }

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

/*
        var entityMappings = {};
        function getEntityMappingForAlias (alias) {
            if (!entityMappings[alias]) {
                entityMappings[alias] = LIB.Promise.defer();
            }
            return entityMappings[alias].promise;
        }
*/

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

            var Entity = function () {
                var self = this;

                self.implementation = LIB.Promise.resolve(null);
                
                self.waitForImplementation = function () {
                    if (
                        self.implementation &&
                        typeof self.implementation.then === "function"
                    ) {
                        // Wait for the implementation to be loaded.
                        return self.implementation.then(function (implementation) {
                            self.implementation = implementation;
                            return null; 
                        });
                    }
                    return LIB.Promise.resolve();
                }

                self.entityAlias = null;
                self.instanceAlias = null;

                self.configLayers = [];

                self.declarations = {
                    inherited: [],
                    mappings: {},
                    instances: {}
                };

                self.mappings = {};
                self.instances = {
                    byAlias: {},
                    byEntity: {}
                };

                self.parsed = defer();

                self.getMergedConfigLayers = function (overrides) {
                    var config = {};
                    self.configLayers.forEach(function (configLayer) {
                        LIB._.merge(config, LIB._.cloneDeep(configLayer[0]));
                    });
                    LIB._.merge(config, LIB._.cloneDeep(overrides || {}));
                    return config;
                }
            }
            Entity.prototype.parse = function (path, options, callingArgs, depth) {
                var self = this;

//console.log("PARSE FILE", path, "WITH CALLING ARGS", callingArgs);
                
                depth = depth || 0;


                function getMapping (entityAlias, setParsedIfNew) {
                    if (!self.declarations.mappings[entityAlias]) {
                        self.declarations.mappings[entityAlias] = new Entity();
                        self.declarations.mappings[entityAlias].entityAlias = entityAlias;
                        if (setParsedIfNew) {
                            self.declarations.mappings[entityAlias].parsed.resolve();
                        }
                    };
                    return self.declarations.mappings[entityAlias];
                }

                function getInstance (entityAlias, instanceAlias) {
                    if (!self.declarations.instances[instanceAlias]) {
                        self.declarations.instances[instanceAlias] = new Entity();
                        self.declarations.instances[instanceAlias].entityAlias = entityAlias;
                        self.declarations.instances[instanceAlias].instanceAlias = instanceAlias;
                    };
                    return self.declarations.instances[instanceAlias];
                }


                var parser = new PARSER(path, options, callingArgs, depth);

                parser.on("EntityImplementation", function (info) {
                    if (VERBOSE) console.log("EVENT: EntityImplementation (registerEntityImplementation):", info);

                    // TODO: Support multiple implementations that get merged
                    self.implementation = loadEntityImplementation(
                        LIB.path.resolve(LIB.path.dirname(path), info.path)
                    );
                });

                parser.on("EntityConfig", function (info) {
                    if (VERBOSE) console.log("EVENT: EntityConfig:", info);

                    self.configLayers.push([
                        {
                            config: info.config
                        },
                        path
                    ]);
                });

                parser.on("MappedEntityPointer", function (info) {
                    if (VERBOSE) console.log("EVENT: MappedEntityPointer:", info);

                    // NOTE: We do not need to wait for this promise as we wait
                    //       after parsing our entity for all mappings to finish parsing.
                    getMapping(info.entityAlias).parse(
                        LIB.path.resolve(LIB.path.dirname(path), info.path),
                        options,
                        callingArgs,
                        depth + 1
                    );
                });

                parser.on("MappedEntityConfig", function (info) {
                    if (VERBOSE) console.log("EVENT: MappedEntityConfig:", info);

                    getMapping(info.entityAlias, true).configLayers.push([
                        {
                            config: info.config
                        },
                        path
                    ]);
                });

                parser.on("MappedEntityInstance", function (info) {
                    if (VERBOSE) console.log("EVENT: MappedEntityInstance:", info);

                    getInstance(info.entityAlias, info.instanceAlias).configLayers.push([
                        {
                            config: info.config
                        },
                        path
                    ]);
                });                

                parser.on("InheritEntity", function (info) {
                    if (VERBOSE) console.log("EVENT: InheritEntity:", info);

                    var inheritEntity = new Entity();

                    self.declarations.inherited.push(inheritEntity);

                    var args = LIB._.clone(info.config || {});
                    LIB._.merge(args, callingArgs);

                    inheritEntity.parse(
                        LIB.path.resolve(LIB.path.dirname(path), info.path),
                        options,
                        args,
                        depth + 1
                    );
                });

                parser.on("MappedEntityInstanceAspect", function (info) {
                    if (VERBOSE) console.log("EVENT: MappedEntityInstanceAspect:", info);

                    var m = info.aspectPointer.match(/^\$(.+)\(\)->(.+)$/);
                    if (!m) {
                        throw new Error("Error parsing instance aspect pointer '" + info.aspectPointer + "'!");
                    }
                    getInstance(info.entityAlias, info.instanceAlias).configLayers.push([
                        {
                            config: info.config,
                            entityAlias: info.entityAlias,
                            aspectPointer: info.aspectPointer,
                            aspectInstanceAlias: m[1],
                            mountPath: m[2]
                        },
                        path
                    ]);
                });

                return parser.parse().then(function () {
    
//console.log("all parsed for entity:", path);

                    return self.waitForImplementation();
                    
                }).then(function () {

                    // Wait for all mappings to be parsed.
                    return LIB.Promise.all(Object.keys(self.declarations.mappings).map(function (alias) {
                        return self.declarations.mappings[alias].parsed.promise.timeout(10 * 1000).catch(LIB.Promise.TimeoutError, function (err) {
                            console.error("Parsing of mapping '" + alias + "' from file '" + path + "' did not complete in time!");
                            throw err;
                        }).then(function () {
                            return self.declarations.mappings[alias].waitForImplementation();
                        });
                    })).then(function () {

                        // Wait for all instances.
                        return LIB.Promise.all(Object.keys(self.declarations.instances).map(function (alias) {
                            return self.declarations.instances[alias].waitForImplementation();
                        })).then(function () {

                            // Wait for all inherited implementations to be parsed.
                            return LIB.Promise.all(self.declarations.inherited.map(function (entity) {
                                return entity.parsed.promise.then(function () {
                                    return entity.waitForImplementation();
                                });
                            })).then(function () {

                                // Indicate that we are all done with parsing.
                                self.parsed.resolve();
                                return null;
                            });
                        });
                    });
                });
            }

            Entity.prototype.instanciateTree = function (overrides) {
                var self = this;
                
                function mergeConfigLayers (configLayers) {
                    var mergedConfig = {};
                    configLayers.forEach(function (configLayer) {
                        LIB._.merge(mergedConfig, LIB._.clone(configLayer[0].config));
                    });
                    return mergedConfig;
                }

                function instanciateForEntity (entity) {

                    function getImplementation () {
                        if (entity.implementation) {
                            return entity.implementation;
                        }
                        return {
                            forConfig: function (defaultConfig) {
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
                                Entity.prototype.getInstance = function (instanceAlias) {
                                    if (!this["@instances"][instanceAlias]) {
                                        throw new Error("Instance with alias '" + instanceAlias + "' not registered!");
                                    }
                                    return this["@instances"][instanceAlias];
                                }
                                Entity.prototype.config = defaultConfig;
                                return Entity;
                            }
                        };
                    }

                    return LIB.Promise.try(function () {
                        return getImplementation().forConfig(entity.config);
                    });
                }

                function instanciateEntityImplementation (overrides) {
//console.log("instanciateEntityImplementation()");

                    var config = mergeConfigLayers(self.configLayers);

                    return instanciateForEntity({
                        implementation: self.implementation,
                        config: config
                    });
                }

                function instanciateEntityMappings () {

//console.log("instanciateEntityMappings()");

                    var mappings = {};
                    function forNode (entity, inMapping) {

//console.log("forNode", entity);

                        entity.declarations.inherited.forEach(function (inheritedEntity) {
                            forNode(inheritedEntity, inMapping);
                        });
                        
                        function addMapping (alias, entity) {
                            if (!mappings[alias]) {
                                mappings[alias] = {
                                    implementation: entity.implementation,
                                    config: []
                                };
                            } else {
                                // TODO: Create prototype chain for inherited implementations.
                                if (entity.implementation) {
                                    mappings[alias].implementation = entity.implementation;
                                }
                            }
                            mappings[alias].config = mappings[alias].config.concat(alias, entity.configLayers);
                        }
                        Object.keys(entity.declarations.mappings).forEach(function (alias) {
                            var declaredMapping = entity.declarations.mappings[alias];

                            forNode(declaredMapping, alias);
                            
                            addMapping(alias, declaredMapping);
                        });
                        if (inMapping) {
                            addMapping(inMapping, entity);
                        }
                    }
                    forNode(self);

                    return LIB.Promise.all(Object.keys(mappings).map(function (alias) {
                        if (self.mappings[alias]) {
                            throw new Error("Mapping for alias '" + alias + "' already declared!");
                        }

                        mappings[alias].config = mergeConfigLayers(mappings[alias].config);

                        return instanciateForEntity(mappings[alias]).then(function (impl) {
                            self.mappings[alias] = impl;
                            return null;
                        });
                    })).then(function () {
                        return self.mappings;
                    });
                }

                function instanciateEntityInstances () {

//console.log("instanciateEntityInstances()");

                    var instances = {};

                    function mergeConfig (mergedConfig, config) {
                        
//console.log("mergeCOnfig()", mergedConfig, config);

                        if (
                            config.mountPath &&
                            config.mountPath !== "."
                        ) {
                            var mountPathParts = config.mountPath.split("/");
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
                            if (typeof config.config === "string") {
                                parentMountNode[parentMountKey] = config.config;
                            } else {
                                LIB._.merge(
                                    mountNode,
                                    LIB._.cloneDeep(config.config)
                                );
                            }
                        } else {
                            LIB._.merge(
                                mergedConfig,
                                LIB._.cloneDeep(config.config)
                            );
                        }
                    }

                    function gatherInstances (entity) {
                        entity.declarations.inherited.forEach(function (inheritedEntity) {
                            gatherInstances(inheritedEntity);
                        });
                        Object.keys(entity.declarations.instances).forEach(function (alias) {
                            var declaredInstance = entity.declarations.instances[alias];
                            if (!instances[alias]) {
                                instances[alias] = {
                                    implementation: declaredInstance.implementation,
                                    config: [],
                                    entityAlias: declaredInstance.entityAlias
                                };
                            } else {
                                // TODO: Create prototype chain for inherited implementations.
                                if (declaredInstance.implementation) {
                                    instances[alias].implementation = declaredInstance.implementation;
                                }
                            }
                            instances[alias].config = instances[alias].config.concat(declaredInstance.configLayers);
                        });
                    }
                    gatherInstances(self);

                    function getInstanceDeferred (instanceAlias) {
                        if (!self.instances.byAlias[instanceAlias]) {
                            self.instances.byAlias[instanceAlias] = defer();
                        }
                        return self.instances.byAlias[instanceAlias];
                    }


//console.log("instances", instances);


                    function resolveInstanceDeclaration (instanceAlias) {
                        
                        function fetchVariable (config, info) {

//console.log("fetchVariable()", config, info);
    
                            var targetString = info.value;
                            return LIB.Promise.all(info.meta.map(function (meta) {
                                return LIB.Promise.try(function () {
                                    if (meta.type === "instance-variable-selector") {
                                        return getInstanceDeferred(meta.instanceAlias).promise.timeout(5000).catch(LIB.Promise.TimeoutError, function (err) {
                                            console.error("Timeout waiting for instance '" + meta.instanceAlias + "' while resolving instance '" + instanceAlias + "'!");
                                            throw err;
                                        }).then(function (instance) {
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
                        
                        function resolveInstanceAspect (info) {

                            if (!info.aspectInstanceAlias) {
                                return LIB.Promise.resolve(info);
                            }

//console.log("resolveInstanceAspects()", info);                            

                            var instanceAliasParts = info.aspectInstanceAlias.split(".");
                            var instanceAspectMethod = instanceAliasParts.pop();
                            var instanceAspectAlias = instanceAliasParts.join(".");

                            return getInstanceDeferred(instanceAspectAlias).promise.then(function (instance) {

//console.log("GOT ASPECT INSTANCE", instance);

                                if (typeof instance.AspectInstance !== "function") {
                                    console.error("instance", instance);
                                    console.error("path", path);
                                    console.error("entityAlias", info.entityAlias);
                                    console.error("instanceAlias", instanceAlias);
                                    throw new Error("Aspect instance for '" + instanceAspectAlias + "' cannot be instanciated as entity does not implement 'AspectInstance' factory method");
                                }
                                try {

//console.log("init aspect", info.config);
                                    return instance.AspectInstance(info.config).then(function (aspectInstance) {
                                        if (typeof aspectInstance[instanceAspectMethod] !== "function") {
                                            throw new Error("Aspect instance for '" + instanceAspectAlias + "' does not implement method '" + instanceAspectMethod + "'");
                                        }
                                        return LIB.Promise.try(function () {
                                            return aspectInstance[instanceAspectMethod]();
                                        }).then(function (aspectConfig) {

                                            info.config = aspectConfig;
//                                            mergeConfig(mergedConfig, aspectConfig);
                                            return null;
                                        });
                                    });
                                } catch (err) {
                                    console.error("Error while running AspectInstance for '" + instanceAspectAlias +"' while resolving aspect instance for entity '" + info.entityAlias + "' instance '" + instanceAlias + "'", err.stack);
                                    throw err;
                                }
                            }).then(function () {
                                return info;
                            });
                        }

                        var instanceDeclarationEntity = instances[instanceAlias];

//console.log("instanceDeclarationEntity BEFORE", JSON.stringify(instanceDeclarationEntity, null, 4));
                        
                        var mergedConfig = {};
                        return LIB.Promise.mapSeries(instanceDeclarationEntity.config, function (layerConfig) {
                            
//console.log("layerConfig 1", layerConfig[0]);

                            return resolveInstanceAspect(layerConfig[0]).then(function (resolvedLayerConfig) {
                                
//console.log("layerConfig 2", resolvedLayerConfig);
    
                                // We start resolving after having setup all promises.
                                var startResolving = null;
                                var done = new LIB.Promise(function (resolve, reject) {
                                    startResolving = resolve;
                                });
                                mergeConfig(mergedConfig, resolvedLayerConfig);
                                LIB.traverse(resolvedLayerConfig.config).forEach(function (node) {
                                    var self = this;
                                    if (typeof node === "function") {
                                        var setPath = self.path;
        
                                        done = done.then(function () {
                                            return fetchVariable(mergedConfig, node());
                                        }).then(function (value) {
/*    
    console.log("FETCHED VALUE", value);
    console.log("FETCHED VALUE setPath", setPath);
    console.log("FETCHED VALUE resolvedLayerConfig", resolvedLayerConfig);
*/    

    //process.exit(1);
                                            LIB.traverse(resolvedLayerConfig.config).set(setPath, value);
                                            mergeConfig(mergedConfig, resolvedLayerConfig);
                                        });
                                    }
                                });
                                // We start resolving after having setup all promises.
                                startResolving();
                                return done.then(function () {
                                    return resolvedLayerConfig;
                                });
                            });
                        }).then(function () {

                            instanceDeclarationEntity.config = mergedConfig;

//console.log("instanceDeclarationEntity AFTER", instanceDeclarationEntity);
//process.exit(1);
                            return instanceDeclarationEntity;
                        });
                    }

                    return LIB.Promise.all(Object.keys(instances).map(function (instanceAlias) {
                        
                        var instanceDeclarationEntity = instances[instanceAlias];
                        var entityAlias = instanceDeclarationEntity.entityAlias;


                        if (!self.instances.byEntity[entityAlias]) {
                            self.instances.byEntity[entityAlias] = {
                                order: [],
                                instances: {}
                            };
                        }
                        self.instances.byEntity[instanceDeclarationEntity.entityAlias].order.push(instanceAlias);


                        return resolveInstanceDeclaration(instanceAlias).then(function (instanceDeclarationEntity) {

                            if (
                                self.instances.byAlias[instanceAlias] &&
                                !self.instances.byAlias[instanceAlias].promise.isPending()
                            ) {
                                throw new Error("Instance for alias '" + instanceAlias + "' already declared!");
                            }
    
//    console.log("instanceDeclarationEntity", instanceDeclarationEntity);


                            var configOverrides = instanceDeclarationEntity.config;
    
//    console.log("configOverrides!!!!", JSON.stringify(configOverrides, null, 4));
//process.exit(1);    
    
                            var mappedEntity = self.mappings[entityAlias];
    
    //console.log("mappedEntity", entityAlias, mappedEntity);
    
    
                            if (!mappedEntity) {
                                console.log("self.mappings", Object.keys(self.mappings));
                                throw new Error("Entity '" + entityAlias + "' used for instance '" + instanceAlias + "' not mapped!");
                            }
    
                            mappedEntity.prototype["@instances"] = self.instances.byEntity[entityAlias].instances;
                            mappedEntity.prototype["@instances.order"] = self.instances.byEntity[entityAlias].order;
    
                            configOverrides["$alias"] = instanceAlias;
    
                            return LIB.Promise.try(function () {
                                return new mappedEntity(configOverrides);
                            }).then(function (instance) {

                                self.instances.byEntity[entityAlias].instances[instanceAlias] = instance;

                                return getInstanceDeferred(instanceAlias).resolve(instance);
                            });
                        });

                    })).then(function () {

//console.log("all instances deferred");
//process.exit(1);

                        // Remove all deferreds.
                        return LIB.Promise.all(Object.keys(self.instances.byAlias).map(function (alias) {
                            return self.instances.byAlias[alias].promise.then(function (instance) {
                                self.instances.byAlias[alias] = instance;
                                return null;
                            });
                        })).then(function() {
                            return self.instances.byAlias;
                        });
                    });
                }


                return instanciateEntityImplementation(
                    overrides || {}
                ).then(function (impl) {

                    return instanciateEntityMappings().then(function (mappings) {

                        if (Object.keys(mappings).length) {
                            impl.prototype["@entities"] = mappings;
                        }

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
            
            
            var entity = new Entity();
            
            return entity.parse(path, options).then(function () {

//console.log("done parsing root entity!", entity);

                return entity.instanciateTree().then(function (impl) {

//console.log("done instanciating root entity!", impl);

                    ccjson.emit("booted");

                    return impl;
                });
            });
        }
    }
    CCJSON.prototype = Object.create(LIB.EventEmitter.prototype);

    return CCJSON;
}
