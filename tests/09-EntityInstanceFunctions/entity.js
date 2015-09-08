
exports.forLib = function (LIB) {

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);

                self.spin = function () {
                    return config;
                }
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
