
exports.forLib = function (LIB) {
    var ccjson = this;

    const ASSERT = require("assert");

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig)
                LIB._.merge(config, instanceConfig)
                config = ccjson.attachDetachedFunctions(config);

                self.getSecrets = function () {
                    var secrets = {};
                    Object.keys(config.secrets).forEach(function (name) {
                        secrets[name] = config.secrets[name].decoder(config.secrets[name].value);
                    });
                    return secrets;
                }
            }
            Entity.prototype._entity = "07-InstanceAspects/auth";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
