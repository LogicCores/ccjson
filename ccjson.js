
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
console.log("\n\n---------------------------------------------------");
console.log("PARSE CJSON FILE:", path);
console.log("---------------------------------------------------");

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
                        activeEntityMapping: false,
                        activeEntityAlias: null,
                        activeInstanceAlias: null,
                        activeEntityInstance: false
                    };


                    stream.on("openobject", function (key) {

console.error(path, "onopenobject", key, state);

                        if (state.activeEntityImplementation) {
                            state.activeEntityImplementation.emit("openobject", key);
                        } else
                        if (state.activeEntityMapping) {
                            state.activeEntityMapping.emit("openobject", key);
                        } else
                        if (state.activeEntityInstance === true) {
                                state.activeEntityInstance = config.registerEntityInstanceDeclaration(
                                    state.activeEntityAlias,
                                    state.activeInstanceAlias
                                );
                                state.activeEntityInstance.once("end", function () {
                                    state.activeEntityInstance = null;
                                });
                                state.activeEntityInstance.emit("key", key);
                        } else
                        if (state.activeEntityInstance) {
                            state.activeEntityInstance.emit("openobject", key);
                        } else {
                            if (key === "@") {
                                // Nothing to do here.
                            } else
                            if (key === "$") {
                                
                                if (
                                    state.objectPath.length === 2 &&
                                    state.objectPath[0] === "@"
                                ) {
                                    // We are declaring a mapping
                                    state.activeEntityMapping = true;
                                } else {
                                    // We are declaring an implementation
                                    state.activeEntityImplementation = true;
                                }
                            } else
                            if (/^\$.+/.test(key)) {
                                state.activeInstanceAlias = key.substring(1);
                                state.activeEntityInstance = true;
                            } else {

    console.error(path, "NOT HANDLED onopenobject", key);
                                
                            }
                        }
                        state.objectPath.push(key);
                    });

                    stream.on("key", function (key) {

            console.error(path, "onkey", key);
            
                        if (state.activeEntityImplementation) {
                            state.activeEntityImplementation.emit("key", key);
                        } else
                        if (state.activeEntityMapping) {
                            state.activeEntityMapping.emit("key", key);
                        } else
                        if (state.activeEntityInstance) {
                            state.activeEntityInstance.emit("key", key);
                        } else
                        if (/^@.+/.test(key)) {
                            state.activeEntityAlias = key.substring(1);
                        } else
                        if (/^\$.+/.test(key)) {
                            state.activeInstanceAlias = key.substring(1);
                            state.activeEntityInstance = true;
                        } else {
            console.error(path, "NOT HANDLED onkey", key, state.objectPath);

                        }
                    });

                    stream.on("value", function (value) {

//console.error(path, "onvalue", value, state.objectPath);

                        if (state.activeEntityImplementation === true) {
                            state.activeEntityImplementation = config.registerEntityImplementation(
                                LIB.path.join(path, "..", value)
                            );
                            state.activeEntityImplementation.once("end", function () {
                                state.activeEntityImplementation = null;
                            });
                        } else
                        if (state.activeEntityImplementation) {
                            state.activeEntityImplementation.emit("value", value);
                        } else
                        if (state.activeEntityMapping === true) {
                            state.activeEntityMapping = config.registerEntityMappingDeclaration(
                                state.objectPath[1],
                                LIB.path.join(path, "..", value)
                            );
                            state.activeEntityMapping.once("end", function () {
                                state.activeEntityMapping = null;
                            });

                        } else
                        if (state.activeEntityMapping) {
                            state.activeEntityMapping.emit("value", value);
                        } else
                        if (state.activeEntityInstance) {
                            state.activeEntityInstance.emit("value", value);
                        } else {

console.error(path, "NOT HANDLED onvalue", value, state.objectPath);
                        }
                    });



                    stream.on("closeobject", function () {

//console.log("ON closeobject", state.objectPath);

                        state.objectPath.pop();

                        if (state.activeEntityImplementation) {
                            state.activeEntityImplementation.emit("closeobject");
                        } else
                        if (state.activeEntityMapping) {
                            state.activeEntityMapping.emit("closeobject");
                        } else
                        if (state.activeEntityInstance) {
                            state.activeEntityInstance.emit("closeobject");
                        } else {

//console.log("ON closeobject NOT HANDLED", state.objectPath);

                        }
                    });


                    stream.on("openarray", function () {
                        if (state.activeEntityImplementation) {
                            state.activeEntityImplementation.emit("openarray");
                        } else
                        if (state.activeEntityMapping) {
                            state.activeEntityMapping.emit("openarray");
                        } else
                        if (state.activeEntityInstance) {
                            state.activeEntityInstance.emit("openarray");
                        }
                    });
                    stream.on("closearray", function () {
                        if (state.activeEntityImplementation) {
                            state.activeEntityImplementation.emit("closearray");
                        } else
                        if (state.activeEntityMapping) {
                            state.activeEntityMapping.emit("closearray");
                        } else
                        if (state.activeEntityInstance) {
                            state.activeEntityInstance.emit("closearray");
                        }
                    });

                    stream.on("end", function () {

//console.log(path, "state", JSON.stringify(state, null, 4));

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
                pointerHistory.push(currentPointer);
                if (currentKey) {
                    currentPointer = currentPointer[currentKey] = {};
                    currentKey = key;
                } else
                if (Array.isArray(currentPointer)) {
                    var newPointer = {};
                    currentPointer.push(newPointer);
                    currentPointer = newPointer;
                    currentKey = key;
                } else {
                    currentPointer = currentPointer[key] = {};
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
            


            self.assemble = function () {
                return LIB.Promise.try(function () {
                    return config;
                });
            };
        }
        ConfigObjectAssembler.prototype = Object.create(EVENTS.EventEmitter.prototype);

        
        var Config = function (path) {
            var self = this;

            var entity = {
                implementation: null,
                mappings: {},
                instances: {}
            }
 
            self.registerEntityImplementation = function (path) {
                entity.implementation = {
                    assembler: new ConfigObjectAssembler(),
                    impl: new LIB.Promise(function (resolve, reject) {
                        // We load code right away but don't instanciate until later
                        return require.async(path, resolve, reject);
                    })
                };
                return entity.implementation.assembler;
            }

            self.registerEntityMappingDeclaration = function (alias, path) {
                entity.mappings[alias] = {
                    assembler: new ConfigObjectAssembler(),
                    impl: parseFile(path)
                };
                return entity.mappings[alias].assembler;
            }
            
            self.registerEntityInstanceDeclaration = function (entityAlias, instanceAlias) {
                entity.instances[instanceAlias] = {
                    assembler: new ConfigObjectAssembler(),
                    entityAlias: entityAlias
                };
                return entity.instances[instanceAlias].assembler;
            }

            self.assemble = function (overrides) {
                var config = {};

console.log("ASSEMBLE ("+ path +") overrides", overrides);
console.log("ASSEMBLE ("+ path +") entity", entity);

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
                        return entity.mappings[alias].assembler.assemble().then(function (configOverrides) {
                            return entity.mappings[alias].impl.then(function (config) {
                                return config.assemble(configOverrides).then(function (config) {
                                    mappings[alias] = config;
                                });
                            });
                        });
                    })).then(function () {
                        return mappings;
                    });
                }
                
                function instanciateEntityInstances (mappings) {
                    var instances = {};

//console.log("instanciateEntityInstances mappings", mappings);
//console.log("instanciateEntityInstances entity", entity);

                    return LIB.Promise.all(Object.keys(entity.instances).map(function (alias) {

                        return entity.instances[alias].assembler.assemble().then(function (configOverrides) {

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

//console.log("instances[alias]", instances[alias].__proto__);

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

                return config.assemble();
            });
        }
    
        return exports;
    });
}
