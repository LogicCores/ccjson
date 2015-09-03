
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
return done();
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

console.log("config", JSON.stringify(config, null, 4));

                config["@entities"]["entity"] = config["@entities"]["entity"].prototype;
                ASSERT.deepEqual(config, {
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
return done();        
        return CCJSON.then(function (CCJSON) {
            return CCJSON.parseFile(
                PATH.join(__dirname, "assets/03-EntityInstance/config.ccjson")
            ).then(function (config) {
                
console.log("config", JSON.stringify(config, null, 4));
/*
                ASSERT.deepEqual(config, {
                    "@entities": {
                        "entity": _.merge(EXPECTATIONS["01-EntityImplementation"], {
                            "config": {
                                "newOverride": "New Override"
                            }
                        })
                    }
                });
*/
                return done();
            });
        }).catch(done);
    });

});
