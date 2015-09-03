
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
            Entity.prototype._entity = "01-EntityImplementation/entity";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
