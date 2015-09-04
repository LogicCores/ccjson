

//process.env.CDEBUG = "info";


const PATH = require("path");
const FS = require("fs");
const _ = require("lodash");
const ASSERT = require("assert");
var CCJSON = require("..");
CCJSON = CCJSON.forLib(CCJSON.makeLib());


describe('ccjson', function() {

    const EXPECTATIONS = {
        "01-EntityImplementation": {
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
        }
    };


    it('01-EntityImplementation', function (done) {
//return done();        
        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/01-EntityImplementation/entity.ccjson")
            ).then(function (config) {
                ASSERT.deepEqual(config.prototype, EXPECTATIONS["01-EntityImplementation"]);
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
                        "entity": _.merge(EXPECTATIONS["01-EntityImplementation"], {
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
                        "entity": _.merge(EXPECTATIONS["01-EntityImplementation"], {
                            "config": {
                                "newOverride": "New Override"
                            }
                        })
                    },
                    "@instances": {
                        "inst1": _.merge(EXPECTATIONS["01-EntityImplementation"], {
                            "config": {
                                "override": "New Value 1",
                                "newOverride": "New Override"
                            }
                        }),
                        "inst2": _.merge(EXPECTATIONS["01-EntityImplementation"], {
                            "config": {
                                "override": "New Value 2",
                                "newOverride": "New Override"
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
                        "entity": _.merge(EXPECTATIONS["01-EntityImplementation"], {
                            "config": {
                                "newOverride": "New Override"
                            }
                        })
                    },
                    "@instances": {
                        "inst1": _.merge(EXPECTATIONS["01-EntityImplementation"], {
                            "config": {
                                "override": "New Value 1",
                                "newOverride": "New Override from our config"
                            }
                        }),
                        "inst2": _.merge(EXPECTATIONS["01-EntityImplementation"], {
                            "config": {
                                "override": "New Value 2",
                                "newOverride": "New Override from our config"
                            }
                        }),
                        "inst3": _.merge(EXPECTATIONS["01-EntityImplementation"], {
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
});
