
exports.forLib = function (LIB) {

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
                    return LIB.Promise.resolve({
                        sign: function () {
                            return LIB.Promise.resolve("signed");
                        }
                    });
                }

            }
            Entity.prototype._entity = "11-InheritedEntityImplementation/entity";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
