

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
    "99": true
};


describe('ccjson', function() {

    const EXPECTATIONS = {
        "01-EntityImplementation": function (overrides) {
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
            return config;
        }
    };

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
            config.prototype["@entities"]["entity"] = config.prototype["@entities"]["entity"].prototype;

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
            config.prototype["@entities"]["entity"] = config.prototype["@entities"]["entity"].prototype;
            config.prototype["@instances"]["inst1"] = config.prototype["@instances"]["inst1"].toString();
            config.prototype["@instances"]["inst2"] = config.prototype["@instances"]["inst2"].toString();

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "should be overwritten below",
                            "newOverride": "Our Override"
                        }
                    })
                },
                "@instances": {
                    "inst1": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 1",
                            "newOverride": "Our Override"
                        }
                    }),
                    "inst2": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 2",
                            "newOverride": "Our Override"
                        }
                    })
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
            config.prototype["@entities"]["entity"] = config.prototype["@entities"]["entity"].prototype;
            config.prototype["@instances"]["inst1"] = config.prototype["@instances"]["inst1"].toString();
            config.prototype["@instances"]["inst2"] = config.prototype["@instances"]["inst2"].toString();
            config.prototype["@instances"]["inst3"] = config.prototype["@instances"]["inst3"].toString();

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "should be overwritten below",
                            "newOverride": "New Override from our config"
                        }
                    })
                },
                "@instances": {
                    "inst1": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 1",
                            "newOverride": "New Override from our config"
                        }
                    }),
                    "inst2": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 2",
                            "newOverride": "New Override from our config"
                        }
                    }),
                    "inst3": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "override": "New Value 3",
                            "newOverride": "New Override from our config"
                        }
                    })
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
            config.prototype["@entities"]["entity"] = config.prototype["@entities"]["entity"].prototype;
            config.prototype["@entities"]["entity.ours"] = config.prototype["@entities"]["entity.ours"].prototype;
            config.prototype["@instances"]["inst.E.a"] = config.prototype["@instances"]["inst.E.a"].toString();
            config.prototype["@instances"]["inst.E.b"] = config.prototype["@instances"]["inst.E.b"].toString();
            config.prototype["@instances"]["inst.EO.a"] = config.prototype["@instances"]["inst.EO.a"].toString();
            config.prototype["@instances"]["inst.EO.b"] = config.prototype["@instances"]["inst.EO.b"].toString();

//console.log("config", JSON.stringify(config.prototype, null, 4));

            delete config.prototype.getInstance;
            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "newOverride": "New Override"
                        }
                    }),
                    "entity.ours": {
                        "_entity": "05-MultipleEntityMappingsAndInstances/entity",
                        "config": {
                            "ourDefault": "Val"
                        }
                    }
                },
                "@instances": {
                    "inst.E.a": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "newOverride": "New Override",
                            "foo": "bar1"
                        }
                    }),
                    "inst.E.b": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "newOverride": "New Override"
                        }
                    }),
                    "inst.EO.a": {
                        "_entity": "05-MultipleEntityMappingsAndInstances/entity",
                        "config": {
                            "ourDefault": "Val"
                        }
                    },
                    "inst.EO.b": {
                        "_entity": "05-MultipleEntityMappingsAndInstances/entity",
                        "config": {
                            "ourDefault": "Val",
                            "foo": "bar3"
                        }
                    }
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
            config.prototype["@entities"]["entity"] = config.prototype["@entities"]["entity"].prototype;
            config.prototype["@instances"]["inst1"] = config.prototype["@instances"]["inst1"].toString();
            config.prototype["@instances"]["inst2"] = config.prototype["@instances"]["inst2"].toString();
            config.prototype["@instances"]["inst3"] = config.prototype["@instances"]["inst3"].toString();

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "entity": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "ourBasePathInSubMappings": PATH.join(__dirname, "06-Variables/sub"),
                            "ourBasePathInMappings": PATH.join(__dirname, "06-Variables")
                        }
                    })
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
                            }
                        }
                    }),
                    "inst2": EXPECTATIONS["01-EntityImplementation"]({
                        "config": {
                            "ourBasePathInSubMappings": PATH.join(__dirname, "06-Variables/sub"),
                            "ourBasePathInMappings": PATH.join(__dirname, "06-Variables"),
                            "ourBasePathInSubInstances": PATH.join(__dirname, "06-Variables"),
                            "ourBasePathInInstances": PATH.join(__dirname, "06-Variables")
                        }
                    }),
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
                            }
                        }
                    })
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

