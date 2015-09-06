
exports.forLib = function (LIB) {

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;
                self.toString = function () {
                    return LIB._.merge(
                        self.__proto__,
                        {
                            config: instanceConfig
                        }
                    );
                }
            }
            Entity.prototype._entity = "07-InstanceAspects/profile";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
