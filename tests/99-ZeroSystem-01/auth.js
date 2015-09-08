
exports.forLib = function (LIB) {
    var ccjson = this;

    const ASSERT = require("assert");

    return LIB.Promise.resolve({
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
                
                var config = {};
                LIB._.merge(config, defaultConfig)
                LIB._.merge(config, instanceConfig)
                config = ccjson.attachDetachedFunctions(config);

                ASSERT.equal(config.decrypter("value"), "decrypted:value");
            }
            Entity.prototype._entity = "07-InstanceAspects/auth";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