//console.log("config", JSON.stringify(config.prototype, null, 4));

            delete config.prototype.getInstance;
            config.prototype["@entities"]["profile.impl"] = config.prototype["@entities"]["profile.impl"].prototype;
            config.prototype["@entities"]["auth.impl"] = config.prototype["@entities"]["auth.impl"].prototype;
            config.prototype["@instances"]["profile"] = config.prototype["@instances"]["profile"].toString();
            config.prototype["@instances"]["auth"] = config.prototype["@instances"]["auth"].toString();

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "profile.impl": {
                        "_entity": "07-InstanceAspects/profile",
                        "config": {
                        }
                    },
                    "auth.impl": {
                        "_entity": "07-InstanceAspects/auth",
                        "config": {
                        }
                    }
                },
                "@instances": {
                    "profile": {
                        "_entity": "07-InstanceAspects/profile",
                        "config": {
                            "secret": "SecretValue"
                        }
                    },
                    "auth": {
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
                            }
                        }
                    }
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
            config.prototype["@entities"]["profile.impl"] = config.prototype["@entities"]["profile.impl"].prototype;
            config.prototype["@entities"]["auth.impl"] = config.prototype["@entities"]["auth.impl"].prototype;
            config.prototype["@instances"]["profile"] = config.prototype["@instances"]["profile"].toString();
            config.prototype["@instances"]["auth"] = config.prototype["@instances"]["auth"].getSecrets();

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "profile.impl": {
                        "_entity": "08-InstanceAspectFunctions/profile",
                        "config": {
                        }
                    },
                    "auth.impl": {
                        "_entity": "08-InstanceAspectFunctions/auth",
                        "config": {
                        }
                    }
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
                "foo": "bar"
            });

            return done();
        }).catch(done);
    });

    if (TESTS["99"])
    it('99-ZeroSystem-01', function (done) {
        var ccjson = new CCJSON();
        return ccjson.parseFile(
            PATH.join(__dirname, "99-ZeroSystem-01/config.ccjson")
        ).then(function (config) {

//console.log("config", JSON.stringify(config.prototype, null, 4));

            delete config.prototype.getInstance;
            config.prototype["@entities"]["profile.impl"] = config.prototype["@entities"]["profile.impl"].prototype;
            config.prototype["@entities"]["auth.impl"] = config.prototype["@entities"]["auth.impl"].prototype;
            config.prototype["@entities"]["route.express"] = config.prototype["@entities"]["route.express"].prototype;
            config.prototype["@instances"]["profile"] = config.prototype["@instances"]["profile"].toString();
            config.prototype["@instances"]["auth"] = config.prototype["@instances"]["auth"].toString();
            config.prototype["@instances"]["0.routes.auth.passport"] = config.prototype["@instances"]["0.routes.auth.passport"].toString();
            config.prototype["@instances"]["0.routes.proxy.smi.cache.org.travis-ci"] = config.prototype["@instances"]["0.routes.proxy.smi.cache.org.travis-ci"].toString();

//console.log("config", JSON.stringify(config.prototype, null, 4));

            ASSERT.deepEqual(config.prototype, {
                "@entities": {
                    "profile.impl": {
                        "_entity": "99-ZeroSystem-01/profile",
                        "config": {
                        }
                    },
                    "auth.impl": {
                        "_entity": "99-ZeroSystem-01/auth",
                        "config": {
                        }
                    },
                    "route.express": {
                        "_entity": "99-ZeroSystem-01/route",
                        "config": {}
                    }
                },
                "@instances": {
                    "profile": {
                        "_entity": "99-ZeroSystem-01/profile",
                        "config": {
                            "secret": "SecretValue"
                        }
                    },
                    "0.routes.auth.passport": {
                        "_entity": "99-ZeroSystem-01/route",
                        "config": {
                            "namespace": "0",
                            "decrypter": "&func&f:1"
                        }
                    },
                    "0.routes.proxy.smi.cache.org.travis-ci": {
                        "_entity": "99-ZeroSystem-01/route",
                        "config": {
                            "namespace": "0",
                            "decrypter": "&func&f:2"
                        }
                    },
                    "auth": {
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
                            "decrypter": "&func&f:3"
                        }
                    }
                }
            });

            return done();
        }).catch(done);
    });

});
