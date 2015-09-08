
exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;
                var config = {};
                LIB._.merge(config, defaultConfig)
                LIB._.merge(config, instanceConfig)

                self.toString = function () {
                    return {};
                }

                self.AspectInstance = function (aspectConfig) {
                    return LIB.Promise.resolve({
                        makeDecrypter: function () {
                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(function (payload) {
                                    return payload.replace(
                                        new RegExp("\\(EncryptedUsing:" + config.secret + ":" + aspectConfig.componentSecret + "\\)", "g"),
                                        ""
                                    );
                                })
                            );
                        }
                    });
                }
            }
            Entity.prototype._entity = "07-InstanceAspects/profile";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
