
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
            }
            Entity.prototype._entity = "05-MultipleEntityMappingsAndInstances/entity";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
