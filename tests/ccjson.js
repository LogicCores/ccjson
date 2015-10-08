

//process.env.CDEBUG = "info";


const PATH = require("path");
const FS = require("fs");
const _ = require("lodash");
const ASSERT = require("assert");
var CCJSON = require("..");
const LIB = CCJSON.makeLib();
CCJSON = CCJSON.forLib(LIB);


var TESTS = {
    "01": true,
    "02": true,
    "03": true,
    "04": true,
    "05": true,
    "06": true,
    "07": true,
    "08": true,
    "09": true,
    "10": true,
    "11": true,
    "12": true,
    "99.01": true,
    "99.02": true
};


describe('ccjson', function() {

    const EXPECTATIONS = {
        "01-EntityImplementation": function (overrides, proto) {
            var config = {
                _entity: '01-EntityImplementation/entity',
                config: {
                    "default": "value",
                    "int": 1,
                    "bool": true,
                    "obj": {
                        "key": "val",
                        "array": [
                            "string",
                            true,
                            {
                                "nested": {
                                    "deep": true,
                                    "obj": {}
                                }
                            },
                            10
                        ],
                        "another": "value"
                    },
                    "me": "too"
                }
            };
            _.merge(config, overrides || {});
            _.merge(config, proto || {});
            return config;
        }
    };
    
    function makeTestable (property, obj) {
        if (property === "@entities") {
            Object.keys(obj).forEach(function (name) {
                obj[name] = obj[name].prototype;
                if (obj[name]["@instances"]) {
                    obj[name]["@instances"] = Object.keys(obj[name]["@instances"]);
                }
            });
        } else
        if (property === "@instances") {
            Object.keys(obj).forEach(function (name) {
                obj[name] = obj[name].toString();
            });
        }
    }

    if (TESTS["01"])
    it('01-EntityImplementation', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "01-EntityImplementation/entity.ccjson")
        ).then(function (config) {

            delete config.prototype.getInstance;

            ASSERT.deepEqual(config.prototype, EXPECTATIONS["01-EntityImplementation"]());
            return done();
        }).catch(done);
    });

    if (TESTS["02"])
    it('02-EntityMapping', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "02-EntityMapping/config.ccjson")
        ).then(function (config) {

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "newOverride": "New Override"
                        }
                    })
                }
            });
            return done();
        }).catch(done);
    });

    if (TESTS["03"])
    it('03-EntityInstance', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "03-EntityInstance/config.ccjson")
        ).then(function (config) {

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto = {
                "@instances": [
                    "inst1",
                    "inst2"
                ],
                "@instances.order": [
                    "inst1",
                    "inst2"
                ]                
            };

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "should be overwritten below",
                            "newOverride": "Our Override"
                        }
                    }, proto)
                },
                "@instances": {
                    "inst1": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 1",
                            "newOverride": "Our Override",
                            "$alias": "inst1"
                        }
                    }, proto),
                    "inst2": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 2",
                            "newOverride": "Our Override",
                            "$alias": "inst2"
                        }
                    }, proto)
                }
            });
            return done();
        }).catch(done);
    });

    if (TESTS["04"])
    it('04-ConfigInheritance', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "04-ConfigInheritance/config.ccjson")
        ).then(function (config) {

//console.log("config", JSON.stringify(config.prototype, null, 4));

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto = {
                "@instances": [
                    "inst3",
                    "inst1",
                    "inst2"
                ],
                "@instances.order": [
                    "inst3",
                    "inst1",
                    "inst2"
                ]
            };

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "should be overwritten below",
                            "newOverride": "New Override from our config"
                        }
                    }, proto)
                },
                "@instances": {
                    "inst1": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 1",
                            "newOverride": "New Override from our config",
                            "$alias": "inst1"
                        }
                    }, proto),
                    "inst2": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 2",
                            "newOverride": "New Override from our config",
                            "$alias": "inst2"
                        }
                    }, proto),
                    "inst3": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 3",
                            "newOverride": "New Override from our config",
                            "$alias": "inst3"
                        }
                    }, proto)
                }
            });
            return done();
        }).catch(done);
    });

    if (TESTS["05"])
    it('05-MultipleEntityMappingsAndInstances', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "05-MultipleEntityMappingsAndInstances/config.ccjson")
        ).then(function (config) {

            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto1 = {
                "@instances": [
                    "inst.E.a",
                    "inst.E.b"
                ],
                "@instances.order": [
                    "inst.E.a",
                    "inst.E.b"
                ]
            };
            var proto2 = {
                "@instances": [
                    "inst.EO.a",
                    "inst.EO.b"
                ],
                "@instances.order": [
                    "inst.EO.a",
                    "inst.EO.b"
                ]
            };

//console.log("config", JSON.stringify(config.prototype, null, 4));

            delete config.prototype.getInstance;
            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "newOverride": "New Override"
                        }
                    }, proto1),
                    "entity.ours": LIB._.assign({
                        "_entity": "05-MultipleEntityMappingsAndInstances/entity",
                        "config": {
                            "ourDefault": "Val"
                        }
                    }, proto2)
                },
                "@instances": {
                    "inst.E.a": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "newOverride": "New Override",
                            "foo": "bar1",
                            "$alias": "inst.E.a"
                        }
                    }, proto1),
                    "inst.E.b": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "newOverride": "New Override",
                            "$alias": "inst.E.b"
                        }
                    }, proto1),
                    "inst.EO.a": LIB._.assign({
                        "_entity": "05-MultipleEntityMappingsAndInstances/entity",
                        "config": {
                            "ourDefault": "Val",
                            "$alias": "inst.EO.a"
                        }
                    }, proto2),
                    "inst.EO.b": LIB._.assign({
                        "_entity": "05-MultipleEntityMappingsAndInstances/entity",
                        "config": {
                            "ourDefault": "Val",
                            "foo": "bar3",
                            "$alias": "inst.EO.b"
                        }
                    }, proto2)
                }
            });
            return done();
        }).catch(done);
    });

    if (TESTS["06"])
    it('06-Variables', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "06-Variables/config.ccjson"),
            {
                env: function (name) {
                    if (name === "MY_ENV_VAR") {
                        return "my-env-var-value";
                    }
                    throw new Error("Env variable '" + name + "' not declared!");
                }
            }
        ).then(function (config) {

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto1 = {
                "@instances": [
                    "inst2",
                    "inst1",
                    "inst3"
                ],
                "@instances.order": [
                    "inst2",
                    "inst3",
                    "inst1"
                ]
            };

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "ourBasePathInSubMappings": PATH.join(__dirname, "06-Variables/sub"),
                            "ourBasePathInMappings": PATH.join(__dirname, "06-Variables")
                        }
                    }, proto1)
                },
                "@instances": {
                    "inst1": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "myvar": "my-env-var-value",
                            "ourBasePathInSubMappings": PATH.join(__dirname, "06-Variables/sub"),
                            "ourBasePathInMappings": PATH.join(__dirname, "06-Variables"),
                            "ourBasePathInSubInstances": PATH.join(__dirname, "06-Variables/sub"),
                            "ourBasePathInInstances": PATH.join(__dirname, "06-Variables/sub"),
                            "myvar": "sub:inst1:my-env-var-value",
                            "myobj": {
                                "mysubvar": "myobj:sub:inst1:my-env-var-value"
                            },
                            "myobjDuplicate": {
                                "mysubvar": "myobj:sub:inst1:my-env-var-value"
                            },
                            "$alias": "inst1"
                        }
                    }, proto1),
                    "inst2": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "ourBasePathInSubMappings": PATH.join(__dirname, "06-Variables/sub"),
                            "ourBasePathInMappings": PATH.join(__dirname, "06-Variables"),
                            "ourBasePathInSubInstances": PATH.join(__dirname, "06-Variables"),
                            "ourBasePathInInstances": PATH.join(__dirname, "06-Variables"),
                            "$alias": "inst2"
                        }
                    }, proto1),
                    "inst3": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "myvar": "my-env-var-value",
                            "ourBasePathInSubMappings": PATH.join(__dirname, "06-Variables"),
                            "ourBasePathInMappings": PATH.join(__dirname, "06-Variables"),
                            "ourBasePathInInstances": PATH.join(__dirname, "06-Variables"),
                            "myvar": "my-env-var-value",
                            "myvarFromInst1": "value:sub:inst1:my-env-var-value:local:my-env-var-value",
                            "myobjFromInst1": {
                                "mysubvar": "myobj:sub:inst1:my-env-var-value"
                            },
                            "andAgain": {
                                "myobjFromInst1nested": {
                                    "mysubvar": "myobj:sub:inst1:my-env-var-value"
                                }
                            },                            
                            "$alias": "inst3"
                        }
                    }, proto1)
                }
            });

            return done();
        }).catch(done);
    });

    if (TESTS["07"])
    it('07-InstanceAspects', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "07-InstanceAspects/config.ccjson")
        ).then(function (config) {

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto1 = {
                "@instances": [
                    "profile"
                ],
                "@instances.order": [
                    "profile"
                ]
            };
            var proto2 = {
                "@instances": [
                    "auth"
                ],
                "@instances.order": [
                    "auth"
                ]
            };

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "profile.impl": LIB._.assign({
                        "_entity": "07-InstanceAspects/profile",
                        "config": {
                        }
                    }, proto1),
                    "auth.impl": LIB._.assign({
                        "_entity": "07-InstanceAspects/auth",
                        "config": {
                        }
                    }, proto2)
                },
                "@instances": {
                    "profile": LIB._.assign({
                        "_entity": "07-InstanceAspects/profile",
                        "config": {
                            "secret": "SecretValue",
                            "$alias": "profile"
                        }
                    }, proto1),
                    "auth": LIB._.assign({
                        "_entity": "07-InstanceAspects/auth",
                        "config": {
                            "someVariable1": "Value1",
                            "set1": {
                                "someVariable2": "Value2"
                            },
                            "set2": {
                                "sub": {
                                    "someVariable3": "Value3"
                                }
                            },
                            "$alias": "auth"
                        }
                    }, proto2)
                }
            });

            return done();
        }).catch(done);
    });

    if (TESTS["08"])
    it('08-InstanceAspectFunctions', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "08-InstanceAspectFunctions/config.ccjson")
        ).then(function (config) {

            delete config.prototype.getInstance;
            var secrets = config.prototype["@instances"]["auth"].getSecrets();
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            config.prototype["@instances"]["auth"] = secrets;
            var proto1 = {
                "@instances": [
                    "profile"
                ],
                "@instances.order": [
                    "profile"
                ]
            };
            var proto2 = {
                "@instances": [
                    "auth"
                ],
                "@instances.order": [
                    "auth"
                ]
            };

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "profile.impl": LIB._.assign({
                        "_entity": "08-InstanceAspectFunctions/profile",
                        "config": {
                        }
                    }, proto1),
                    "auth.impl": LIB._.assign({
                        "_entity": "08-InstanceAspectFunctions/auth",
                        "config": {
                        }
                    }, proto2)
                },
                "@instances": {
                    "profile": {},
                    "auth": {
                        "component1": "Value1"
                    }
                }
            });

            return done();
        }).catch(done);
    });

    if (TESTS["09"])
    it('09-EntityInstanceFunctions', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "09-EntityInstanceFunctions/config.ccjson")
        ).then(function (Config) {

            var config = new Config();
            var inst1 = config.getInstance("inst1");
            var result = inst1.spin();

            ASSERT.deepEqual(result, {
                "foo": "bar",
                "$alias": "inst1"
            });

            return done();
        }).catch(done);
    });

    if (TESTS["10"])
    it('10-ConfigInheritanceVariables', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "10-ConfigInheritanceVariables/config.ccjson")
        ).then(function (config) {

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto1 = {
                "@instances": [
                    "0.inst1",
                    "0.inst2"
                ],
                "@instances.order": [
                    "0.inst1",
                    "0.inst2"
                ]
            };

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "_entity": "01-EntityImplementation/entity",
                        "config": {
                            "protoEntityKey": "ProtoEntityValue",
                            "protoSuperEntityKey": "ProtoSuperEntityValue"
                        }
                    }, proto1)
                },
                "@instances": {
                   "0.inst1": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "protoEntityKey": "ProtoEntityValue",
                            "protoSuperEntityKey": "ProtoSuperEntityValue",
                            "protoSuperEntityInstance1Key": "entityInstance1Value",
                            "protoEntityInstance1Key": "entityInstance1Value",
                            "entityInstance1Key": "entityInstance1Value",
                            "$alias": "0.inst1"
                        }
                    }, proto1),
                    "0.inst2": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "protoEntityKey": "ProtoEntityValue",
                            "protoSuperEntityKey": "ProtoSuperEntityValue",
                            "protoSuperEntityInstance2Key": "ProtoSuperEntityInstance2Value:CustomValue",
                            "protoEntityInstance2Key": "ProtoEntityInstance2Value",
                            "entityInstance2Key": "entityInstance2Value",
                            "$alias": "0.inst2"
                        }
                    }, proto1)
                }
            });

            return done();
        }).catch(done);
    });

    if (TESTS["11"])
    it('11-InheritedEntityImplementation', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "11-InheritedEntityImplementation/config.ccjson")
        ).then(function (config) {

//console.log("config", JSON.stringify(config.prototype, null, 4));

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto = {
                "@instances": [
                    "entity"
                ],
                "@instances.order": [
                    "entity"
                ]
            };

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": {
                        "_entity": "11-InheritedEntityImplementation/entity",
                        "config": {
                            "default": "value",
                            "configKey": "configValue1",
                            "myEntityKey": "configValue1",
                            "instanceKey": "configValue1"
                        },
                        "@instances": [
                            "entity"
                        ],
                        "@instances.order": [
                            "entity"
                        ]
                    }
                },
                "@instances": {
                    "entity": {
                        "_entity": "11-InheritedEntityImplementation/entity",
                        "config": {
                            "default": "value",
                            "configKey": "configValue1",
                            "myEntityKey": "configValue1",
                            "instanceKey": "configValue2",
                            "$alias": "entity"
                        },
                        "@instances": [
                            "entity"
                        ],
                        "@instances.order": [
                            "entity"
                        ]
                    }
                }
            });
            return done();
        }).catch(done);
    });

    if (TESTS["12"])
    it('12-OptionalInheritance', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "12-OptionalInheritance/config.ccjson")
        ).then(function (config) {
            ASSERT.deepEqual(JSON.stringify(config.prototype), "{}");
            return done();
        }).catch(done);
    });

    if (TESTS["99.01"])
    it('99-ZeroSystem-01', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "99-ZeroSystem-01/config.ccjson")
        ).then(function (config) {

//console.log("config", JSON.stringify(config.prototype, null, 4));

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto1 = {
                "@instances": [
                    "profile"
                ],
                "@instances.order": [
                    "profile"
                ]
            };
            var proto2 = {
                "@instances": [
                    "auth"
                ],
                "@instances.order": [
                    "auth"
                ]
            };
            var proto3 = {
                "@instances": [
                    "0.routes.auth.passport",
                    "0.routes.proxy.smi.cache.org.travis-ci"
                ],
                "@instances.order": [
                    "0.routes.auth.passport",
                    "0.routes.proxy.smi.cache.org.travis-ci"
                ]
            };

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "profile.impl": LIB._.assign({
                        "_entity": "99-ZeroSystem-01/profile",
                        "config": {
                        }
                    }, proto1),
                    "auth.impl": LIB._.assign({
                        "_entity": "99-ZeroSystem-01/auth",
                        "config": {
                        }
                    }, proto2),
                    "route.express": LIB._.assign({
                        "_entity": "99-ZeroSystem-01/route",
                        "config": {}
                    }, proto3)
                },
                "@instances": {
                    "profile": LIB._.assign({
                        "_entity": "99-ZeroSystem-01/profile",
                        "config": {
                            "secret": "SecretValue",
                            "$alias": "profile"
                        }
                    }, proto1),
                    "0.routes.auth.passport": LIB._.assign({
                        "_entity": "99-ZeroSystem-01/route",
                        "config": {
                            "namespace": "0",
                            "decrypter": "&func&f:1",
                            "key": "SecretValue:key1",
                            "more": "data1",
                            "$alias": "0.routes.auth.passport"
                        }
                    }, proto3),
                    "0.routes.proxy.smi.cache.org.travis-ci": LIB._.assign({
                        "_entity": "99-ZeroSystem-01/route",
                        "config": {
                            "namespace": "0",
                            "decrypter": "&func&f:2",
                            "key": "SecretValue:key2",
                            "more": "data2",
                            "$alias": "0.routes.proxy.smi.cache.org.travis-ci"
                        }
                    }, proto3),
                    "auth": LIB._.assign({
                        "_entity": "99-ZeroSystem-01/auth",
                        "config": {
                            "set1": {
                                "someVariable": "Value",
                                "someVariableA": "OurOverrideValueA",
                                "someVariableB": "OurValueB"
                            },
                            "set2": {
                                "someVariableC": "OurValueC",
                                "sub": {
                                    "someVariableD": "OurValueD",
                                    "someVariable2": "Value2"
                                }
                            },
                            "someVariable3": "Value3",
                            "decrypter": "&func&f:3",
                            "$alias": "auth"
                        }
                    }, proto2)
                }
            });

            return done();
        }).catch(done);
    });

    if (TESTS["99.02"])
    it('99-ZeroSystem-02', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "99-ZeroSystem-02/boot.ccjson")
        ).then(function (config) {

//console.log("config", JSON.stringify(config.prototype, null, 4));

            delete config.prototype.getInstance;
            makeTestable("@entities", config.prototype["@entities"]);
            makeTestable("@instances", config.prototype["@instances"]);
            var proto1 = {
                "@instances": [
                    "stackA.entity",
                    "stackB.entity"
                ],
                "@instances.order": [
                    "stackA.entity",
                    "stackB.entity"
                ]
            };
            var proto2 = {
                "@instances": [
                    "stackA.fs",
                    "stackB.fs"
                ],
                "@instances.order": [
                    "stackA.fs",
                    "stackB.fs"
                ]
            }

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "_entity": "01-EntityImplementation/entity",
                        "config": {
                            "entity": "default"
                        }
                    }, proto1),
                    "fs": LIB._.assign({
                        "_entity": "99-ZeroSystem-02/fs",
                        "config": {
                        }
                    }, proto2)
                },
                "@instances": {
                    "stackA.fs": LIB._.assign({
                        "_entity": "99-ZeroSystem-02/fs",
                        "config": {
                            "basePath": "cacheBasePathA",
                            "$alias": "stackA.fs"
                        }
                    }, proto2),
                    "stackB.fs": LIB._.assign({
                        "_entity": "99-ZeroSystem-02/fs",
                        "config": {
                            "basePath": "cacheBasePathB",
                            "$alias": "stackB.fs"
                        }
                    }, proto2),
                    "stackA.entity": EXPECTATIONS["01-EntityImplementation"]({
                        "_entity": "01-EntityImplementation/entity",
                        "config": {
                            "entity": "default",
                            "path": "cacheBasePathA",
                            "namespaceFromStackProto": "stackA",
                            "fromStack": "A",
                            "our1": "override1",
                            "$alias": "stackA.entity"
                        }
                    }, proto1),
                    "stackB.entity": EXPECTATIONS["01-EntityImplementation"]({
                        "_entity": "01-EntityImplementation/entity",
                        "config": {
                            "entity": "default",
                            "path": "cacheBasePathB",
                            "namespaceFromStackProto": "stackB",
                            "fromStack": "B",
                            "our2": "override2",
                            "$alias": "stackB.entity"
                        }
                    }, proto1)
                }
            });

            return done();
        }).catch(done);
    });

});
