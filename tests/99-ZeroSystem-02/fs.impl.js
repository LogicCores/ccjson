
exports.forLib = function (LIB) {
    var ccjson = this;

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

                self.AspectInstance = function (aspectConfig) {

                    var config = {};
                    LIB._.merge(config, defaultConfig)
                    LIB._.merge(config, instanceConfig)
                    LIB._.merge(config, aspectConfig)

                    return LIB.Promise.resolve({
                        path: function () {
                            return LIB.Promise.resolve(config.basePath);
                        }
                    });
                }
            }
            Entity.prototype._entity = "99-ZeroSystem-02/fs";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
