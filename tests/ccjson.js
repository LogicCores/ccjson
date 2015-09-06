

//process.env.CDEBUG = "info";


const PATH = require("path");
const FS = require("fs");
const _ = require("lodash");
const ASSERT = require("assert");
var CCJSON = require("..");
CCJSON = CCJSON.forLib(CCJSON.makeLib());


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

    it('01-EntityImplementation', function (done) {
//return done();        
        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/01-EntityImplementation/entity.ccjson")
            ).then(function (config) {
                ASSERT.deepEqual(config.prototype, EXPECTATIONS["01-EntityImplementation"]());
                return done();
            });
        }).catch(done);
    });

    it('02-EntityMapping', function (done) {
//return done();
        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/02-EntityMapping/config.ccjson")
            ).then(function (config) {
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
            });
        }).catch(done);
    });

    it('03-EntityInstance', function (done) {
//return done();        
        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/03-EntityInstance/config.ccjson")
            ).then(function (config) {
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
            });
        }).catch(done);
    });

    it('04-ConfigInheritance', function (done) {
//return done();        
        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/04-ConfigInheritance/config.ccjson")
            ).then(function (config) {

//console.log("config", JSON.stringify(config.prototype, null, 4));

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
            });
        }).catch(done);
    });


    it('05-MultipleEntityMappingsAndInstances', function (done) {
//return done();        
        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/05-MultipleEntityMappingsAndInstances/config.ccjson")
            ).then(function (config) {
                config.prototype["@entities"]["entity"] = config.prototype["@entities"]["entity"].prototype;
                config.prototype["@entities"]["entity.ours"] = config.prototype["@entities"]["entity.ours"].prototype;
                config.prototype["@instances"]["inst.E.a"] = config.prototype["@instances"]["inst.E.a"].toString();
                config.prototype["@instances"]["inst.E.b"] = config.prototype["@instances"]["inst.E.b"].toString();
                config.prototype["@instances"]["inst.EO.a"] = config.prototype["@instances"]["inst.EO.a"].toString();
                config.prototype["@instances"]["inst.EO.b"] = config.prototype["@instances"]["inst.EO.b"].toString();

//console.log("config", JSON.stringify(config.prototype, null, 4));

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
            });
        }).catch(done);
    });

    it('06-Variables', function (done) {
//return done();

        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/06-Variables/config.ccjson"),
                {
                    env: function (name) {
                        if (name === "MY_ENV_VAR") {
                            return "my-env-var-value";
                        }
                        throw new Error("Env variable '" + name + "' not declared!");
                    }
                }
            ).then(function (config) {

                config.prototype["@entities"]["entity"] = config.prototype["@entities"]["entity"].prototype;
                config.prototype["@instances"]["inst1"] = config.prototype["@instances"]["inst1"].toString();
                config.prototype["@instances"]["inst2"] = config.prototype["@instances"]["inst2"].toString();
                config.prototype["@instances"]["inst3"] = config.prototype["@instances"]["inst3"].toString();

//console.log("config", JSON.stringify(config.prototype, null, 4));

                ASSERT.deepEqual(config.prototype, {
                    "@entities": {
                        "entity": EXPECTATIONS["01-EntityImplementation"]({
                            "config": {
                                "ourBasePathInSubMappings": PATH.join(__dirname, "assets/06-Variables/sub"),
                                "ourBasePathInMappings": PATH.join(__dirname, "assets/06-Variables")
                            }
                        })
                    },
                    "@instances": {
                        "inst1": EXPECTATIONS["01-EntityImplementation"]({
                            "config": {
                                "myvar": "my-env-var-value",
                                "ourBasePathInSubMappings": PATH.join(__dirname, "assets/06-Variables/sub"),
                                "ourBasePathInMappings": PATH.join(__dirname, "assets/06-Variables"),
                                "ourBasePathInSubInstances": PATH.join(__dirname, "assets/06-Variables/sub"),
                                "ourBasePathInInstances": PATH.join(__dirname, "assets/06-Variables/sub")
                            }
                        }),
                        "inst2": EXPECTATIONS["01-EntityImplementation"]({
                            "config": {
                                "ourBasePathInSubMappings": PATH.join(__dirname, "assets/06-Variables/sub"),
                                "ourBasePathInMappings": PATH.join(__dirname, "assets/06-Variables"),
                                "ourBasePathInSubInstances": PATH.join(__dirname, "assets/06-Variables"),
                                "ourBasePathInInstances": PATH.join(__dirname, "assets/06-Variables")
                            }
                        }),
                        "inst3": EXPECTATIONS["01-EntityImplementation"]({
                            "config": {
                                "myvar": "my-env-var-value",
                                "ourBasePathInSubMappings": PATH.join(__dirname, "assets/06-Variables"),
                                "ourBasePathInMappings": PATH.join(__dirname, "assets/06-Variables"),
                                "ourBasePathInInstances": PATH.join(__dirname, "assets/06-Variables")
                            }
                        })
                    }
                });

                return done();
            });
        }).catch(done);
    });

    it('07-InstanceAspects', function (done) {
//return done();
        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/07-InstanceAspects/config.ccjson")
            ).then(function (config) {

//console.log("config", JSON.stringify(config.prototype, null, 4));

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
                                }
                            }
                        }
                    }
                });

                return done();
            });
        }).catch(done);
    });

});
